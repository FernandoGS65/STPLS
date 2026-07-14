import { supabaseAdmin } from '../src/lib/supabase.js';
import { validateConfig, DEFAULT_SEASON, DEFAULT_COMPETITION } from '../src/lib/config.js';

const dryRun = process.argv.includes('--dry-run');
const season = process.argv.find(arg => arg.startsWith('--season='))?.split('=')[1] || DEFAULT_SEASON;
const competition = process.argv.find(arg => arg.startsWith('--competition='))?.split('=')[1] || DEFAULT_COMPETITION;
const competitionId = `${season}-${competition}`;

function safeInt(v) {
    const n = parseInt(v);
    return isNaN(n) ? 0 : n;
}

function safeFloat(v) {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
}

async function loadPlayersMap() {
    const { data, error } = await supabaseAdmin.from('players').select('id, name, team_id, team:team_id(name, logo_url), position, fotmob_id');
    if (error) throw error;
    return Object.fromEntries((data || []).map(p => [p.id, p]));
}

async function loadMatches() {
    const { data, error } = await supabaseAdmin.from('matches')
        .select('id, home_team:home_team_id(name), away_team:away_team_id(name)')
        .eq('competition_id', competitionId);
    if (error) throw error;
    return data || [];
}

async function loadBoxscores() {
    const { data, error } = await supabaseAdmin.from('boxscores')
        .select('*, match:match_id(id), player:player_id(id,name,team_id,position,fotmob_id)')
        .eq('match.competition_id', competitionId);
    if (error) throw error;
    return data || [];
}

function aggregatePlayerStats(boxscores, playersMap) {
    const agg = {};

    boxscores.forEach(b => {
        const playerId = b.player_id;
        if (!playerId) return;
        const player = playersMap[playerId];
        if (!player) return;

        const d = b.data || {};
        const stats = d.statistics || {};
        const minutes = safeInt(d.minutesPlayed);
        const isKeeper = d.position === 'Goalkeeper';

        if (!agg[playerId]) {
            agg[playerId] = {
                id: playerId,
                name: player.name,
                team: player.team ? player.team.name : '',
                teamLogo: player.team ? player.team.logo_url : '',
                position: d.position || player.position || '',
                fotMobId: player.fotmob_id || d.fotMobId || null,
                appearances: 0,
                starts: 0,
                subbedOn: 0,
                subbedOff: 0,
                minutes: 0,
                goals: 0,
                assists: 0,
                passes: 0,
                tackles: 0,
                fouls: 0,
                yellowCards: 0,
                redCards: 0,
                penScored: 0,
                penTotal: 0,
                penSaved: 0,
                penFaced: 0,
                goalsConceded: 0,
                cleanSheets: 0,
                saves: 0,
                avgRatingSum: 0,
                avgRatingCount: 0
            };
        }

        const a = agg[playerId];
        a.appearances++;
        if (!d.isSubstitute) a.starts++;
        else a.subbedOn++;
        a.minutes += minutes;
        a.goals += safeInt(stats.goalsScored);
        a.assists += safeInt(stats.assists);
        a.passes += safeInt(stats.passesSuccessful);
        a.tackles += safeInt(stats.tacklesTotal);
        a.fouls += safeInt(stats.fouledOthers);
        a.yellowCards += safeInt(stats.cardsYellow);
        a.redCards += safeInt(stats.cardsRed) + safeInt(stats.cardsSecondYellow);
        a.penScored += safeInt(stats.penaltiesScored);
        a.penTotal += safeInt(stats.penaltiesTotal);
        a.penSaved += safeInt(stats.penaltiesSaved || stats.penaltiesScoredAgainst);
        a.penFaced += safeInt(stats.penaltiesFaced);
        a.saves += safeInt(stats.goalsSaved);

        if (isKeeper) {
            const gc = safeInt(stats.goalsConceded);
            a.goalsConceded += gc;
            if (minutes > 0 && gc === 0) a.cleanSheets++;
        }

        if (d.matchRating) {
            a.avgRatingSum += safeFloat(d.matchRating);
            a.avgRatingCount++;
        }
    });

    // Compute average rating
    Object.values(agg).forEach(a => {
        a.avgRating = a.avgRatingCount > 0 ? (a.avgRatingSum / a.avgRatingCount).toFixed(2) : 0;
        delete a.avgRatingSum;
        delete a.avgRatingCount;
    });

    return Object.values(agg);
}

async function aggregateTeamStats(matches) {
    const stats = {};
    matches.forEach(m => {
        if (!m.home_team || !m.away_team) return;
        [m.home_team, m.away_team].forEach(t => {
            if (!stats[t.name]) {
                stats[t.name] = {
                    name: t.name,
                    pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, puntos: 0,
                    avgPossession: 0, possessionCount: 0,
                    cleanSheets: 0
                };
            }
        });
        if (m.home_score == null || m.away_score == null) return;
        const home = stats[m.home_team.name];
        const away = stats[m.away_team.name];
        home.gf += m.home_score; home.gc += m.away_score;
        away.gf += m.away_score; away.gc += m.home_score;
        home.pj++; away.pj++;
        if (m.home_score > m.away_score) { home.pg++; away.pp++; home.puntos += 3; }
        else if (m.home_score < m.away_score) { away.pg++; home.pp++; away.puntos += 3; }
        else { home.pe++; away.pe++; home.puntos++; away.puntos++; }
        if (m.away_score === 0) home.cleanSheets++;
        if (m.home_score === 0) away.cleanSheets++;
    });

    // Load possession from match_stats
    const { data: possessionStats } = await supabaseAdmin.from('match_stats')
        .select('match_id, value_home, value_away')
        .eq('category', 'Possession')
        .in('match_id', matches.map(m => m.id));

    if (possessionStats) {
        possessionStats.forEach(ps => {
            const m = matches.find(x => x.id === ps.match_id);
            if (!m) return;
            const home = stats[m.home_team.name];
            const away = stats[m.away_team.name];
            const hv = safeFloat(ps.value_home);
            const av = safeFloat(ps.value_away);
            if (home && hv > 0) { home.avgPossession += hv; home.possessionCount++; }
            if (away && av > 0) { away.avgPossession += av; away.possessionCount++; }
        });
    }

    return Object.values(stats).map(t => ({
        name: t.name,
        logo: '',
        played: t.pj,
        won: t.pg,
        drawn: t.pe,
        lost: t.pp,
        gf: t.gf,
        gc: t.gc,
        puntos: t.puntos,
        avgPossession: t.possessionCount > 0 ? t.avgPossession / t.possessionCount : 0,
        cleanSheets: t.cleanSheets
    })).sort((a, b) => b.puntos - a.puntos || (b.gf - b.gc) - (a.gf - a.gc));
}

function buildPlayerOutput(players) {
    const by = (key, desc = true) => {
        return players.slice().sort((a, b) => {
            const va = safeFloat(a[key]);
            const vb = safeFloat(b[key]);
            return desc ? vb - va : va - vb;
        });
    };

    const out = {
        valoracion: by('avgRating'),
        goleadores: by('goals'),
        asistencias: by('assists'),
        pases: by('passes'),
        cortes: by('tackles'),
        penales: by('penScored'),
        titulares: by('starts'),
        sustituidos: by('subbedOff'),
        suplentes: by('subbedOn'),
        minuteros: by('minutes'),
        porteros: by('goalsConceded', false),
        ceroPorterias: by('cleanSheets'),
        paradas: by('saves'),
        penParadas: by('penSaved'),
        faltas: by('fouls'),
        amarillas: by('yellowCards'),
        rojas: by('redCards'),
        meta: { jornadasDescargadas: 0, totalJornadas: 0, minPartidos: 1 }
    };

    // Add top 15 versions for detail view
    Object.keys(out).forEach(k => {
        if (k === 'meta') return;
        out[k + '15'] = out[k].slice(0, 15);
    });

    return out;
}

function buildTeamOutput(teams) {
    return {
        valoracion: teams.slice().sort((a, b) => b.avgPossession - a.avgPossession),
        porteriasCero: teams.slice().sort((a, b) => b.cleanSheets - a.cleanSheets),
        posesion: teams.slice().sort((a, b) => b.avgPossession - a.avgPossession),
        meta: { jornadasDescargadas: 0, totalJornadas: 0 }
    };
}

async function saveStats(playerStats, teamStats, playersMap) {
    // Delete existing
    await supabaseAdmin.from('player_season_stats').delete().eq('competition_id', competitionId);
    await supabaseAdmin.from('team_season_stats').delete().eq('competition_id', competitionId);

    const playerRows = Object.entries(playerStats).filter(([k]) => k !== 'meta').flatMap(([section, players]) => {
        return (players || []).map((p, idx) => ({
            player_id: p.id,
            competition_id: competitionId,
            team_id: playersMap[p.id] ? playersMap[p.id].team_id : null,
            stats: { ...p, section, position: idx + 1 }
        }));
    });

    // Deduplicate by player_id (keep first occurrence)
    const playerRowsDedup = [];
    const seen = new Set();
    for (const row of playerRows) {
        if (!seen.has(row.player_id)) {
            seen.add(row.player_id);
            playerRowsDedup.push({
                player_id: row.player_id,
                competition_id: row.competition_id,
                team_id: row.team_id || null,
                stats: row.stats
            });
        }
    }

    const teamRows = (teamStats.valoracion || []).map((t, idx) => ({
        team_id: null,
        competition_id: competitionId,
        stats: { ...t, position: idx + 1 }
    }));

    if (playerRowsDedup.length) {
        const { error } = await supabaseAdmin.from('player_season_stats').insert(playerRowsDedup);
        if (error) throw new Error(`Error saving player stats: ${error.message}`);
    }
    if (teamRows.length) {
        const { error } = await supabaseAdmin.from('team_season_stats').insert(teamRows);
        if (error) throw new Error(`Error saving team stats: ${error.message}`);
    }
}

async function main() {
    validateConfig();
    console.log(`Generating stats for ${competitionId}...`);

    const playersMap = await loadPlayersMap();
    const matches = await loadMatches();
    const boxscores = await loadBoxscores();

    const aggPlayers = aggregatePlayerStats(boxscores, playersMap);
    const playerOutput = buildPlayerOutput(aggPlayers);
    const teamOutput = buildTeamOutput(await aggregateTeamStats(matches));

    if (dryRun) {
        console.log(`[DRY RUN] Would save ${aggPlayers.length} player stats and ${teamOutput.valoracion.length} team stats`);
        return;
    }

    await saveStats(playerOutput, teamOutput, playersMap);
    console.log(`Saved ${aggPlayers.length} player stats and ${teamOutput.valoracion.length} team stats.`);
}

main().catch(err => {
    console.error('Stats generation failed:', err.message);
    process.exit(1);
});
