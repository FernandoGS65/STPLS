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
        var query = sb.from('matches')
            .select('*, home_team:home_team_id(*), away_team:away_team_id(*)')
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

    window.STPLS_API = {
        fetchTeams: fetchTeams,
        fetchMatches: fetchMatches,
        fetchPlayers: fetchPlayers,
        fetchPlayerStats: fetchPlayerStats,
        fetchTeamStats: fetchTeamStats,
        fetchNews: fetchNews,
        fetchTransfers: fetchTransfers,
        fetchReferees: fetchReferees,
        fetchVideos: fetchVideos,
        fetchMatchDetail: fetchMatchDetail,
        fetchMatchEvents: fetchMatchEvents,
        fetchMatchStats: fetchMatchStats,
        fetchLineups: fetchLineups,
        fetchBoxscore: fetchBoxscore
    };
})();
