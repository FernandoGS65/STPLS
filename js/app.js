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

    /* ===== NAV ICONS ===== */
    function renderNavIcons() {
        var container = document.getElementById('nav-icons');
        if (!container) return;
        var pagina = window.location.pathname.split('/').pop() || 'index.html';

        var icons = [
            { href: 'index.html', page: 'index.html', label: 'Inicio', svg: '<svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>' },
            { href: 'equipos.html', page: 'equipos.html', label: 'Equipos', svg: '<svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>' },
            { href: 'resultados.html', page: 'resultados.html', label: 'Resultados', svg: '<svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>' },
            { href: 'clasificaciones.html', page: 'clasificaciones.html', label: 'Clasif.', svg: '<svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' },
            { href: '#', page: '', label: 'Tema', svg: '<svg class="nav-icon-svg" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>', action: 'theme' }
        ];

        var html = '';
        icons.forEach(function(icon) {
            if (icon.action === 'theme') {
                html += '<button class="nav-icon" id="themeToggle" aria-label="Cambiar tema">' + icon.svg + '<span>' + icon.label + '</span></button>';
            } else {
                var active = pagina === icon.page ? ' nav-icon--active' : '';
                html += '<a href="' + icon.href + '" class="nav-icon' + active + '">' + icon.svg + '<span>' + icon.label + '</span></a>';
            }
        });
        container.innerHTML = html;
    }

    /* Override init to also render nav icons */
    var origRender = renderNavSelectors;
    renderNavSelectors = function() {
        origRender();
        renderNavIcons();
    };

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
