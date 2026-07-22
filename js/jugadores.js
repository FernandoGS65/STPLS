(function() {
    'use strict';

    var jugadores = [];
    var lista = document.getElementById("lista-jugadores");
    var buscador = document.getElementById("buscador-jugadores");

    function escHtml(s) {
        if (s == null) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function posicionEspanol(pos) {
        var map = {
            'Goalkeeper': 'Portero',
            'Defender': 'Defensa',
            'Midfielder': 'Centrocampista',
            'Forward': 'Delantero'
        };
        return map[pos] || pos;
    }

    async function cargarJugadores() {
        jugadores = [];
        if (window.STPLS_API && window.STPLS_API.fetchPlayerSeasonStats) {
            try {
                var stats = await window.STPLS_API.fetchPlayerSeasonStats();
                if (stats && stats.goleadores) {
                    stats.goleadores.forEach(function(p) {
                        jugadores.push({
                            nombre: p.name,
                            equipo: p.team,
                            posicion: posicionEspanol(p.position),
                            edad: null,
                            goles: p.goals,
                            asistencias: p.assists,
                            foto: p.fotMobId ? 'https://images.fotmob.com/image_resources/playerimages/' + p.fotMobId + '.png' : ''
                        });
                    });
                }
            } catch (e) {
                console.warn('Supabase player stats failed:', e);
            }
        }

        if (jugadores.length === 0 && window.STPLS_API && window.STPLS_API.fetchPlayers) {
            try {
                var players = await window.STPLS_API.fetchPlayers();
                jugadores = (players || []).map(function(p) {
                    return {
                        nombre: p.name,
                        equipo: p.team ? p.team.name : '',
                        posicion: posicionEspanol(p.position),
                        edad: p.age,
                        goles: 0,
                        asistencias: 0,
                        foto: p.photo_url || ''
                    };
                });
            } catch (e) {
                console.warn('Supabase players failed:', e);
            }
        }

        if (jugadores.length === 0) {
            try {
                var resp = await fetch(APP.ruta('plantilla'));
                var plantilla = await resp.json();
                Object.keys(plantilla).forEach(function(team) {
                    (plantilla[team].players || []).forEach(function(p) {
                        jugadores.push({
                            nombre: p.name,
                            equipo: team,
                            posicion: posicionEspanol(p.position),
                            edad: null,
                            goles: 0,
                            asistencias: 0,
                            foto: p.fotMobId ? 'https://images.fotmob.com/image_resources/playerimages/' + p.fotMobId + '.png' : ''
                        });
                    });
                });
            } catch (e) {
                console.warn('Plantilla fallback failed:', e);
            }
        }

        mostrarJugadores(buscador ? buscador.value : '');
    }

    function mostrarJugadores(textoBusqueda) {
        if (!lista) return;
        textoBusqueda = (textoBusqueda || '').toLowerCase();

        var filtrados = jugadores.filter(function(jugador) {
            return (
                jugador.nombre.toLowerCase().includes(textoBusqueda) ||
                jugador.equipo.toLowerCase().includes(textoBusqueda) ||
                jugador.posicion.toLowerCase().includes(textoBusqueda)
            );
        });

        var html = "";
        filtrados.forEach(function(jugador) {
            var fotoHtml = jugador.foto
                ? '<img src="' + escHtml(jugador.foto) + '" alt="" class="jugador-foto" onerror="this.style.display=\'none\'">'
                : '';
            html += '<div class="jugador-card">' +
                fotoHtml +
                '<h3>' + escHtml(jugador.nombre) + '</h3>' +
                '<p><strong>Equipo:</strong> ' + escHtml(jugador.equipo) + '</p>' +
                '<p><strong>Posición:</strong> ' + escHtml(jugador.posicion) + '</p>' +
                (jugador.edad ? '<p><strong>Edad:</strong> ' + escHtml(jugador.edad) + '</p>' : '') +
                '<p><strong>Goles:</strong> ⚽ ' + escHtml(jugador.goles) + '</p>' +
                (jugador.asistencias ? '<p><strong>Asistencias:</strong> ' + escHtml(jugador.asistencias) + '</p>' : '') +
                '</div>';
        });

        lista.innerHTML = html;
    }

    if (buscador) {
        buscador.addEventListener("input", function() {
            mostrarJugadores(buscador.value);
        });
    }

    if (window.APP && window.APP.onChange) {
        APP.onChange(function() { cargarJugadores(); });
    } else {
        cargarJugadores();
    }
})();
