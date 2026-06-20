var APP = (function() {

    var STORAGE_THEME = 'stpls-theme';
    var STORAGE_SEASON = 'stpls-season';
    var STORAGE_COMP = 'stpls-comp';

    var state = {
        seasons: [],
        season: null,
        competition: null,
        ready: false
    };

    var listeners = [];

    function init() {
        applyTheme(getPreferredTheme());
        setupThemeToggle();
        loadSeasons();
    }

    /* ===== THEME ===== */
    function applyTheme(theme) {
        if (theme === 'light') {
            document.documentElement.classList.add('light-mode');
        } else {
            document.documentElement.classList.remove('light-mode');
        }
    }

    function getPreferredTheme() {
        var saved = localStorage.getItem(STORAGE_THEME);
        if (saved === 'light' || saved === 'dark') return saved;
        return window.matchMedia && window.matchMedia('(prefers-color-scheme:light)').matches ? 'light' : 'dark';
    }

    function setupThemeToggle() {
        document.addEventListener('click', function(e) {
            var btn = e.target.closest('#themeToggle');
            if (!btn) return;
            var isLight = document.documentElement.classList.toggle('light-mode');
            localStorage.setItem(STORAGE_THEME, isLight ? 'light' : 'dark');
        });
    }

    /* ===== SEASONS ===== */
    function loadSeasons() {
        fetch('./data/seasons.json').then(function(r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        }).then(function(data) {
            state.seasons = data.seasons || [];
            if (!state.seasons.length) return;

            var savedSeason = localStorage.getItem(STORAGE_SEASON);
            var savedComp = localStorage.getItem(STORAGE_COMP);

            var found = false;
            if (savedSeason) {
                var s = state.seasons.find(function(s) { return s.id === savedSeason; });
                if (s) {
                    state.season = savedSeason;
                    if (savedComp && s.competitions.find(function(c) { return c.id === savedComp; })) {
                        state.competition = savedComp;
                    } else {
                        state.competition = s.competitions[0].id;
                    }
                    found = true;
                }
            }
            if (!found) {
                var def = state.seasons.find(function(s) { return s.default; }) || state.seasons[0];
                state.season = def.id;
                state.competition = def.competitions[0].id;
            }

            saveState();
            state.ready = true;
            renderNavSelectors();
            notify();
        }).catch(function(err) {
            console.warn('No se pudo cargar seasons.json:', err);
            state.ready = true;
            notify();
        });
    }

    function saveState() {
        if (state.season) localStorage.setItem(STORAGE_SEASON, state.season);
        if (state.competition) localStorage.setItem(STORAGE_COMP, state.competition);
    }

    function setSeason(id) {
        state.season = id;
        var s = state.seasons.find(function(s) { return s.id === id; });
        if (s) {
            if (!s.competitions.find(function(c) { return c.id === state.competition; })) {
                state.competition = s.competitions[0].id;
            }
        }
        saveState();
        renderNavSelectors();
        notify();
    }

    function setCompetition(id) {
        state.competition = id;
        saveState();
        renderNavSelectors();
        notify();
    }

    /* ===== ROUTING ===== */
    function ruta(tipo, param) {
        var base = './data/' + state.season + '/' + state.competition;
        switch (tipo) {
            case 'calendario': return base + '/calendario.json';
            case 'videos': return base + '/videos.json';
            case 'descargados': return base + '/descargados.json';
            case 'equipos-info': return './data/equipos-info.json';
            case 'partido': return base + '/partidos/' + param + '.json';
            default: return base + '/' + tipo + '.json';
        }
    }

    /* ===== NAV SELECTORS ===== */
    function renderNavSelectors() {
        var container = document.getElementById('nav-controls');
        if (!container || !state.seasons.length) return;

        var html = '';
        html += '<select id="nav-season" class="nav-select">';
        state.seasons.forEach(function(s) {
            html += '<option value="' + s.id + '"' + (s.id === state.season ? ' selected' : '') + '>' + s.label + '</option>';
        });
        html += '</select>';

        var currentSeason = state.seasons.find(function(s) { return s.id === state.season; });
        if (currentSeason && currentSeason.competitions.length > 1) {
            html += '<select id="nav-comp" class="nav-select">';
            currentSeason.competitions.forEach(function(c) {
                html += '<option value="' + c.id + '"' + (c.id === state.competition ? ' selected' : '') + '>' + c.label + '</option>';
            });
            html += '</select>';
        }

        container.innerHTML = html;

        document.getElementById('nav-season').addEventListener('change', function(e) {
            setSeason(e.target.value);
        });

        var compSel = document.getElementById('nav-comp');
        if (compSel) {
            compSel.addEventListener('change', function(e) {
                setCompetition(e.target.value);
            });
        }
    }

    /* ===== CHANGE LISTENERS ===== */
    function onChange(fn) {
        listeners.push(fn);
        if (state.ready) fn(state);
    }

    function notify() {
        listeners.forEach(function(fn) { fn(state); });
    }

    /* ===== PUBLIC API ===== */
    return {
        init: init,
        ruta: ruta,
        onChange: onChange,
        getState: function() { return state; },
        season: function() { return state.season; },
        competition: function() { return state.competition; }
    };

})();

APP.init();
