// Supabase API helpers for STPLS frontend
// Provides functions that mirror the old JSON file structure

(function() {
    'use strict';

    var sb = window.STPLS_SUPABASE;

    function getState() {
        return window.APP ? window.APP.getState() : { season: '2026-27', competition: 'liga' };
    }

    function getCompetitionId() {
        var state = getState();
        return state.season + '-' + state.competition;
    }

    async function fetchTeams() {
        if (!sb) return null;
        var { data, error } = await sb.from('teams').select('*').order('name');
        if (error) throw error;
        return data;
    }

    function enrichMatch(m) {
        if (!m) return m;
        // Provide a synthetic state object similar to the old JSON format
        var finished = m.home_score != null && m.away_score != null;
        m.state = {
            description: finished ? 'Finished' : 'Scheduled',
            score: finished ? { current: m.home_score + ' - ' + m.away_score } : null
        };
        // Provide homeTeam/awayTeam aliases expected by some pages
        m.homeTeam = m.home_team || { name: '', logo: '' };
        m.awayTeam = m.away_team || { name: '', logo: '' };
        m.homeTeam.logo = m.homeTeam.logo || m.homeTeam.logo_url;
        m.awayTeam.logo = m.awayTeam.logo || m.awayTeam.logo_url;
        return m;
    }

    async function fetchMatches(options) {
        if (!sb) return null;
        var compId = getCompetitionId();
        var fields = '*, home_team:home_team_id(*), away_team:away_team_id(*)';
        if (options && options.referee) {
            fields += ', referee:referee_id(*)';
        }
        var query = sb.from('matches')
            .select(fields)
            .eq('competition_id', compId);
        if (options && options.jornada) {
            query = query.eq('jornada', options.jornada);
        }
        if (options && options.team) {
            query = query.or('home_team_id.eq.' + options.team + ',away_team_id.eq.' + options.team);
        }
        var { data, error } = await query.order('date');
        if (error) throw error;
        return (data || []).map(enrichMatch);
    }

    async function fetchMatchesWithReferee(teamId) {
        return fetchMatches({ team: teamId, referee: true });
    }

    async function fetchPlayers(options) {
        if (!sb) return null;
        var query = sb.from('players').select('*, team:team_id(*)');
        if (options && options.team_id) {
            query = query.eq('team_id', options.team_id);
        }
        var { data, error } = await query.order('name');
        if (error) throw error;
        return data;
    }

    async function fetchPlayerStats() {
        if (!sb) return null;
        var compId = getCompetitionId();
        // For now return players with stats; later we can add a dedicated view
        var { data, error } = await sb.from('players')
            .select('*, team:team_id(name,logo_url)')
            .not('stats', 'is', null)
            .order('name');
        if (error) throw error;
        return data;
    }

    async function fetchTeamStats() {
        if (!sb) return null;
        var compId = getCompetitionId();
        var { data: matches, error } = await sb.from('matches')
            .select('*, home_team:home_team_id(*), away_team:away_team_id(*)')
            .eq('competition_id', compId);
        if (error) throw error;
        return computeTeamStats(matches);
    }

    function computeTeamStats(matches) {
        var stats = {};
        matches.forEach(function(m) {
            if (!m.home_team || !m.away_team) return;
            [m.home_team, m.away_team].forEach(function(t) {
                if (!stats[t.name]) {
                    stats[t.name] = {
                        name: t.name,
                        logo_url: t.logo_url,
                        pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, puntos: 0
                    };
                }
            });
            if (m.home_score == null || m.away_score == null) return;
            var home = stats[m.home_team.name];
            var away = stats[m.away_team.name];
            home.gf += m.home_score; home.gc += m.away_score;
            away.gf += m.away_score; away.gc += m.home_score;
            home.pj++; away.pj++;
            if (m.home_score > m.away_score) { home.pg++; away.pp++; home.puntos += 3; }
            else if (m.home_score < m.away_score) { away.pg++; home.pp++; away.puntos += 3; }
            else { home.pe++; away.pe++; home.puntos++; away.puntos++; }
        });
        return Object.values(stats).sort(function(a, b) {
            if (b.puntos !== a.puntos) return b.puntos - a.puntos;
            return (b.gf - b.gc) - (a.gf - a.gc);
        });
    }

    async function fetchNews(teamId) {
        if (!sb) return null;
        var query = sb.from('news').select('*');
        if (teamId) query = query.eq('team_id', teamId);
        var { data, error } = await query.order('published_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async function fetchTransfers(teamId) {
        if (!sb) return null;
        var query = sb.from('transfers').select('*');
        if (teamId) query = query.eq('team_id', teamId);
        var { data, error } = await query.order('date', { ascending: false });
        if (error) throw error;
        return data;
    }

    async function fetchReferees() {
        if (!sb) return null;
        var { data, error } = await sb.from('referees').select('*').order('name');
        if (error) throw error;
        return data;
    }

    async function fetchTeamInfo(teamName) {
        if (!sb) return null;
        var { data, error } = await sb.from('teams')
            .select('id,name,logo_url,stadium,capacity,founded,web,trophies')
            .eq('name', teamName)
            .single();
        if (error) throw error;
        if (!data) return null;
        var t = data.trophies || {};
        return {
            id: data.id,
            name: data.name,
            logo: data.logo_url,
            estadio: data.stadium || '',
            capacidad: data.capacity || '',
            fundacion: data.founded || '',
            web: data.web || '',
            liga: t.liga || 0,
            copaRey: t.copa || 0,
            supercopa: t.supercopa || 0,
            champions: t.champions || 0,
            europaLeague: t.europaLeague || 0,
            recopa: t.recopa || 0,
            mundialClubes: t.mundialClubes || 0
        };
    }

    async function countTeamDetailedMatches(teamId) {
        if (!sb) return 0;
        var compId = getCompetitionId();
        var { data: matches, error } = await sb.from('matches')
            .select('id')
            .eq('competition_id', compId)
            .or('home_team_id.eq.' + teamId + ',away_team_id.eq.' + teamId);
        if (error) throw error;
        if (!matches || matches.length === 0) return 0;
        var ids = matches.map(function(m) { return m.id; });
        var { data: lineups } = await sb.from('lineups').select('match_id').in('match_id', ids);
        var { data: boxscores } = await sb.from('boxscores').select('match_id').in('match_id', ids);
        var withLineups = new Set((lineups || []).map(function(l) { return l.match_id; }));
        var withBox = new Set((boxscores || []).map(function(b) { return b.match_id; }));
        var count = 0;
        ids.forEach(function(id) { if (withLineups.has(id) && withBox.has(id)) count++; });
        return count;
    }

    async function fetchVideos() {
        if (!sb) return null;
        var compId = getCompetitionId();
        var { data: matches, error } = await sb.from('matches')
            .select('id, videos: videos(video_key, url)')
            .eq('competition_id', compId);
        if (error) throw error;
        var map = {};
        matches.forEach(function(m) {
            if (m.videos) {
                m.videos.forEach(function(v) { map[v.video_key] = v.url; });
            }
        });
        return map;
    }

    async function fetchAllMatchesWithEvents() {
        if (!sb) return null;
        var compId = getCompetitionId();
        var { data, error } = await sb.from('matches')
            .select('*, home_team:home_team_id(*), away_team:away_team_id(*), referee:referee_id(*), events:match_events(*)')
            .eq('competition_id', compId)
            .order('date');
        if (error) throw error;
        return (data || []).map(function(m) {
            var enriched = enrichMatch(m);
            var homeTeam = m.home_team || {};
            var awayTeam = m.away_team || {};
            enriched.events = (m.events || []).map(function(e) {
                var team = e.team_id === homeTeam.id ? homeTeam : (e.team_id === awayTeam.id ? awayTeam : null);
                return {
                    team: team ? { id: team.id, name: team.name, logo: team.logo_url } : null,
                    time: e.time,
                    type: e.type,
                    player: e.player,
                    playerId: e.player_id,
                    substituted: e.substituted,
                    substitutedId: e.substituted_id,
                    assist: e.assist
                };
            });
            enriched.referee = m.referee ? { name: m.referee.name, nationality: m.referee.nationality || '' } : null;
            return enriched;
        });
    }

    async function fetchMatchDetail(matchId) {
        if (!sb) return null;
        var { data, error } = await sb.from('matches')
            .select('*, home_team:home_team_id(*), away_team:away_team_id(*)')
            .eq('id', matchId)
            .single();
        if (error) throw error;
        return enrichMatch(data);
    }

    async function fetchMatchEvents(matchId) {
        if (!sb) return null;
        var { data, error } = await sb.from('match_events')
            .select('*')
            .eq('match_id', matchId)
            .order('time')
            .order('id');
        if (error) throw error;
        return data || [];
    }

    async function fetchMatchStats(matchId) {
        if (!sb) return null;
        var { data, error } = await sb.from('match_stats')
            .select('*')
            .eq('match_id', matchId);
        if (error) throw error;
        return data || [];
    }

    async function fetchLineups(matchId) {
        if (!sb) return null;
        var { data, error } = await sb.from('lineups')
            .select('*')
            .eq('match_id', matchId);
        if (error) throw error;
        return data || [];
    }

    async function fetchBoxscore(matchId) {
        if (!sb) return null;
        var { data, error } = await sb.from('boxscores')
            .select('*')
            .eq('match_id', matchId);
        if (error) throw error;
        return data || [];
    }

    async function fetchBestXIData() {
        if (!sb) return null;
        var compId = getCompetitionId();

        var { data: matches, error: mErr } = await sb.from('matches')
            .select('*, home_team:home_team_id(*), away_team:away_team_id(*)')
            .eq('competition_id', compId);
        if (mErr) throw mErr;

        var { data: boxscores, error: bErr } = await sb.from('boxscores')
            .select('*, team:team_id(*), player:player_id(*)')
            .eq('match.competition_id', compId);
        if (bErr) throw bErr;

        var playersMap = {};
        (boxscores || []).forEach(function(b) {
            if (b.player && b.player.id) {
                playersMap[b.player.id] = {
                    position: b.player.position,
                    fotMobId: b.player.fotmob_id
                };
            }
        });

        var byMatch = {};
        (boxscores || []).forEach(function(b) {
            if (!byMatch[b.match_id]) byMatch[b.match_id] = {};
            if (!byMatch[b.match_id][b.team_id]) {
                byMatch[b.match_id][b.team_id] = { team: b.team, players: [] };
            }
            var p = Object.assign({}, b.data || {});
            if (b.player && b.player.position) p.position = b.player.position;
            if (b.player && b.player.fotmob_id) p.fotMobId = b.player.fotmob_id;
            byMatch[b.match_id][b.team_id].players.push(p);
        });

        var partidos = (matches || []).map(function(m) {
            var teams = byMatch[m.id] || {};
            var homeBox = teams[m.home_team.id];
            var awayBox = teams[m.away_team.id];
            var boxes = [];
            if (homeBox) {
                boxes.push({
                    team: { name: homeBox.team.name, logo: homeBox.team.logo_url },
                    players: homeBox.players
                });
            }
            if (awayBox) {
                boxes.push({
                    team: { name: awayBox.team.name, logo: awayBox.team.logo_url },
                    players: awayBox.players
                });
            }
            return {
                id: m.id,
                round: m.round,
                date: m.date,
                homeTeam: { name: m.home_team.name, logo: m.home_team.logo_url },
                awayTeam: { name: m.away_team.name, logo: m.away_team.logo_url },
                state: { score: m.home_score != null ? { current: m.home_score + ' - ' + m.away_score } : null },
                boxScore: { value: boxes }
            };
        }).filter(function(p) { return p.boxScore.value.length > 0; });

        return {
            matches: matches || [],
            partidos: partidos,
            playersMap: playersMap
        };
    }

    // Return full match detail in the original JSON shape
    async function fetchMatchFullDetail(matchId) {
        if (!sb) return null;
        var { data: match, error: mErr } = await sb.from('matches')
            .select('*, home_team:home_team_id(*), away_team:away_team_id(*), referee:referee_id(*)')
            .eq('id', matchId)
            .single();
        if (mErr) throw mErr;

        var { data: events } = await sb.from('match_events').select('*').eq('match_id', matchId).order('time').order('id');
        var { data: stats } = await sb.from('match_stats').select('*').eq('match_id', matchId);
        var { data: lineups } = await sb.from('lineups').select('*, team:team_id(*)').eq('match_id', matchId);
        var { data: boxscores } = await sb.from('boxscores').select('*, team:team_id(*)').eq('match_id', matchId);

        var homeTeam = match.home_team || {};
        var awayTeam = match.away_team || {};

        // Events
        var formattedEvents = (events || []).map(function(e) {
            var team = e.team_id === homeTeam.id ? homeTeam : (e.team_id === awayTeam.id ? awayTeam : null);
            return {
                team: team ? { id: team.id, name: team.name, logo: team.logo_url } : null,
                time: e.time,
                type: e.type,
                player: e.player,
                playerId: e.player_id,
                substituted: e.substituted,
                substitutedId: e.substituted_id,
                assist: e.assist
            };
        });

        // Statistics
        var homeStats = [], awayStats = [];
        (stats || []).forEach(function(s) {
            homeStats.push({ displayName: s.category, value: s.value_home });
            awayStats.push({ displayName: s.category, value: s.value_away });
        });
        var formattedStatistics = [
            { team: { id: homeTeam.id, name: homeTeam.name, logo: homeTeam.logo_url }, statistics: homeStats },
            { team: { id: awayTeam.id, name: awayTeam.name, logo: awayTeam.logo_url }, statistics: awayStats }
        ];

        // Lineups
        var formattedLineups = { homeTeam: null, awayTeam: null };
        (lineups || []).forEach(function(l) {
            var isHome = l.team_id === homeTeam.id;
            var key = isHome ? 'homeTeam' : 'awayTeam';
            var team = isHome ? homeTeam : awayTeam;
            formattedLineups[key] = Object.assign({}, l.data, {
                id: team.id,
                name: team.name,
                logo: team.logo_url
            });
        });

        // Boxscore
        var homeBox = { team: { id: homeTeam.id, name: homeTeam.name, logo: homeTeam.logo_url }, players: [] };
        var awayBox = { team: { id: awayTeam.id, name: awayTeam.name, logo: awayTeam.logo_url }, players: [] };
        (boxscores || []).forEach(function(b) {
            var isHome = b.team_id === homeTeam.id;
            (isHome ? homeBox : awayBox).players.push(b.data);
        });
        var formattedBoxScore = { value: [homeBox, awayBox] };

        function enrichTeam(t) {
            if (!t) return t;
            t.logo = t.logo || t.logo_url;
            return t;
        }

        return {
            id: match.id,
            homeTeam: enrichTeam(homeTeam),
            awayTeam: enrichTeam(awayTeam),
            date: match.date,
            round: match.round,
            state: { description: match.home_score != null ? 'Finished' : 'Scheduled', score: match.home_score != null ? { current: match.home_score + ' - ' + match.away_score } : null },
            venue: match.venue,
            referee: match.referee ? { name: match.referee.name, nationality: match.referee.nationality || '' } : null,
            events: formattedEvents,
            statistics: formattedStatistics,
            lineups: formattedLineups,
            boxScore: formattedBoxScore,
            predictions: match.predictions
        };
    }

    async function fetchPlayerSeasonStats() {
        if (!sb) return null;
        var compId = getCompetitionId();
        var { data, error } = await sb.from('player_season_stats')
            .select('*, player:player_id(*), team:team_id(*)')
            .eq('competition_id', compId);
        if (error) throw error;
        if (!data || data.length === 0) return null;

        var output = { meta: { jornadasDescargadas: 0, totalJornadas: 0, minPartidos: 1 } };
        var sections = ['valoracion','goleadores','asistencias','pases','cortes','penales','titulares','sustituidos','suplentes','minuteros','porteros','ceroPorterias','paradas','penParadas','faltas','amarillas','rojas'];
        sections.forEach(function(sec) { output[sec] = []; output[sec + '15'] = []; });

        data.forEach(function(row) {
            var s = row.stats || {};
            var player = {
                id: row.player_id,
                name: s.name || (row.player ? row.player.name : ''),
                team: s.team || (row.team ? row.team.name : ''),
                position: s.position || (row.player ? row.player.position : ''),
                fotMobId: s.fotMobId || (row.player ? row.player.fotmob_id : null),
                avgRating: parseFloat(s.avgRating) || 0,
                goals: parseInt(s.goals) || 0,
                assists: parseInt(s.assists) || 0,
                passes: parseInt(s.passes) || 0,
                tackles: parseInt(s.tackles) || 0,
                penScored: parseInt(s.penScored) || 0,
                penTotal: parseInt(s.penTotal) || 0,
                starts: parseInt(s.starts) || 0,
                subbedOff: parseInt(s.subbedOff) || 0,
                subbedOn: parseInt(s.subbedOn) || 0,
                minutes: parseInt(s.minutes) || 0,
                goalsConceded: parseInt(s.goalsConceded) || 0,
                cleanSheets: parseInt(s.cleanSheets) || 0,
                saves: parseInt(s.saves) || 0,
                penSaved: parseInt(s.penSaved) || 0,
                penFaced: parseInt(s.penFaced) || 0,
                fouls: parseInt(s.fouls) || 0,
                yellowCards: parseInt(s.yellowCards) || 0,
                redCards: parseInt(s.redCards) || 0,
                appearances: parseInt(s.appearances) || 0
            };
            var sec = s.section;
            if (output[sec]) {
                output[sec].push(player);
                if (output[sec].length <= 15) output[sec + '15'].push(player);
            }
        });

        return output;
    }

    async function fetchTeamSeasonStats() {
        if (!sb) return null;
        var compId = getCompetitionId();
        var { data, error } = await sb.from('team_season_stats')
            .select('*, team:team_id(*)')
            .eq('competition_id', compId);
        if (error) throw error;
        if (!data || data.length === 0) return null;

        var output = { meta: { jornadasDescargadas: 0, totalJornadas: 0 } };
        var teams = data.map(function(row) {
            var s = row.stats || {};
            return {
                name: s.name || (row.team ? row.team.name : ''),
                logo: s.teamLogo || (row.team ? row.team.logo_url : ''),
                played: parseInt(s.played) || 0,
                won: parseInt(s.won) || 0,
                drawn: parseInt(s.drawn) || 0,
                lost: parseInt(s.lost) || 0,
                gf: parseInt(s.gf) || 0,
                gc: parseInt(s.gc) || 0,
                puntos: parseInt(s.puntos) || 0,
                avgPossession: parseFloat(s.avgPossession) || 0,
                cleanSheets: parseInt(s.cleanSheets) || 0
            };
        });
        output.valoracion = teams.slice().sort(function(a, b) { return b.avgPossession - a.avgPossession; });
        output.porteriasCero = teams.slice().sort(function(a, b) { return b.cleanSheets - a.cleanSheets; });
        output.posesion = output.valoracion;
        return output;
    }

    window.STPLS_API = {
        fetchTeams: fetchTeams,
        fetchMatches: fetchMatches,
        fetchMatchesWithReferee: fetchMatchesWithReferee,
        fetchPlayers: fetchPlayers,
        fetchPlayerStats: fetchPlayerStats,
        fetchTeamStats: fetchTeamStats,
        fetchNews: fetchNews,
        fetchTransfers: fetchTransfers,
        fetchReferees: fetchReferees,
        fetchTeamInfo: fetchTeamInfo,
        fetchVideos: fetchVideos,
        fetchMatchDetail: fetchMatchDetail,
        fetchMatchFullDetail: fetchMatchFullDetail,
        fetchAllMatchesWithEvents: fetchAllMatchesWithEvents,
        countTeamDetailedMatches: countTeamDetailedMatches,
        fetchMatchEvents: fetchMatchEvents,
        fetchMatchStats: fetchMatchStats,
        fetchLineups: fetchLineups,
        fetchBoxscore: fetchBoxscore,
        fetchBestXIData: fetchBestXIData,
        fetchPlayerSeasonStats: fetchPlayerSeasonStats,
        fetchTeamSeasonStats: fetchTeamSeasonStats
    };
})();
