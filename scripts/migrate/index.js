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
const only = process.argv.find(arg => arg.startsWith('--only='))?.split('=')[1] || '';

async function readJson(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        // Remove UTF-8 BOM if present
        const clean = content.replace(/^\uFEFF/, '');
        return JSON.parse(clean);
    } catch (e) {
        console.warn(`Could not read ${filePath}: ${e.message}`);
        return null;
    }
}

async function upsert(table, rows, options = {}) {
    if (!rows || rows.length === 0) {
        console.log(`  No rows for ${table}`);
        return;
    }
    if (dryRun) {
        console.log(`  [DRY RUN] Would upsert ${rows.length} rows into ${table}`);
        return;
    }
    const { onConflict, ignoreDuplicates } = options;
    const query = supabaseAdmin.from(table).upsert(rows, {
        onConflict,
        ignoreDuplicates: ignoreDuplicates || false
    });
    const { error } = await query;
    if (error) {
        throw new Error(`Error upserting ${table}: ${error.message}`);
    }
    console.log(`  Upserted ${rows.length} rows into ${table}`);
}

async function migrateSeasons() {
    const seasons = await readJson(path.join(ROOT, 'data', 'seasons.json'));
    if (!seasons) return;
    const rows = (seasons.seasons || seasons).map(s => ({
        id: typeof s === 'string' ? s : s.id,
        name: typeof s === 'string' ? s : (s.name || s.id),
        active: typeof s === 'string' ? (s === season) : (s.active || s.id === season)
    }));
    await upsert('seasons', rows, { onConflict: 'id' });
}

async function migrateCompetitions() {
    const seasons = await readJson(path.join(ROOT, 'data', 'seasons.json'));
    if (!seasons) return;
    const list = seasons.seasons || seasons;
    const rows = [];
    for (const s of list) {
        const seasonId = typeof s === 'string' ? s : s.id;
        const comps = s.competitions || [{ id: competition, label: mapCompetitionName(competition) }];
        for (const c of comps) {
            const compId = typeof c === 'string' ? c : c.id;
            const compLabel = typeof c === 'string' ? mapCompetitionName(c) : (c.label || mapCompetitionName(c.id));
            rows.push({
                id: `${seasonId}-${compId}`,
                season_id: seasonId,
                name: compLabel,
                country: compId === 'premier' ? 'England' : (compId === 'seriea' ? 'Italy' : (compId === 'champions' ? 'Europe' : 'Spain'))
            });
        }
    }
    await upsert('competitions', rows, { onConflict: 'id' });
}

function mapCompetitionName(slug) {
    const map = {
        liga: 'La Liga',
        premier: 'Premier League',
        champions: 'UEFA Champions League',
        seriea: 'Serie A'
    };
    return map[slug] || slug;
}

async function migrateTeams(competitionId) {
    const cal = await readJson(path.join(ROOT, 'data', season, competition, 'calendario.json'));
    const info = await readJson(path.join(ROOT, 'data', 'equipos-info.json')) || {};
    if (!cal || !cal.data) return;

    const teamMap = new Map();
    for (const match of cal.data) {
        [match.homeTeam, match.awayTeam].forEach(t => {
            if (!teamMap.has(t.id)) {
                const localInfo = info[t.name] || {};
                teamMap.set(t.id, {
                    name: t.name,
                    logo_url: t.logo,
                    stadium: localInfo.estadio || null,
                    capacity: localInfo.capacidad || null,
                    founded: localInfo.fundacion || null,
                    web: localInfo.web || null,
                    trophies: {
                        liga: localInfo.liga || 0,
                        copa: localInfo.copaRey || 0,
                        supercopa: localInfo.supercopa || 0,
                        champions: localInfo.champions || 0,
                        europaLeague: localInfo.europaLeague || 0,
                        recopa: localInfo.recopa || 0,
                        mundialClubes: localInfo.mundialClubes || 0
                    }
                });
            }
        });
    }

    // We use name as natural key since team IDs may vary across seasons
    const rows = Array.from(teamMap.values());
    await upsert('teams', rows, { onConflict: 'name' });

    // Return name -> DB id mapping
    const { data, error } = await supabaseAdmin.from('teams').select('id,name');
    if (error) throw error;
    return Object.fromEntries(data.map(t => [t.name, t.id]));
}

async function loadTeamMap(competitionId) {
    // Load existing teams from Supabase to map team names to IDs
    const { data, error } = await supabaseAdmin.from('teams').select('id,name');
    if (error) throw error;
    if (!data || data.length === 0) {
        throw new Error('No teams found in Supabase. Run full migration first.');
    }
    return Object.fromEntries(data.map(t => [t.name, t.id]));
}

async function runFullMigration(competitionId) {
    console.log('3. Migrating teams...');
    const teamMap = await migrateTeams(competitionId);

    console.log('4. Migrating players...');
    await migratePlayers(teamMap);

    console.log('5. Migrating referees...');
    await migrateReferees();

    console.log('6. Migrating matches...');
    await migrateMatches(competitionId, teamMap);

    console.log('7. Migrating videos...');
    await migrateVideos();

    console.log('8. Migrating news...');
    await migrateNews(teamMap);

    console.log('9. Migrating transfers...');
    await migrateTransfers(teamMap);
}

async function migratePlayers(teamMap) {
    const plantilla = await readJson(path.join(ROOT, 'data', season, competition, 'plantilla.json'));
    if (!plantilla) return;

    const rows = [];
    const seen = new Map();
    let fallbackId = 900000001;
    for (const [teamName, teamData] of Object.entries(plantilla)) {
        const teamId = teamMap[teamName];
        if (!teamId) {
            console.warn(`  Team not found for plantilla entry: ${teamName}`);
            continue;
        }
        for (const p of teamData.players || []) {
            let playerId = p.id;
            if (!playerId) {
                playerId = fallbackId++;
                console.warn(`  Generated local id ${playerId} for player ${p.name} (${teamName})`);
            }
            if (seen.has(playerId)) {
                console.warn(`  Skipping duplicate player id ${playerId}: ${p.name} (${teamName})`);
                continue;
            }
            seen.set(playerId, true);
            rows.push({
                id: playerId,
                team_id: teamId,
                name: p.name,
                position: p.position,
                shirt_number: p.shirtNumber || p.number,
                age: p.age,
                nationality: p.nationality,
                photo_url: p.photo,
                fotmob_id: p.fotMobId,
                stats: p.stats || {}
            });
        }
    }
    await upsert('players', rows, { onConflict: 'id' });
}

async function migrateReferees() {
    const arbitros = await readJson(path.join(ROOT, 'data', season, competition, 'arbitros.json'));
    if (!arbitros) return;
    const rows = arbitros.map(a => ({
        id: a.id,
        name: a.Nombre,
        college: a.Colegio,
        international: Boolean(a.Internacional),
        birth_date: a.FechaNacim,
        first_date: a.FechaPrimera,
        photo_url: a.Foto
    }));
    await upsert('referees', rows, { onConflict: 'id' });
}

async function migrateMatches(competitionId, teamMap) {
    const cal = await readJson(path.join(ROOT, 'data', season, competition, 'calendario.json'));
    if (!cal || !cal.data) return;

    const rows = cal.data.map(m => {
        const roundParts = m.round.split('-');
        const jornada = parseInt(roundParts[roundParts.length - 1].trim());
        const score = m.state?.score?.current;
        let homeScore = null;
        let awayScore = null;
        if (score && score.includes('-')) {
            const parts = score.split('-').map(s => parseInt(s.trim()));
            homeScore = parts[0];
            awayScore = parts[1];
        }
        return {
            id: m.id,
            competition_id: competitionId,
            round: m.round,
            jornada,
            date: m.date,
            home_team_id: teamMap[m.homeTeam.name] || null,
            away_team_id: teamMap[m.awayTeam.name] || null,
            home_score: homeScore,
            away_score: awayScore,
            status: m.status || m.state?.description,
            venue: m.venue?.name
        };
    });
    await upsert('matches', rows, { onConflict: 'id' });
}

async function migrateVideos() {
    const videos = await readJson(path.join(ROOT, 'data', season, competition, 'videos.json'));
    if (!videos) return;
    const cal = await readJson(path.join(ROOT, 'data', season, competition, 'calendario.json'));
    const matchByKey = new Map();
    if (cal && cal.data) {
        for (const m of cal.data) {
            const j = parseInt(m.round.split('-')[1].trim());
            const key = `LL-J${String(j).padStart(2, '0')}-${normalizeName(m.homeTeam.name)}-${normalizeName(m.awayTeam.name)}`;
            matchByKey.set(key, m.id);
        }
    }
    const rows = [];
    for (const [key, url] of Object.entries(videos)) {
        rows.push({
            match_id: matchByKey.get(key) || null,
            video_key: key,
            url
        });
    }
    await upsert('videos', rows, { onConflict: 'video_key' });
}

function normalizeName(name) {
    return name
        .replace(/\s+/g, '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '');
}

async function migrateNews(teamMap) {
    const newsDir = path.join(ROOT, 'data', season, competition, 'noticias');
    try {
        const files = await fs.readdir(newsDir);
        const rows = [];
        for (const file of files.filter(f => f.endsWith('.json'))) {
            const slug = file.replace('.json', '');
            const teamName = Object.keys(teamMap).find(n => slugify(n) === slug);
            const teamId = teamName ? teamMap[teamName] : null;
            const items = await readJson(path.join(newsDir, file));
            if (!Array.isArray(items)) continue;
            for (const item of items) {
                rows.push({
                    team_id: teamId,
                    title: item.titulo || item.title,
                    summary: item.resumen || item.summary,
                    url: item.url,
                    image_url: item.imagen || item.image,
                    source: item.fuente || item.source,
                    published_at: item.fecha || item.published_at
                });
            }
        }
        await upsert('news', rows, { onConflict: 'id', ignoreDuplicates: true });
    } catch (e) {
        console.warn(`  Could not migrate news: ${e.message}`);
    }
}

async function migrateTransfers(teamMap) {
    const transfers = await readJson(path.join(ROOT, 'data', 'fichajes.json'));
    if (!transfers) return;
    const rows = [];
    for (const [teamName, items] of Object.entries(transfers)) {
        const teamId = teamMap[teamName];
        if (!teamId) continue;
        for (const item of items) {
            rows.push({
                team_id: teamId,
                player_name: item.nombre || item.player_name,
                type: item.tipo || 'llegada',
                from_team: item.desde || item.from_team,
                to_team: item.hacia || item.to_team,
                date: item.fecha || item.date
            });
        }
    }
    await upsert('transfers', rows, { onConflict: 'id', ignoreDuplicates: true });
}

function slugify(name) {
    return name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
}

async function main() {
    try {
        validateConfig();
        console.log(`\nMigrating season=${season}, competition=${competition}`);
        if (dryRun) console.log('DRY RUN MODE - no changes will be made\n');

        const competitionId = `${season}-${competition}`;

        console.log('1. Migrating seasons...');
        await migrateSeasons();

        console.log('2. Migrating competitions...');
        await migrateCompetitions();

        if (only && only !== 'teams') {
            // When running a partial migration we still need the team map
            console.log('Loading team map...');
            const teamMap = await loadTeamMap(competitionId);
            if (only === 'news') {
                console.log('Migrating news...');
                await migrateNews(teamMap);
            } else if (only === 'transfers') {
                console.log('Migrating transfers...');
                await migrateTransfers(teamMap);
            } else if (only === 'videos') {
                console.log('Migrating videos...');
                await migrateVideos();
            } else {
                console.warn(`Unknown --only=${only}, running full migration.`);
                await runFullMigration(competitionId);
            }
        } else {
            await runFullMigration(competitionId);
        }

        console.log('\nMigration completed successfully.');
    } catch (error) {
        console.error('\nMigration failed:', error.message);
        process.exit(1);
    }
}

main();
