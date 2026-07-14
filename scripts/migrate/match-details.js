import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabaseAdmin } from '../../src/lib/supabase.js';
import { validateConfig, DEFAULT_SEASON, DEFAULT_COMPETITION } from '../../src/lib/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..', '..');

const dryRun = process.argv.includes('--dry-run');
const season = process.argv.find(arg => arg.startsWith('--season='))?.split('=')[1] || DEFAULT_SEASON;
const competition = process.argv.find(arg => arg.startsWith('--competition='))?.split('=')[1] || DEFAULT_COMPETITION;
const competitionId = `${season}-${competition}`;

async function readJson(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const clean = content.replace(/^\uFEFF/, '');
        return JSON.parse(clean);
    } catch (e) {
        console.warn(`Could not read ${filePath}: ${e.message}`);
        return null;
    }
}

async function loadMaps() {
    const [{ data: teams }, { data: referees }, { data: players }] = await Promise.all([
        supabaseAdmin.from('teams').select('id,name'),
        supabaseAdmin.from('referees').select('id,name'),
        supabaseAdmin.from('players').select('id,name')
    ]);
    return {
        teamByName: Object.fromEntries((teams || []).map(t => [t.name, t.id])),
        refereeByName: Object.fromEntries((referees || []).map(r => [r.name, r.id])),
        playerByName: Object.fromEntries((players || []).map(p => [p.name, p.id]))
    };
}

function normalizeName(name) {
    if (!name) return '';
    return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

async function migrateMatchDetails() {
    validateConfig();
    const maps = await loadMaps();

    const cal = await readJson(path.join(ROOT, 'data', season, competition, 'calendario.json'));
    if (!cal || !cal.data) throw new Error('Calendar not found');

    const matches = cal.data;
    console.log(`Migrating rich details for ${matches.length} matches...`);

    for (let i = 0; i < matches.length; i++) {
        const m = matches[i];
        const matchId = m.id;
        const filePath = path.join(ROOT, 'data', season, competition, 'partidos', `${matchId}.json`);
        const detail = await readJson(filePath);
        if (!detail) {
            console.warn(`  [${i + 1}/${matches.length}] Missing detail file for match ${matchId}`);
            continue;
        }

        // 1. Update matches with venue, referee, predictions
        const venue = detail.venue || null;
        const predictions = detail.predictions || null;
        let refereeId = null;
        if (detail.referee && detail.referee.name) {
            refereeId = maps.refereeByName[detail.referee.name] || null;
            if (!refereeId) {
                // Try to find by normalized name
                const norm = normalizeName(detail.referee.name);
                const found = Object.entries(maps.refereeByName).find(([name]) => normalizeName(name) === norm);
                if (found) refereeId = found[1];
            }
        }

        if (!dryRun) {
            const { error } = await supabaseAdmin.from('matches').update({ venue, predictions, referee_id: refereeId }).eq('id', matchId);
            if (error) {
                console.warn(`  [${i + 1}/${matches.length}] Error updating match ${matchId}: ${error.message}`);
                continue;
            }
        }

        // 2. Insert match events
        const events = (detail.events || []).map((e, idx) => ({
            match_id: matchId,
            time: e.time != null ? String(e.time) : null,
            type: e.type || 'Unknown',
            player: e.player || null,
            player_id: e.playerId && maps.playerByName[e.player] ? maps.playerByName[e.player] : null,
            substituted: e.substituted || null,
            substituted_id: null,
            assist: e.assist || null,
            team_id: e.team && e.team.name ? (maps.teamByName[e.team.name] || null) : null,
            description: null
        }));

        // 3. Insert match stats
        const stats = [];
        (detail.statistics || []).forEach(teamStats => {
            const teamName = teamStats.team && teamStats.team.name;
            const isHome = teamName === m.homeTeam.name;
            (teamStats.statistics || []).forEach(s => {
                const existing = stats.find(x => x.category === s.displayName);
                if (existing) {
                    if (isHome) existing.value_home = String(s.value);
                    else existing.value_away = String(s.value);
                } else {
                    stats.push({
                        match_id: matchId,
                        category: s.displayName,
                        value_home: isHome ? String(s.value) : null,
                        value_away: isHome ? null : String(s.value)
                    });
                }
            });
        });

        // 4. Insert lineups
        const lineupRows = [];
        ['homeTeam', 'awayTeam'].forEach(key => {
            const teamData = detail.lineups && detail.lineups[key];
            if (!teamData) return;
            const teamId = maps.teamByName[teamData.name] || null;
            lineupRows.push({
                match_id: matchId,
                team_id: teamId,
                data: teamData
            });
        });

        // 5. Insert boxscores
        const boxscoreRows = [];
        const boxData = detail.boxScore && detail.boxScore.value ? detail.boxScore.value : detail.boxScore;
        (boxData || []).forEach(teamBox => {
            const teamId = teamBox.team && teamBox.team.name ? (maps.teamByName[teamBox.team.name] || null) : null;
            (teamBox.players || []).forEach(p => {
                boxscoreRows.push({
                    match_id: matchId,
                    player_id: p.id && maps.playerByName[p.name] ? maps.playerByName[p.name] : null,
                    team_id: teamId,
                    data: p
                });
            });
        });

        if (!dryRun) {
            // Delete existing data first to avoid duplicates
            await supabaseAdmin.from('match_events').delete().eq('match_id', matchId);
            await supabaseAdmin.from('match_stats').delete().eq('match_id', matchId);
            await supabaseAdmin.from('lineups').delete().eq('match_id', matchId);
            await supabaseAdmin.from('boxscores').delete().eq('match_id', matchId);

            if (events.length) {
                const { error } = await supabaseAdmin.from('match_events').insert(events);
                if (error) console.warn(`  Match ${matchId} events error: ${error.message}`);
            }
            if (stats.length) {
                const { error } = await supabaseAdmin.from('match_stats').insert(stats);
                if (error) console.warn(`  Match ${matchId} stats error: ${error.message}`);
            }
            if (lineupRows.length) {
                const { error } = await supabaseAdmin.from('lineups').insert(lineupRows);
                if (error) console.warn(`  Match ${matchId} lineups error: ${error.message}`);
            }
            if (boxscoreRows.length) {
                const { error } = await supabaseAdmin.from('boxscores').insert(boxscoreRows);
                if (error) console.warn(`  Match ${matchId} boxscores error: ${error.message}`);
            }
        }

        console.log(`  [${i + 1}/${matches.length}] Match ${matchId} migrated (${events.length} events, ${stats.length} stats, ${lineupRows.length} lineups, ${boxscoreRows.length} boxscores)`);
    }

    console.log('\nMatch detail migration completed.');
}

migrateMatchDetails().catch(err => {
    console.error('Migration failed:', err.message);
    process.exit(1);
});
