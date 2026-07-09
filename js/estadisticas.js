(function() {
    'use strict';

    var dataCache = null;
    var teamDataCache = null;

    var tabs = document.querySelectorAll('.estadisticas-tab');
    var contents = document.querySelectorAll('.estadisticas-tab-content');

    tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            var target = this.getAttribute('data-tab');

            tabs.forEach(function(t) {
                t.classList.remove('estadisticas-tab--active');
            });
            this.classList.add('estadisticas-tab--active');

            contents.forEach(function(c) {
                c.classList.remove('estadisticas-tab-content--active');
            });
            document.getElementById('tab-' + target).classList.add('estadisticas-tab-content--active');

            if (target === 'equipo' && teamDataCache) {
                renderTeamMainView();
            }
        });
    });

    var sections = [
        { key: 'valoracion', title: 'Valoración promedio', valueFn: function(p) { return p.avgRating; } },
        { key: 'goleadores', title: 'Máximo Goleador', valueFn: function(p) { return p.goals; } },
        { key: 'asistencias', title: 'Asistencias', valueFn: function(p) { return p.assists; } },
        { key: 'pases', title: 'Pases Completados', valueFn: function(p) { return p.passes; } },
        { key: 'cortes', title: 'Cortes de Balón', valueFn: function(p) { return p.tackles; } },
        { key: 'penales', title: 'Penaltis Marcados', valueFn: function(p) { return p.penScored + '/' + p.penTotal; } },
        { key: 'titulares', title: 'Partidos Titulares', valueFn: function(p) { return p.starts; } },
        { key: 'sustituidos', title: 'Veces Sustituido', valueFn: function(p) { return p.subbedOff; } },
        { key: 'suplentes', title: 'Entradas como Suplente', valueFn: function(p) { return p.subbedOn; } },
        { key: 'minuteros', title: 'Minutos Totales', valueFn: function(p) { return p.minutes; } },
        { key: 'porteros', title: 'Portero menos goles encajados', valueFn: function(p) { return p.goalsConceded; } },
        { key: 'ceroPorterias', title: 'Portero porterías a cero', valueFn: function(p) { return p.cleanSheets; } },
        { key: 'paradas', title: 'Portero más paradas', valueFn: function(p) { return p.saves; } },
        { key: 'penParadas', title: 'Portero penaltis parados', valueFn: function(p) { return p.penSaved + '/' + p.penFaced; } },
        { key: 'faltas', title: 'Faltas Cometidas', valueFn: function(p) { return p.fouls; } },
        { key: 'amarillas', title: 'Tarjetas Amarillas', valueFn: function(p) { return p.yellowCards; } },
        { key: 'rojas', title: 'Tarjetas Rojas', valueFn: function(p) { return p.redCards; } }
    ];

    var teamSections = [
        { key: 'valoracion', title: 'Mejor Valoración', valueFn: function(t) { return t.avgRating; } },
        { key: 'porteriasCero', title: 'Porterías a Cero', valueFn: function(t) { return t.cleanSheets; } },
        { key: 'posesion', title: 'Posesión Media', valueFn: function(t) { return (t.avgPossession * 100).toFixed(1) + '%'; } }
    ];

    function renderPlayerRow(player, index, value) {
        var pos = index + 1;
        var initials = player.name.split(' ').map(function(w) { return w[0]; }).join('').substring(0, 2).toUpperCase();
        var fotoUrl = player.fotMobId ? 'https://images.fotmob.com/image_resources/playerimages/' + player.fotMobId + '.png' : '';

        var html = '<div class="estadisticas-row">';
        html += '<span class="estadisticas-pos">' + pos + '</span>';
        html += '<div class="estadisticas-player">';
        html += '<div class="estadisticas-avatar">';
        if (fotoUrl) {
            html += '<img src="' + fotoUrl + '" alt="' + player.name + '" class="estadisticas-avatar-img" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">';
        }
        html += '<div class="estadisticas-avatar-fallback" style="' + (fotoUrl ? 'display:none' : 'display:flex') + '">' + initials + '</div>';
        html += '</div>';
        html += '<div class="estadisticas-info">';
        html += '<span class="estadisticas-name">' + player.name + '</span>';
        html += '<span class="estadisticas-team">' + player.team + '</span>';
        html += '</div>';
        html += '</div>';
        html += '<span class="estadisticas-value">' + value + '</span>';
        html += '</div>';
        return html;
    }

    function renderTeamRow(team, index, value) {
        var pos = index + 1;
        var logoUrl = APP.fixLogo(team.logo || '');
        var initials = team.name.split(' ').map(function(w) { return w[0]; }).join('').substring(0, 2).toUpperCase();

        var html = '<div class="estadisticas-row">';
        html += '<span class="estadisticas-pos">' + pos + '</span>';
        html += '<div class="estadisticas-player">';
        html += '<div class="estadisticas-avatar">';
        if (logoUrl) {
            html += '<img src="' + logoUrl + '" alt="' + team.name + '" class="estadisticas-avatar-img" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">';
        }
        html += '<div class="estadisticas-avatar-fallback" style="' + (logoUrl ? 'display:none' : 'display:flex') + '">' + initials + '</div>';
        html += '</div>';
        html += '<div class="estadisticas-info">';
        html += '<span class="estadisticas-name">' + team.name + '</span>';
        html += '<span class="estadisticas-team">' + team.played + ' PJ · ' + team.won + 'G ' + team.drawn + 'E ' + team.lost + 'P</span>';
        html += '</div>';
        html += '</div>';
        html += '<span class="estadisticas-value">' + value + '</span>';
        html += '</div>';
        return html;
    }

    function renderSection(title, players, valueFn, clickable) {
        if (!players || !players.length) return '';
        var html = '<div class="estadisticas-section">';
        if (clickable) {
            html += '<h2 class="estadisticas-title estadisticas-title--link" data-section="' + title + '">' + title + ' <span class="estadisticas-arrow">›</span></h2>';
        } else {
            html += '<h2 class="estadisticas-title">' + title + '</h2>';
        }
        html += '<div class="estadisticas-table">';
        players.forEach(function(p, i) {
            html += renderPlayerRow(p, i, valueFn(p));
        });
        html += '</div></div>';
        return html;
    }

    function renderMainView() {
        if (!dataCache) return;
        var container = document.getElementById('tab-jugadores');
        var html = '';

        sections.forEach(function(sec, i) {
            if (i > 0) html += '<div class="estadisticas-separator"></div>';
            html += renderSection(sec.title, dataCache[sec.key], sec.valueFn, true);
        });

        if (dataCache.meta) {
            html += '<div class="estadisticas-meta">';
            html += '<span>' + dataCache.meta.jornadasDescargadas + ' de ' + dataCache.meta.totalJornadas + ' jornadas</span>';
            html += '<span>Mín. ' + dataCache.meta.minPartidos + ' partidos</span>';
            html += '</div>';
        }

        container.innerHTML = html;

        container.querySelectorAll('.estadisticas-title--link').forEach(function(el) {
            el.addEventListener('click', function() {
                var secTitle = this.getAttribute('data-section');
                showDetail(secTitle);
            });
        });
    }

    function showDetail(title) {
        var sec = sections.find(function(s) { return s.title === title; });
        if (!sec) return;

        var players = dataCache[sec.key + '15'] || dataCache[sec.key];
        var container = document.getElementById('tab-jugadores');

        var html = '<div class="estadisticas-detail">';
        html += '<div class="estadisticas-detail-header">';
        html += '<button class="estadisticas-back" id="btn-volver">← Volver</button>';
        html += '<h2 class="estadisticas-detail-title">' + title + '</h2>';
        html += '</div>';
        html += '<div class="estadisticas-table">';
        players.forEach(function(p, i) {
            html += renderPlayerRow(p, i, sec.valueFn(p));
        });
        html += '</div></div>';

        container.innerHTML = html;

        document.getElementById('btn-volver').addEventListener('click', function() {
            renderMainView();
        });
    }

    function renderTeamSection(title, teams, valueFn, clickable) {
        if (!teams || !teams.length) return '';
        var html = '<div class="estadisticas-section">';
        if (clickable) {
            html += '<h2 class="estadisticas-title estadisticas-title--link" data-section="' + title + '">' + title + ' <span class="estadisticas-arrow">›</span></h2>';
        } else {
            html += '<h2 class="estadisticas-title">' + title + '</h2>';
        }
        html += '<div class="estadisticas-table">';
        teams.forEach(function(t, i) {
            html += renderTeamRow(t, i, valueFn(t));
        });
        html += '</div></div>';
        return html;
    }

    function renderTeamMainView() {
        if (!teamDataCache) return;
        var container = document.getElementById('tab-equipo');
        var html = '';

        teamSections.forEach(function(sec, i) {
            if (i > 0) html += '<div class="estadisticas-separator"></div>';
            html += renderTeamSection(sec.title, teamDataCache[sec.key], sec.valueFn, true);
        });

        if (teamDataCache.meta) {
            html += '<div class="estadisticas-meta">';
            html += '<span>' + teamDataCache.meta.jornadasDescargadas + ' de ' + teamDataCache.meta.totalJornadas + ' jornadas</span>';
            html += '</div>';
        }

        container.innerHTML = html;

        container.querySelectorAll('.estadisticas-title--link').forEach(function(el) {
            el.addEventListener('click', function() {
                var secTitle = this.getAttribute('data-section');
                showTeamDetail(secTitle);
            });
        });
    }

    function showTeamDetail(title) {
        var sec = teamSections.find(function(s) { return s.title === title; });
        if (!sec) return;

        var teams = teamDataCache[sec.key + '15'] || teamDataCache[sec.key];
        var container = document.getElementById('tab-equipo');

        var html = '<div class="estadisticas-detail">';
        html += '<div class="estadisticas-detail-header">';
        html += '<button class="estadisticas-back" id="btn-volver-equipo">← Volver</button>';
        html += '<h2 class="estadisticas-detail-title">' + title + '</h2>';
        html += '</div>';
        html += '<div class="estadisticas-table">';
        teams.forEach(function(t, i) {
            html += renderTeamRow(t, i, sec.valueFn(t));
        });
        html += '</div></div>';

        container.innerHTML = html;

        document.getElementById('btn-volver-equipo').addEventListener('click', function() {
            renderTeamMainView();
        });
    }

    function loadData() {
        fetch(APP.ruta('estadisticas-jugadores'))
            .then(function(r) { return r.json(); })
            .then(function(data) {
                dataCache = data;
                renderMainView();
            })
            .catch(function(err) {
                console.warn('Error cargando estadísticas:', err);
            });
    }

    function loadTeamData() {
        fetch(APP.ruta('estadisticas-equipo'))
            .then(function(r) { return r.json(); })
            .then(function(data) {
                teamDataCache = data;
                if (document.getElementById('tab-equipo').classList.contains('estadisticas-tab-content--active')) {
                    renderTeamMainView();
                }
            })
            .catch(function(err) {
                console.warn('Error cargando estadísticas de equipo:', err);
            });
    }

    APP.onChange(function() {
        loadData();
        loadTeamData();
    });

})();
