function obtenerParametro(nombre) {

    const params =
        new URLSearchParams(
            window.location.search
        );

    return params.get(nombre);

}

function calcularClasificacion(partidos) {

    const tabla = {};

    partidos.forEach(partido => {

        if (
            !partido.state ||
            !partido.state.score ||
            !partido.state.score.current
        ) return;

        const local =
            partido.homeTeam.name;

        const visitante =
            partido.awayTeam.name;

        const marcador =
            partido.state.score.current
                .split("-")
                .map(x =>
                    parseInt(x.trim())
                );

        const gl = marcador[0];
        const gv = marcador[1];

        if (!tabla[local]) {

            tabla[local] = {

                nombre: local,

                logo:
                    partido.homeTeam.logo,

                puntos: 0,

                pj: 0,
                pg: 0,
                pe: 0,
                pp: 0,

                gf: 0,
                gc: 0

            };

        }

        if (!tabla[visitante]) {

            tabla[visitante] = {

                nombre: visitante,

                logo:
                    partido.awayTeam.logo,

                puntos: 0,

                pj: 0,
                pg: 0,
                pe: 0,
                pp: 0,

                gf: 0,
                gc: 0

            };

        }

        tabla[local].pj++;
        tabla[visitante].pj++;

        tabla[local].gf += gl;
        tabla[local].gc += gv;

        tabla[visitante].gf += gv;
        tabla[visitante].gc += gl;

        if (gl > gv) {

            tabla[local].puntos += 3;

            tabla[local].pg++;
            tabla[visitante].pp++;

        }

        else if (gv > gl) {

            tabla[visitante].puntos += 3;

            tabla[visitante].pg++;
            tabla[local].pp++;

        }

        else {

            tabla[local].puntos++;
            tabla[visitante].puntos++;

            tabla[local].pe++;
            tabla[visitante].pe++;

        }

    });

    const clasificacion =
        Object.values(tabla);

    clasificacion.sort((a,b)=>{

        if (
            b.puntos !== a.puntos
        ) {

            return (
                b.puntos - a.puntos
            );

        }

        return (
            (b.gf - b.gc) -
            (a.gf - a.gc)
        );

    });

    clasificacion.forEach(
        (equipo,index)=>{

            equipo.posicion =
                index + 1;

        }
    );

    return clasificacion;

}
function calcularEvolucion(todosPartidos, nombreEquipo) {
    const evo = [];
    for (let j = 1; j <= 38; j++) {
        const filtrados = todosPartidos.filter(p => {
            const jn = parseInt(p.round.split("-")[1].trim());
            return jn <= j;
        });
        const clasif = calcularClasificacion(filtrados);
        const eq = clasif.find(e => e.nombre === nombreEquipo);
        if (eq) evo.push({ jornada: j, posicion: eq.posicion });
    }
    return evo;
}

function dibujarEvolucion(canvas, datos, colores, nombres) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    const pad = { top: 16, right: 16, bottom: 28, left: 32 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;

    ctx.clearRect(0, 0, W, H);

    const getX = j => pad.left + (j - 1) / 37 * plotW;
    const getY = p => pad.top + (p - 1) / 19 * plotH;

    const cs = getComputedStyle(document.documentElement);

    // Grid
    ctx.strokeStyle = cs.getPropertyValue('--border-color').trim() || '#252d42';
    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 20; i += 2) {
        const y = getY(i);
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    }

    // Y-axis labels
    ctx.fillStyle = cs.getPropertyValue('--text-muted').trim() || '#5a6478';
    ctx.font = '10px Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 1; i <= 20; i += 2) {
        ctx.fillText(i, pad.left - 6, getY(i));
    }

    // X-axis labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let j = 1; j <= 38; j += 4) {
        ctx.fillText(j, getX(j), H - pad.bottom + 6);
    }

    // Axes labels
    ctx.fillStyle = cs.getPropertyValue('--text-secondary').trim() || '#8b95a8';
    ctx.font = '10px Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Jornada', pad.left + plotW / 2, H - pad.bottom + 20);
    ctx.save();
    ctx.translate(10, pad.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Posición', 0, 0);
    ctx.restore();

    // Draw lines
    datos.forEach((d, di) => {
        if (d.length < 2) return;
        ctx.strokeStyle = colores[di % colores.length];
        ctx.lineWidth = di === 0 ? 3 : 2;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        d.forEach((p, i) => {
            const x = getX(p.jornada);
            const y = getY(p.posicion);
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
    });

    // Legend
    if (nombres && nombres.length > 0) {
        const legendPad = 10;
        const legendItemH = 18;
        const legendW = 140;
        const legendH = nombres.length * legendItemH + legendPad * 2;
        const legendX = W - legendW - 12;
        const legendY = pad.top + 6;

        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.roundRect ? ctx.roundRect(legendX, legendY, legendW, legendH, 6) : ctx.rect(legendX, legendY, legendW, legendH);
        ctx.fill();

        ctx.font = '12px Segoe UI, Arial, sans-serif';
        ctx.textBaseline = 'middle';

        nombres.forEach((n, i) => {
            const ly = legendY + legendPad + i * legendItemH + legendItemH / 2;
            ctx.fillStyle = colores[i % colores.length];
            ctx.fillRect(legendX + 10, ly - 4, 12, 8);
            ctx.fillStyle = '#e8edf5';
            ctx.textAlign = 'left';
            ctx.fillText(n, legendX + 28, ly + 1);
        });
    }
}

function obtenerPartidosEquipo(
    partidos,
    nombreEquipo
) {

    const filtrados =
        partidos.filter(partido =>
            partido.homeTeam.name === nombreEquipo ||
            partido.awayTeam.name === nombreEquipo
        );

    filtrados.sort((a,b)=>
        new Date(b.date) -
        new Date(a.date)
    );

    return filtrados;

}

async function cargarEquipo() {


    const videosRespuesta =
    await fetch(
        "./data/videos.json"
    );

const videos =
    await videosRespuesta.json();

    const nombreEquipo =
        obtenerParametro("id");

    const respuesta =
        await fetch(
            "./data/laliga2025.json"
        );

    const datos =
        await respuesta.json();

        const respuestaInfo =
    await fetch(
        "./data/equipos-info.json"
    );

const equiposInfo =
    await respuestaInfo.json();

    const clasificacion =
        calcularClasificacion(
            datos.data
        );

    const equipo =
        clasificacion.find(
            e =>
            e.nombre === nombreEquipo
        );
const info =
    equiposInfo[nombreEquipo] || {};

    if (!equipo) {

        document.getElementById(
            "ficha-equipo"
        ).innerHTML =
            "<p>Equipo no encontrado</p>";

        return;

    }

    const dg =
        equipo.gf - equipo.gc;

        const todosPartidos =
    obtenerPartidosEquipo(
        datos.data,
        nombreEquipo
    );

    const jugados = [];
    const proximos = [];

    todosPartidos.forEach(partido => {
        if (
            partido.state &&
            partido.state.score &&
            partido.state.score.current
        ) {
            jugados.push(partido);
        } else {
            proximos.push(partido);
        }
    });

    let formaReciente = "";

jugados.forEach(
    partido => {

        if (
            !partido.state ||
            !partido.state.score ||
            !partido.state.score.current
        ) return;

        const marcador =
            partido.state.score.current
                .split("-")
                .map(x =>
                    parseInt(x.trim())
                );

        const gl = marcador[0];
        const gv = marcador[1];

        const esLocal =
            partido.homeTeam.name === nombreEquipo;

        if (
            (esLocal && gl > gv) ||
            (!esLocal && gv > gl)
        ) {

            formaReciente +=
                '<span class="forma-v">🟢</span>';

        }

        else if (gl === gv) {

            formaReciente +=
                '<span class="forma-e">🟡</span>';

        }

        else {

            formaReciente +=
                '<span class="forma-d">🔴</span>';

        }

    }
);

function renderPartidos(lista, conVideo) {
    let html = "";
    lista.forEach(partido => {
        const local = partido.homeTeam.name;
        const visitante = partido.awayTeam.name;
        const resultado = partido.state?.score?.current || "-";

        let icono = "⚪";
        if (partido.state && partido.state.score && partido.state.score.current) {
            const marcador = partido.state.score.current.split("-").map(x => parseInt(x.trim()));
            const gl = marcador[0];
            const gv = marcador[1];
            const esLocal = local === nombreEquipo;
            if ((esLocal && gl > gv) || (!esLocal && gv > gl)) icono = "🟢";
            else if (gl === gv) icono = "🟡";
            else icono = "🔴";
        }

        const jornada = partido.round.split("-")[1].trim();
        const normalizarEquipo = nombre =>
            nombre.replaceAll(" ","").replaceAll("á","a").replaceAll("é","e").replaceAll("í","i").replaceAll("ó","o").replaceAll("ú","u");
        const videoId = `LL-J${jornada.padStart(2,"0")}-${normalizarEquipo(local)}-${normalizarEquipo(visitante)}`;
        const tieneVideo = videos[videoId];

        html += `
    <div class="partido-reciente">
        <span class="forma">${icono}</span>
        <span class="jornada-partido">J${jornada}</span>
        <span class="equipo-partido">${local}</span>
        <strong class="resultado-partido">${resultado}</strong>
        <span class="equipo-partido">${visitante}</span>
        ${tieneVideo ? `<a href="video.html?id=${videoId}" class="link-video">🎥</a>` : ""}
    </div>`;
    });
    return html;
}

const htmlJugados = renderPartidos(jugados);
const htmlProximos = renderPartidos(proximos);

document.getElementById(
    "ficha-equipo"
).innerHTML = `

        <div class="ficha-equipo">

            <div class="cabecera-equipo">

    <img
        src="${equipo.logo}"
        class="escudo-ficha">

    <div class="datos-principales">

        <h2>
            ${equipo.nombre}
        </h2>

        <div class="dato-club">

    🏟 ${info.estadio}

    (${info.capacidad.toLocaleString('es-ES')})

</div>

    
        <div class="dato-club">
            📅 ${info.fundacion}
        </div>

        <div class="dato-club">

    ⚽ ${info.temporadasPrimera} temporadas

    &nbsp;&nbsp;·&nbsp;&nbsp;

    <a
        href="${info.web}"
        target="_blank"
        rel="noopener noreferrer"
        class="web-oficial">

        🌐 Web oficial

    </a>

</div>

    

</a>
        <div class="palmares-equipo">





</div>

    </div>

</div>

</div>

<div class="palmares-equipo">

    <div class="titulo-item">
        🏆 La Liga
        <strong>${info.liga}</strong>
    </div>

    <div class="titulo-item">
        🏆 Copa
        <strong>${info.copaRey}</strong>
    </div>

    <div class="titulo-item">
        🏅 Supercopa
        <strong>${info.supercopa}</strong>
    </div>

    <div class="titulo-item">
        ⭐ Champions
        <strong>${info.champions}</strong>
    </div>

</div>



</div>
            <div class="forma-reciente">

    ${formaReciente}

</div>

            <div class="resumen-equipo">

    <span>

        🏅 ${equipo.posicion}º ·
        ${equipo.puntos} puntos

    </span>

    <span>

        PJ: ${equipo.pj}

    </span>

</div>

            <div class="stats-equipo">

                <div>PG<br>${equipo.pg}</div>
                <div>PE<br>${equipo.pe}</div>
                <div>PP<br>${equipo.pp}</div>

                <div>GF<br>${equipo.gf}</div>
                <div>GC<br>${equipo.gc}</div>
                <div>DG<br>${dg}</div>

            </div>
            <div class="partidos-tabs">
    <span class="partidos-tab partidos-tab--active" data-ver="jugados">Jugados</span>
    <span class="partidos-tab" data-ver="proximos">Próximos</span>
    <span class="partidos-tab" data-ver="evolucion">Evolución</span>
</div>

<div class="ultimos-partidos">
    <div class="partidos-lista" id="pl-jugados">${htmlJugados}</div>
    <div class="partidos-lista" id="pl-proximos" style="display:none">${htmlProximos}</div>
    <div class="partidos-lista" id="pl-evolucion" style="display:none">
        <div class="evolucion-container">
            <div class="evolucion-controls">
                <select id="evo-select" class="evolucion-select"><option value="">-- Comparar con --</option></select>
            </div>
            <div class="evolucion-grafico"><canvas id="evo-canvas"></canvas></div>
        </div>
    </div>
</div>

        </div>

    `;

    document.querySelector('.partidos-tabs')?.addEventListener('click', function(e) {
        const tab = e.target.closest('.partidos-tab');
        if (!tab) return;
        document.querySelectorAll('.partidos-tab').forEach(t => t.classList.remove('partidos-tab--active'));
        tab.classList.add('partidos-tab--active');
        const ver = tab.dataset.ver;
        document.getElementById('pl-jugados').style.display = ver === 'jugados' ? '' : 'none';
        document.getElementById('pl-proximos').style.display = ver === 'proximos' ? '' : 'none';
        document.getElementById('pl-evolucion').style.display = ver === 'evolucion' ? '' : 'none';

        if (ver === 'evolucion') {
            const sel = document.getElementById('evo-select');
            if (sel.options.length <= 1) {
                const equipos = [...new Set(datos.data.map(p => p.homeTeam.name))].sort();
                equipos.forEach(n => {
                    if (n !== nombreEquipo) {
                        const opt = document.createElement('option');
                        opt.value = n;
                        opt.textContent = n;
                        sel.appendChild(opt);
                    }
                });
            }
            pintarEvo();
        }
    });

    let equipoComparar = "";

    document.getElementById('evo-select')?.addEventListener('change', function() {
        equipoComparar = this.value;
        pintarEvo();
    });

    function pintarEvo() {
        const canvas = document.getElementById('evo-canvas');
        const evoPrincipal = calcularEvolucion(datos.data, nombreEquipo);
        let nombres = [nombreEquipo];
        let todasSeries = [evoPrincipal];
        let colores = ['#f0c040'];

        if (equipoComparar) {
            const evoComp = calcularEvolucion(datos.data, equipoComparar);
            nombres.push(equipoComparar);
            todasSeries.push(evoComp);
            colores.push('#3b82f6');
        }

        const cont = canvas.parentElement;
        if (cont) {
            canvas.style.width = cont.clientWidth + 'px';
            canvas.style.height = Math.min(cont.clientWidth * 0.5, 320) + 'px';
        }

        dibujarEvolucion(canvas, todasSeries, colores, nombres);
    }

    window.addEventListener('resize', () => {
        const el = document.getElementById('pl-evolucion');
        if (el && el.style.display !== 'none') pintarEvo();
    });

}

cargarEquipo();