function matchesFromSupabase(matches) {
    return matches.map(function(m) {
        return {
            id: m.id,
            round: m.round,
            date: m.date,
            state: {
                score: {
                    current: m.home_score != null ? m.home_score + '-' + m.away_score : null
                },
                description: m.status
            },
            homeTeam: {
                id: m.home_team ? m.home_team.id : null,
                name: m.home_team ? m.home_team.name : '',
                logo: m.home_team ? APP.fixLogo(m.home_team.logo_url) : ''
            },
            awayTeam: {
                id: m.away_team ? m.away_team.id : null,
                name: m.away_team ? m.away_team.name : '',
                logo: m.away_team ? APP.fixLogo(m.away_team.logo_url) : ''
            }
        };
    });
}

async function cargarResultados() {

    try {

        let partidos = [];
        let videos = {};
        let descargados = new Set();
        let useSupabase = false;

        if (window.STPLS_API && window.STPLS_API.fetchMatches) {
            try {
                const supabaseMatches = await window.STPLS_API.fetchMatches();
                if (supabaseMatches && supabaseMatches.length > 0) {
                    partidos = matchesFromSupabase(supabaseMatches);
                    useSupabase = true;
                }
            } catch (e) {
                console.warn('Supabase matches fetch failed, falling back to JSON', e);
            }
        }

        if (useSupabase) {
            try {
                const supabaseVideos = await window.STPLS_API.fetchVideos();
                if (supabaseVideos) videos = supabaseVideos;
            } catch (e) {
                console.warn('Supabase videos fetch failed', e);
            }
            // In Supabase mode all migrated matches are considered "available"
            descargados = new Set(partidos.map(p => p.id));
        } else {
            const respuesta = await fetch(APP.ruta("calendario"));
            const datos = await respuesta.json();
            partidos = datos.data;

            const respuestaVideos = await fetch(APP.ruta("videos"));
            videos = await respuestaVideos.json();

            const respuestaDesc = await fetch(APP.ruta("descargados"));
            const descargadosRaw = await respuestaDesc.json();
            descargados = new Set(descargadosRaw.map(d => d.id));
        }

        const selector =
            document.getElementById(
                "selector-jornada"
            );

        selector.innerHTML = "";

        const jornadas =
            [...new Set(
                partidos.map(
                    p => p.round
                )
            )];

        jornadas.sort((a, b) => {

            const na =
                parseInt(
                    a.split("-")[1]
                );

            const nb =
                parseInt(
                    b.split("-")[1]
                );

            return na - nb;

        });

        var jornadaInicial = buscarJornadaActual(jornadas, partidos);

        var idxActual = jornadas.indexOf(jornadaInicial);
        if (idxActual === -1) idxActual = 0;

        actualizarSlider(jornadas, idxActual);

        mostrarJornada(
    jornadas[idxActual],
    partidos,
    videos,
    descargados
);

        document.getElementById("jornada-prev").addEventListener("click", function() {
            if (idxActual > 0) {
                idxActual--;
                actualizarSlider(jornadas, idxActual);
                mostrarJornada(jornadas[idxActual], partidos, videos, descargados);
                selector.value = jornadas[idxActual];
            }
        });

        document.getElementById("jornada-next").addEventListener("click", function() {
            if (idxActual < jornadas.length - 1) {
                idxActual++;
                actualizarSlider(jornadas, idxActual);
                mostrarJornada(jornadas[idxActual], partidos, videos, descargados);
                selector.value = jornadas[idxActual];
            }
        });

        selector.addEventListener(
            "change",
            () => {

                var nuevoIdx = jornadas.indexOf(selector.value);
                if (nuevoIdx !== -1) {
                    idxActual = nuevoIdx;
                    actualizarSlider(jornadas, idxActual);
                }

                mostrarJornada(
    selector.value,
    partidos,
    videos,
    descargados
);

            }
        );

        var touchStartX = 0;
        var sliderEl = document.getElementById("jornada-slider");
        sliderEl.addEventListener("touchstart", function(e) {
            touchStartX = e.changedTouches[0].clientX;
        }, { passive: true });
        sliderEl.addEventListener("touchend", function(e) {
            var diff = touchStartX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 50) {
                if (diff > 0 && idxActual > 0) {
                    idxActual--;
                    actualizarSlider(jornadas, idxActual);
                    mostrarJornada(jornadas[idxActual], partidos, videos, descargados);
                    selector.value = jornadas[idxActual];
                } else if (diff < 0 && idxActual < jornadas.length - 1) {
                    idxActual++;
                    actualizarSlider(jornadas, idxActual);
                    mostrarJornada(jornadas[idxActual], partidos, videos, descargados);
                    selector.value = jornadas[idxActual];
                }
            }
        }, { passive: true });

    }

    catch(error){

        console.error(
            "ERROR:",
            error
        );

    }

}

function buscarJornadaActual(jornadas, partidos) {
    var now = new Date();

    for (var i = 0; i < jornadas.length; i++) {
        var j = jornadas[i];
        var filtrados = partidos.filter(function(p) { return p.round === j; });
        var tieneJugado = filtrados.some(function(p) {
            return p.state?.score?.current && p.state?.score?.current !== "-";
        });
        var tienePendiente = filtrados.some(function(p) {
            return new Date(p.date) > now;
        });
        if (tieneJugado && tienePendiente) return j;
    }

    for (var i = 0; i < jornadas.length; i++) {
        var j = jornadas[i];
        var filtrados = partidos.filter(function(p) { return p.round === j; });
        var todosJugados = filtrados.every(function(p) {
            return p.state?.score?.current && p.state?.score?.current !== "-";
        });
        if (!todosJugados) return j;
    }

    return jornadas[jornadas.length - 1];
}

function actualizarSlider(jornadas, idxActual) {
    var label = document.getElementById("jornada-label");
    var numJor = jornadas[idxActual].split("-")[1].trim();
    label.textContent = "Jornada " + numJor;

    document.getElementById("jornada-prev").disabled = idxActual <= 0;
    document.getElementById("jornada-next").disabled = idxActual >= jornadas.length - 1;
}

function normalizarEquipo(nombre){

    return nombre
        .replaceAll(" ", "")
        .replaceAll("á","a")
        .replaceAll("é","e")
        .replaceAll("í","i")
        .replaceAll("ó","o")
        .replaceAll("ú","u");
}


function mostrarJornada(
    jornada,
    partidos,
    videos,
    descargados
){

    const contenedor =
        document.getElementById(
            "lista-resultados"
        );

    const filtrados =
        partidos.filter(
            p => p.round === jornada
        );

    filtrados.sort((a,b)=>
        new Date(a.date) -
        new Date(b.date)
    );

    contenedor.innerHTML = "";

    filtrados.forEach(partido => {

        const card =
            document.createElement(
                "div"
            );

        card.className =
            "resultado-card";

        const resultado =
            partido.state?.score?.current
            || "-";

 const numeroJornada =
    jornada
        .split("-")[1]
        .trim()
        .padStart(2,"0");

const videoId =

    `LL-J${numeroJornada}-` +

    `${normalizarEquipo(
        partido.homeTeam.name
    )}-` +

    `${normalizarEquipo(
        partido.awayTeam.name
    )}`;

const tieneVideo =
    videos[videoId];

const tieneDatos =
    descargados && descargados.has(partido.id);

        const fecha = new Date(partido.date);
        const fechaStr = fecha.toLocaleDateString("es-ES", {
            weekday:"short", day:"numeric", month:"short"
        });
        const horaStr = fecha.toLocaleTimeString("es-ES", {
            hour:"2-digit", minute:"2-digit"
        });

        card.innerHTML = `

    <div class="resultado-fecha">${fechaStr} · ${horaStr}</div>

    <div class="equipo-local">

${tieneDatos ? '<svg class="icon-descarga" width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.2"/><path d="M4.5 7l2 2 3-3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}

        <img
            src="${APP.fixLogo(partido.homeTeam.logo)}"
            class="escudo-partido"
            alt="${partido.homeTeam.name}">

       <a
    href="equipo.html?id=${encodeURIComponent(
        partido.homeTeam.name
    )}"
    class="link-equipo">

    ${partido.homeTeam.name}

</a>

    </div>

 <div class="resultado-centro">

    <a href="partido.html?matchId=${partido.id}" class="link-partido">${resultado}</a>

</div>

<div class="equipo-visitante">

    <a
        href="equipo.html?id=${encodeURIComponent(
            partido.awayTeam.name
        )}"
        class="link-equipo">

        ${partido.awayTeam.name}

    </a>

    <img
        src="${APP.fixLogo(partido.awayTeam.logo)}"
        class="escudo-partido"
        alt="${partido.awayTeam.name}">

</div>

<div class="video-resultado${tieneVideo ? '' : ' video-resultado--empty'}">
    ${tieneVideo ? '<a href="video.html?id=' + videoId + '" class="link-video"><svg class="icon-video" width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.3"/><path d="M6.5 5.5v5l4-2.5z" fill="currentColor"/></svg></a>' : ''}
</div>

`;

        contenedor.appendChild(
            card
        );

    });

}

/* ===== BEST XI (Equipo de la Jornada / Temporada) ===== */

(function() {

    var bestXiDataCache = null;
    var modoActual = null;

    function escHtml(s) {
        if (s == null) return '';
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function shortName(name) {
        if (!name) return '';
        var parts = name.trim().split(/\s+/);
        if (parts.length <= 1) return name;
        var last = parts[parts.length - 1];
        if (last.length <= 5) return last;
        return parts[0].charAt(0) + '. ' + last;
    }

    function playerPhotoUrl(fotMobId) {
        if (!fotMobId) return '';
        return 'https://images.fotmob.com/image_resources/playerimages/' + fotMobId + '.png';
    }

    async function loadBestXiData() {
        if (bestXiDataCache) return bestXiDataCache;

        if (window.STPLS_API && window.STPLS_API.fetchBestXIData) {
            try {
                var sbData = await window.STPLS_API.fetchBestXIData();
                if (sbData && sbData.partidos && sbData.partidos.length > 0) {
                    bestXiDataCache = {
                        partidos: sbData.partidos,
                        matches: sbData.matches,
                        playersMap: sbData.playersMap || {},
                        jornadasPorEquipo: {},
                        isJson: false
                    };
                    sbData.partidos.forEach(function(p) {
                        if (p.homeTeam && p.homeTeam.name) {
                            bestXiDataCache.jornadasPorEquipo[p.homeTeam.name] =
                                (bestXiDataCache.jornadasPorEquipo[p.homeTeam.name] || 0) + 1;
                        }
                        if (p.awayTeam && p.awayTeam.name) {
                            bestXiDataCache.jornadasPorEquipo[p.awayTeam.name] =
                                (bestXiDataCache.jornadasPorEquipo[p.awayTeam.name] || 0) + 1;
                        }
                    });
                    return bestXiDataCache;
                }
            } catch (e) {
                console.warn('Supabase Best XI fetch failed, falling back to JSON', e);
            }
        }

        var resp = await fetch(APP.ruta('calendario'));
        var datos = await resp.json();

        var respDesc = await fetch(APP.ruta('descargados'));
        var descargados = await respDesc.json();

        var respPla = await fetch(APP.ruta('plantilla'));
        var plantilla = await respPla.json();

        var fotMobById = {};
        var positionById = {};
        Object.keys(plantilla).forEach(function(teamKey) {
            var team = plantilla[teamKey];
            if (team && team.players) {
                team.players.forEach(function(p) {
                    if (p.id && p.fotMobId) fotMobById[p.id] = p.fotMobId;
                    if (p.id && p.position) positionById[p.id] = p.position;
                });
            }
        });

        var jornadasPorEquipo = {};
        descargados.forEach(function(d) {
            if (!d.lineups || !d.boxscore) return;
            jornadasPorEquipo[d.home] = (jornadasPorEquipo[d.home] || 0) + 1;
            jornadasPorEquipo[d.away] = (jornadasPorEquipo[d.away] || 0) + 1;
        });

        var ids = new Set();
        descargados.forEach(function(d) {
            if (d.boxscore) ids.add(d.id);
        });

        var fetchPromises = [];
        ids.forEach(function(id) {
            fetchPromises.push(
                fetch(APP.ruta('partido', id)).then(function(r) { return r.json(); }).catch(function() { return null; })
            );
        });
        var partidos = (await Promise.all(fetchPromises)).filter(function(x) { return x; });

        bestXiDataCache = {
            partidos: partidos,
            matches: datos.data,
            fotMobById: fotMobById,
            positionById: positionById,
            jornadasPorEquipo: jornadasPorEquipo,
            isJson: true
        };
        return bestXiDataCache;
    }

    function parseJornada(round) {
        if (!round) return 0;
        var m = round.match(/(\d+)\s*$/);
        return m ? parseInt(m[1]) : 0;
    }

    function getPartidosFiltrados(data, modo, jornadaActual) {
        var todos = data.partidos || [];
        if (modo === 'jornada' && jornadaActual) {
            var numJor = parseInt(jornadaActual.split('-')[1].trim());
            return todos.filter(function(p) {
                return parseJornada(p.round) === numJor;
            });
        }
        return todos;
    }

    function extraerJugadores(data, modo, jornadaActual) {
        var jugadores = {};
        var partidos = getPartidosFiltrados(data, modo, jornadaActual);
        var isJson = data.isJson;
        var positionById = data.positionById || {};
        var fotMobById = data.fotMobById || {};
        var playersMap = data.playersMap || {};
        var jornadasPorEquipo = data.jornadasPorEquipo || {};

        partidos.forEach(function(d) {
            if (!d || !d.boxScore) return;
            var bsData = d.boxScore.value || d.boxScore;
            if (!Array.isArray(bsData)) return;

            bsData.forEach(function(box) {
                if (!box.players) return;
                box.players.forEach(function(p) {
                    if (!p.matchRating || p.minutesPlayed === 0) return;
                    var rating = parseFloat(p.matchRating);
                    if (isNaN(rating)) return;
                    rating = Math.min(rating, 10);

                    var key = p.id || (p.name + '_' + (p.shirtNumber || ''));
                    var teamLogo = box.team ? APP.fixLogo(box.team.logo) : '';
                    var position = p.position;
                    if (isJson && p.id && positionById[p.id]) position = positionById[p.id];
                    if (!isJson && p.id && playersMap[p.id] && playersMap[p.id].position) position = playersMap[p.id].position;
                    var fotMobId = null;
                    if (isJson && p.id && fotMobById[p.id]) fotMobId = fotMobById[p.id];
                    if (!isJson && p.id && playersMap[p.id] && playersMap[p.id].fotMobId) fotMobId = playersMap[p.id].fotMobId;

                    if (modo === 'temporada') {
                        var teamJor = jornadasPorEquipo[box.team ? box.team.name : ''] || 0;
                        if (!jugadores[key]) {
                            jugadores[key] = {
                                id: p.id,
                                name: p.name,
                                position: position,
                                sumRating: rating,
                                numMatches: 1,
                                rating: rating,
                                shirtNumber: p.shirtNumber,
                                teamName: box.team ? box.team.name : '',
                                teamLogo: teamLogo,
                                fotMobId: fotMobId,
                                teamTotalJornadas: teamJor
                            };
                        } else {
                            jugadores[key].sumRating += rating;
                            jugadores[key].numMatches++;
                            jugadores[key].rating = Math.min(jugadores[key].sumRating / jugadores[key].numMatches, 10);
                            if (teamLogo && !jugadores[key].teamLogo) jugadores[key].teamLogo = teamLogo;
                        }
                    } else {
                        if (!jugadores[key] || rating > jugadores[key].rating) {
                            jugadores[key] = {
                                id: p.id,
                                name: p.name,
                                position: position,
                                rating: rating,
                                shirtNumber: p.shirtNumber,
                                teamName: box.team ? box.team.name : '',
                                teamLogo: teamLogo,
                                fotMobId: fotMobId
                            };
                        }
                    }
                });
            });
        });

        return jugadores;
    }

    function seleccionarBestXI(jugadores) {
        var por = [];
        var def = [];
        var med = [];
        var del = [];

        Object.keys(jugadores).forEach(function(key) {
            var p = jugadores[key];
            if (p.teamTotalJornadas && p.teamTotalJornadas > 0 && p.numMatches < p.teamTotalJornadas * 0.2) return;
            switch (p.position) {
                case 'Goalkeeper': por.push(p); break;
                case 'Defender': def.push(p); break;
                case 'Midfielder': med.push(p); break;
                case 'Forward': del.push(p); break;
            }
        });

        por.sort(function(a,b) { return b.rating - a.rating; });
        def.sort(function(a,b) { return b.rating - a.rating; });
        med.sort(function(a,b) { return b.rating - a.rating; });
        del.sort(function(a,b) { return b.rating - a.rating; });

        var xi = {
            por: por.slice(0, 1),
            def: def.slice(0, 4),
            med: med.slice(0, 3),
            del: del.slice(0, 3)
        };

        var total = 0, count = 0;
        ['por','def','med','del'].forEach(function(k) {
            xi[k].forEach(function(p) { total += p.rating; count++; });
        });
        xi.avgRating = count > 0 ? (total / count).toFixed(2) : '0.00';

        return xi;
    }

    function renderPitchBestXI(xi) {
        var html = '<div class="bx-pitch-card">';

        html += '<div class="bx-pitch-header">';
        html += '<h3>XI Ideal</h3>';
        html += '<span class="bx-pitch-formation">4-3-3</span>';
        html += '<span class="bx-pitch-avg">' + xi.avgRating + '</span>';
        html += '</div>';

        html += '<div class="bx-pitch-wrap"><div class="bx-pitch">';
        html += '<div class="bx-pitch-spot"></div>';
        html += '<div class="bx-pitch-pa-b"></div><div class="bx-pitch-pa-t"></div>';
        html += '<div class="bx-pitch-ga-b"></div><div class="bx-pitch-ga-t"></div>';
        html += '<div class="bx-pitch-players">';

        var filas = [
            { jugadores: xi.por, topPct: 8 },
            { jugadores: xi.def, topPct: 28 },
            { jugadores: xi.med, topPct: 52 },
            { jugadores: xi.del, topPct: 75 }
        ];

        filas.forEach(function(fila) {
            var count = fila.jugadores.length;
            if (count === 0) return;
            var spacing = count <= 1 ? 0 : Math.min(90 / (count - 1), 26);
            var startX = count <= 1 ? 50 : 50 - ((count - 1) * spacing) / 2;

            fila.jugadores.forEach(function(p, i) {
                var leftPct = count <= 1 ? 50 : startX + i * spacing;
                if (leftPct < 8) leftPct = 8;
                if (leftPct > 92) leftPct = 92;

                var photo = playerPhotoUrl(p.fotMobId);
                var initials = (p.name || '').split(' ').map(function(w){ return w.charAt(0); }).join('').substring(0,2);

                html += '<div class="bx-player-node" style="top:' + fila.topPct + '%;left:' + leftPct + '%">';
                html += '<div class="bx-avatar-wrap">';
                html += '<div class="bx-avatar">';
                if (photo) {
                    html += '<img class="bx-avatar-photo" src="' + escHtml(photo) + '" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">';
                    html += '<span class="bx-avatar-initials fallback" style="display:none">' + escHtml(initials) + '</span>';
                } else {
                    html += '<span class="bx-avatar-initials">' + escHtml(initials) + '</span>';
                }
                html += '</div>';
                if (p.teamLogo) {
                    html += '<img class="bx-team-badge" src="' + escHtml(p.teamLogo) + '" alt="" onerror="this.style.display=\'none\'">';
                }
                html += '</div>';
                html += '<div class="bx-player-name">' + escHtml(shortName(p.name)) + '</div>';
                html += '<div class="bx-player-rating">' + p.rating.toFixed(2) + '</div>';
                html += '</div>';
            });
        });

        html += '</div></div></div>';
        html += '</div>';

        return html;
    }

    async function mostrarBestXI(modo) {
        modoActual = modo;
        var container = document.getElementById('bestxi-container');
        var lista = document.getElementById('lista-resultados');

        container.style.display = 'block';
        lista.style.display = 'none';

        container.innerHTML = '<div class="bestxi-loading">Cargando alineaciones...</div>';

        var data = await loadBestXiData();
        var selector = document.getElementById('selector-jornada');
        var jornadaActual = selector ? selector.value : null;

        var jugadores = extraerJugadores(data, modo, modo === 'jornada' ? jornadaActual : null);
        var xi = seleccionarBestXI(jugadores);

        if (xi.por.length === 0 && xi.def.length === 0 && xi.med.length === 0 && xi.del.length === 0) {
            container.innerHTML = '<div class="bestxi-loading">No hay datos de alineaciones disponibles para ' + (modo === 'jornada' ? 'esta jornada' : 'esta temporada') + '.</div>';
            return;
        }

        var html = renderPitchBestXI(xi);

        html += '<div class="bestxi-back" id="bestxi-volver">';
        html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>';
        html += 'Volver a Resultados';
        html += '</div>';

        container.innerHTML = html;

        document.getElementById('bestxi-volver').addEventListener('click', function() {
            container.style.display = 'none';
            lista.style.display = 'block';
            modoActual = null;
            document.querySelectorAll('.menu-bests-btn').forEach(function(b) { b.classList.remove('active'); });
        });
    }

    function initMenu() {
        var botones = document.querySelectorAll('.menu-bests-btn');
        botones.forEach(function(btn) {
            btn.addEventListener('click', function() {
                botones.forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                mostrarBestXI(btn.getAttribute('data-bestxi'));
            });
        });
    }

    document.addEventListener('DOMContentLoaded', function() {
        initMenu();
    });

    APP.onChange(function() {
        bestXiDataCache = null;
        modoActual = null;
        var container = document.getElementById('bestxi-container');
        var lista = document.getElementById('lista-resultados');
        if (container) container.style.display = 'none';
        if (lista) lista.style.display = 'block';
        document.querySelectorAll('.menu-bests-btn').forEach(function(b) { b.classList.remove('active'); });
    });

})();

APP.onChange(function() { cargarResultados(); });