(function() {
    'use strict';

    var sb = window.STPLS_SUPABASE;
    if (!sb) {
        document.body.innerHTML = '<p style="padding:2rem;text-align:center">Supabase no está configurado.</p>';
        return;
    }

    var currentUser = null;

    var loginBox = document.getElementById('admin-login');
    var panelBox = document.getElementById('admin-panel');
    var loginForm = document.getElementById('login-form');
    var loginMsg = document.getElementById('login-msg');
    var logoutBtn = document.getElementById('logout-btn');
    var adminEmail = document.getElementById('admin-email');

    var newsForm = document.getElementById('news-form');
    var newsMsg = document.getElementById('news-msg');
    var newsTeam = document.getElementById('news-team');
    var newsList = document.getElementById('news-list');

    var videoForm = document.getElementById('video-form');
    var videoMsg = document.getElementById('video-msg');
    var videoMatch = document.getElementById('video-match');

    // Tab navigation
    document.querySelectorAll('.admin-nav button').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.admin-nav button').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            var tab = btn.dataset.tab;
            document.getElementById('tab-news').classList.toggle('admin-hidden', tab !== 'news');
            document.getElementById('tab-videos').classList.toggle('admin-hidden', tab !== 'videos');
        });
    });

    function showMsg(el, text, isError) {
        el.textContent = text;
        el.className = 'admin-msg ' + (isError ? 'error' : 'success');
    }

    function clearMsg(el) {
        el.textContent = '';
        el.className = '';
    }

    async function checkSession() {
        var { data: { session } } = await sb.auth.getSession();
        if (session) {
            currentUser = session.user;
            showPanel();
            loadTeams();
            loadMatches();
            loadNews();
        }
    }

    function showPanel() {
        loginBox.classList.add('admin-hidden');
        panelBox.classList.remove('admin-hidden');
        adminEmail.textContent = currentUser ? currentUser.email : '';
    }

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        clearMsg(loginMsg);
        var email = document.getElementById('login-email').value.trim();
        var password = document.getElementById('login-password').value;
        var { data, error } = await sb.auth.signInWithPassword({ email: email, password: password });
        if (error) {
            showMsg(loginMsg, 'Error: ' + error.message, true);
            return;
        }
        currentUser = data.user;
        showPanel();
        loadTeams();
        loadMatches();
        loadNews();
    });

    logoutBtn.addEventListener('click', async function() {
        await sb.auth.signOut();
        currentUser = null;
        loginBox.classList.remove('admin-hidden');
        panelBox.classList.add('admin-hidden');
    });

    async function loadTeams() {
        var { data, error } = await sb.from('teams').select('id,name').order('name');
        if (error) return;
        newsTeam.innerHTML = data.map(function(t) {
            return '<option value="' + t.id + '">' + escHtml(t.name) + '</option>';
        }).join('');
    }

    async function loadMatches() {
        var state = window.APP ? window.APP.getState() : { season: '2026-27', competition: 'liga' };
        var compId = state.season + '-' + state.competition;
        var { data, error } = await sb.from('matches')
            .select('id, date, home_team:home_team_id(name), away_team:away_team_id(name)')
            .eq('competition_id', compId)
            .order('date');
        if (error) return;
        videoMatch.innerHTML = data.map(function(m) {
            var label = (m.home_team ? m.home_team.name : '?') + ' vs ' + (m.away_team ? m.away_team.name : '?');
            return '<option value="' + m.id + '">' + escHtml(label) + '</option>';
        }).join('');
    }

    async function loadNews() {
        var teamId = newsTeam.value;
        if (!teamId) return;
        var { data, error } = await sb.from('news')
            .select('*')
            .eq('team_id', teamId)
            .order('created_at', { ascending: false })
            .limit(20);
        if (error) return;
        newsList.innerHTML = data.map(function(n) {
            return '<div class="admin-news-item"><div><strong>' + escHtml(n.title) + '</strong><br><small>' + (n.source || 'Sin fuente') + '</small></div></div>';
        }).join('');
    }

    newsTeam.addEventListener('change', loadNews);

    newsForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        clearMsg(newsMsg);
        var row = {
            team_id: parseInt(newsTeam.value),
            title: document.getElementById('news-title').value.trim(),
            summary: document.getElementById('news-summary').value.trim(),
            url: document.getElementById('news-url').value.trim(),
            image_url: document.getElementById('news-image').value.trim(),
            source: document.getElementById('news-source').value.trim(),
            published_at: new Date().toISOString()
        };
        var { error } = await sb.from('news').insert(row);
        if (error) {
            showMsg(newsMsg, 'Error guardando noticia: ' + error.message, true);
            return;
        }
        showMsg(newsMsg, 'Noticia guardada correctamente.');
        newsForm.reset();
        loadNews();
    });

    videoForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        clearMsg(videoMsg);
        var matchId = parseInt(videoMatch.value);
        var m = videoMatch.options[videoMatch.selectedIndex].text;
        var key = buildVideoKey(matchId, m);
        var row = {
            match_id: matchId,
            video_key: key,
            url: document.getElementById('video-url').value.trim()
        };
        var { error } = await sb.from('videos').insert(row);
        if (error) {
            showMsg(videoMsg, 'Error guardando vídeo: ' + error.message, true);
            return;
        }
        showMsg(videoMsg, 'Vídeo guardado correctamente.');
        videoForm.reset();
    });

    function buildVideoKey(matchId, label) {
        // Best effort key; ideally we reconstruct from match data
        return 'video-' + matchId;
    }

    function escHtml(s) {
        if (s == null) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    checkSession();
})();
