async function cargarResultados() {

    try {

        const respuesta =
            await fetch(
                APP.ruta("calendario")
            );

        const datos =
            await respuesta.json();

            const respuestaVideos =
    await fetch(
        APP.ruta("videos")
    );

const videos =
    await respuestaVideos.json();

const respuestaDesc =
    await fetch(
        APP.ruta("descargados")
    );

const descargadosRaw =
    await respuestaDesc.json();

const descargados = new Set(
    descargadosRaw.map(d => d.id)
);

        const partidos =
            datos.data;

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

            return nb - na;

        });

        jornadas.forEach(jornada => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                jornada;

            option.textContent =
                "Jornada " +
                jornada.split("-")[1].trim();

            selector.appendChild(
                option
            );

        });

        mostrarJornada(
    jornadas[0],
    partidos,
    videos,
    descargados
);
        selector.addEventListener(
            "change",
            () => {

                mostrarJornada(
    selector.value,
    partidos,
    videos,
    descargados
);

            }
        );

    }

    catch(error){

        console.error(
            "ERROR:",
            error
        );

    }

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
            src="${partido.homeTeam.logo}"
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
        src="${partido.awayTeam.logo}"
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

    var partidosCache = null;
    var jornadasCache = null;
    var descargadosCache = null;
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

    async function ensureData() {
        if (partidosCache && descargadosCache) return;

        var resp = await fetch(APP.ruta('calendario'));
        var datos = await resp.json();
        partidosCache = datos.data;

        var respDesc = await fetch(APP.ruta('descargados'));
        descargadosCache = await respDesc.json();
    }

    function getPartidosDescargados(jornada) {
        var ids = new Set();
        if (jornada) {
            descargadosCache.forEach(function(d) {
                if (d.jornada === parseInt(jornada.split('-')[1].trim()) && d.boxscore) {
                    ids.add(d.id);
                }
            });
        } else {
            descargadosCache.forEach(function(d) {
                if (d.boxscore) ids.add(d.id);
            });
        }

        var resultados = [];
        ids.forEach(function(id) {
            var archivo = APP.ruta('partido', id);
            resultados.push(
                fetch(archivo).then(function(r) { return r.json(); }).catch(function() { return null; })
            );
        });
        return Promise.all(resultados);
    }

    function extraerJugadores(partidos) {
        var jugadores = {};

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

                    var key = p.id || (p.name + '_' + (p.shirtNumber || ''));
                    if (!jugadores[key] || rating > jugadores[key].rating) {
                        jugadores[key] = {
                            id: p.id,
                            name: p.name,
                            position: p.position,
                            rating: rating,
                            shirtNumber: p.shirtNumber,
                            teamName: box.team ? box.team.name : '',
                            teamLogo: box.team ? box.team.logo : '',
                            minutesPlayed: p.minutesPlayed
                        };
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
            { jugadores: xi.del, topPct: 12 },
            { jugadores: xi.med, topPct: 32 },
            { jugadores: xi.def, topPct: 55 },
            { jugadores: xi.por, topPct: 78 }
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

                var initials = (p.name || '').split(' ').map(function(w){ return w.charAt(0); }).join('').substring(0,2);

                html += '<div class="bx-player-node" style="top:' + fila.topPct + '%;left:' + leftPct + '%">';
                html += '<div class="bx-avatar-wrap">';
                html += '<div class="bx-avatar">';
                html += '<span class="bx-avatar-num">' + (p.shirtNumber || '') + '</span>';
                html += '<span class="bx-avatar-initials">' + escHtml(initials) + '</span>';
                html += '</div>';
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

        await ensureData();

        var selector = document.getElementById('selector-jornada');
        var jornadaActual = selector ? selector.value : null;

        var jornadaNum = null;
        if (modo === 'jornada' && jornadaActual) {
            jornadaNum = parseInt(jornadaActual.split('-')[1].trim());
        }

        var partidos = await getPartidosDescargados(modo === 'jornada' ? jornadaActual : null);

        var jugadores = extraerJugadores(partidos);
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
        partidosCache = null;
        descargadosCache = null;
        var container = document.getElementById('bestxi-container');
        var lista = document.getElementById('lista-resultados');
        if (container) container.style.display = 'none';
        if (lista) lista.style.display = 'block';
        modoActual = null;
        document.querySelectorAll('.menu-bests-btn').forEach(function(b) { b.classList.remove('active'); });
    });

})();

APP.onChange(function() { cargarResultados(); });