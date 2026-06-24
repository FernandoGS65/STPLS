function obtenerParametro(nombre) {

    const params =
        new URLSearchParams(
            window.location.search
        );

    return params.get(nombre);

}

function escHtml(s) {
    if (s == null) return "";
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

var CC3_TO_CC2 = {ESP:"es",GBR:"gb",FRA:"fr",GER:"de",ITA:"it",POR:"pt",BRA:"br",ARG:"ar",URU:"uy",COL:"co",CHI:"cl",VEN:"ve",PAR:"py",PER:"pe",ECU:"ec",BOL:"bo",MEX:"mx",USA:"us",CAN:"ca",CMR:"cm",SEN:"sn",MLI:"ml",GUI:"gn",GHA:"gh",NGA:"ng",COD:"cd",CIV:"ci",MAR:"ma",ALG:"dz",EGY:"eg",TUN:"tn",RSA:"za",GNB:"gw",CPV:"cv",ANG:"ao",EQG:"gq",TOG:"tg",NIG:"ne",KEN:"ke",DOM:"do",HON:"hn",PAN:"pa",CRC:"cr",GEO:"ge",NED:"nl",BEL:"be",SUI:"ch",AUT:"at",SWE:"se",NOR:"no",DEN:"dk",FIN:"fi",POL:"pl",CZE:"cz",SVK:"sk",SVN:"si",CRO:"hr",SRB:"rs",BIH:"ba",MNE:"me",MKD:"mk",ALB:"al",BUL:"bg",ROU:"ro",HUN:"hu",RUS:"ru",UKR:"ua",TUR:"tr",GRE:"gr",ISL:"is",IRL:"ie",ENG:"gb",AUS:"au",NZL:"nz",JPN:"jp",CHN:"cn",KOR:"kr",IND:"in",ISR:"il",LBN:"lb",JOR:"jo",IRQ:"iq",IRN:"ir",KWT:"kw",QAT:"qa",UAE:"ae",KSA:"sa",ARM:"am",AZE:"az",KAZ:"kz",UZB:"uz",TJK:"tj",KGZ:"kg",TKM:"tm",MDA:"md",BLR:"by",LVA:"lv",LTU:"lt",EST:"ee",LUX:"lux",MLT:"mt",CYP:"cy",GUF:"gf",GLP:"gp",NCL:"nc",PYF:"pf",REU:"re",MYT:"yt",ATF:"tf",SPM:"pm",WLF:"wf",COM:"km",SYC:"sc",MUS:"mu",MDG:"mg",MOZ:"mz",ZWE:"zw",ZAM:"zm",MWI:"mw",BWA:"bw",NAM:"nam",LSO:"ls",SWZ:"sz",TZA:"tz",UGA:"ug",RWA:"rw",BDI:"bi",SSD:"ss",SDN:"sd",TCD:"td",CAF:"cf",COG:"cg",GAB:"ga",STP:"st",SLE:"sl",LBR:"lr",GAM:"gm",ERI:"er",DJI:"dj",SOM:"so",BFA:"bf",NER:"ne",GIN:"gn",SAH:"eh",BEN:"bj"};
function countryCodeTo2(cc3) {
    if (!cc3 || cc3.length === 2) return cc3 ? cc3.toLowerCase() : '';
    return CC3_TO_CC2[cc3.toUpperCase()] || cc3.toLowerCase().substring(0,2);
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

        let legendX, legendY;
        if (canvas.dataset.dragging === 'true') {
            legendX = parseFloat(canvas.dataset.legendX) || (W - legendW - 12);
            legendY = parseFloat(canvas.dataset.legendY) || (pad.top + 6);
        } else {
            const avgPos = datos.reduce((sum, d) => {
                const last = d.length ? d[d.length - 1].posicion : 10;
                return sum + last;
            }, 0) / datos.length;

            if (avgPos > 10) {
                legendY = pad.top + 6;
            } else {
                legendY = pad.top + plotH - legendH - 6;
            }
            legendX = W - legendW - 12;
            canvas.dataset.legendX = legendX;
            canvas.dataset.legendY = legendY;
        }

        canvas.dataset.legendW = legendW;
        canvas.dataset.legendH = legendH;

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

function initEvoDrag(canvas) {
    canvas.style.cursor = 'default';
    let dragOrigX, dragOrigY, dragStartX, dragStartY;

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const t = e.touches ? e.touches[0] : e;
        return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }

    function hitLegend(pos) {
        const lx = parseFloat(canvas.dataset.legendX);
        const ly = parseFloat(canvas.dataset.legendY);
        const lw = parseFloat(canvas.dataset.legendW);
        const lh = parseFloat(canvas.dataset.legendH);
        if (isNaN(lx) || isNaN(ly)) return false;
        return pos.x >= lx && pos.x <= lx + lw && pos.y >= ly && pos.y <= ly + lh;
    }

    function onStart(e) {
        const pos = getPos(e);
        if (!hitLegend(pos)) return;
        e.preventDefault();
        canvas.dataset.dragging = 'true';
        dragStartX = pos.x;
        dragStartY = pos.y;
        dragOrigX = parseFloat(canvas.dataset.legendX);
        dragOrigY = parseFloat(canvas.dataset.legendY);
        canvas.style.cursor = 'grabbing';
    }

    function onMove(e) {
        if (canvas.dataset.dragging !== 'true') {
            const pos = getPos(e);
            canvas.style.cursor = hitLegend(pos) ? 'grab' : 'default';
            return;
        }
        e.preventDefault();
        const pos = getPos(e);
        const dx = pos.x - dragStartX;
        const dy = pos.y - dragStartY;
        canvas.dataset.legendX = dragOrigX + dx;
        canvas.dataset.legendY = dragOrigY + dy;
        const evoPrincipal = calcularEvolucion(window._evoDatos, window._evoNombre);
        let nombres = [window._evoNombre];
        let todasSeries = [evoPrincipal];
        let colores = ['#f0c040'];
        if (window._evoComparar) {
            const evoComp = calcularEvolucion(window._evoDatos, window._evoComparar);
            nombres.push(window._evoComparar);
            todasSeries.push(evoComp);
            colores.push('#3b82f6');
        }
        dibujarEvolucion(canvas, todasSeries, colores, nombres);
    }

    function onEnd() {
        if (canvas.dataset.dragging !== 'true') return;
        canvas.dataset.dragging = 'false';
        canvas.style.cursor = 'grab';
    }

    canvas.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    canvas.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
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
        APP.ruta("videos")
    );

const videos =
    await videosRespuesta.json();

    const nombreEquipo =
        obtenerParametro("id");

    const respuesta =
        await fetch(
            APP.ruta("calendario")
        );

    const datos =
        await respuesta.json();

        const respuestaInfo =
    await fetch(
        "./data/equipos-info.json"
    );

const equiposInfo =
    await respuestaInfo.json();

    const descRespuesta =
    await fetch(
        APP.ruta("descargados")
    );

const descargados =
    await descRespuesta.json();

const slugEquipo =
    nombreEquipo.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
        .replace(/ó/g, 'o').replace(/ú/g, 'u')
        .replace(/ñ/g, 'n')
        .replace(/[^a-z0-9-]/g, '');


const matchIdsConDatos =
    new Set(
        descargados.map(
            p => p.id.toString()
        )
    );

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

const ultimos10 = jugados.slice(0, 10);

ultimos10.forEach(
    partido => {

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

        let tipo = "d";
        if ((esLocal && gl > gv) || (!esLocal && gv > gl)) tipo = "v";
        else if (gl === gv) tipo = "e";

        formaReciente += `<span class="forma-pill forma-pill--${tipo}"></span>`;
    }
);

function renderPartidos(lista) {
    let html = "";
    lista.forEach(partido => {
        const local = partido.homeTeam.name;
        const visitante = partido.awayTeam.name;
        const resultado = partido.state?.score?.current || "-";
        const tieneDatos = matchIdsConDatos.has(partido.id.toString());
        const id = partido.id;

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
        ${tieneDatos ? '<svg class="icon-descarga" width="12" height="12" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.2"/><path d="M4.5 7l2 2 3-3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
        ${tieneDatos ? '<a href="partido.html?matchId=' + id + '" class="link-partido resultado-partido">' + resultado + '</a>' : '<strong class="resultado-partido">' + resultado + '</strong>'}
        <span class="equipo-partido">${visitante}</span>
        ${tieneVideo ? '<a href="video.html?id=' + videoId + '" class="link-video"><svg class="icon-video" width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.3"/><path d="M6.5 5.5v5l4-2.5z" fill="currentColor"/></svg></a>' : ''}
    </div>`;
    });
    return html;
}

const htmlJugados = renderPartidos(jugados);
const htmlProximos = renderPartidos(proximos);

document.getElementById(
    "ficha-equipo"
).innerHTML = `

        <div class="equipo-hero">
    <img src="${equipo.logo}" class="equipo-hero-escudo" alt="${equipo.nombre}">
    <div class="equipo-hero-body">
        <h1 class="equipo-hero-nombre">${equipo.nombre}</h1>
        <a href="clasificaciones.html" class="equipo-hero-badge">
            <span class="equipo-hero-pos">${equipo.posicion}º</span>
            <span class="equipo-hero-pts">${equipo.puntos} pts</span>
        </a>
        <div class="equipo-hero-info">
            <span class="equipo-chip">🏟 ${info.estadio} — ${info.capacidad}</span>
            <span class="equipo-chip">📅 ${info.fundacion} · <a href="${info.web}" target="_blank" rel="noopener noreferrer" class="equipo-chip--link">🌐 Web oficial</a></span>
        </div>
    </div>
</div>

<div class="equipo-palmares">
    <div class="palmares-item">
        <strong class="palmares-num">${info.liga}</strong>
        <span class="palmares-label">Liga</span>
    </div>
    <div class="palmares-item">
        <strong class="palmares-num">${info.copaRey}</strong>
        <span class="palmares-label">Copa</span>
    </div>
    <div class="palmares-item">
        <strong class="palmares-num">${info.supercopa}</strong>
        <span class="palmares-label">Supercopa</span>
    </div>
    <div class="palmares-item">
        <strong class="palmares-num">${info.champions}</strong>
        <span class="palmares-label">Champions</span>
    </div>
    ${info.europaLeague > 0 ? `<div class="palmares-item"><strong class="palmares-num">${info.europaLeague}</strong><span class="palmares-label">Europa L.</span></div>` : ''}
    ${info.recopa > 0 ? `<div class="palmares-item"><strong class="palmares-num">${info.recopa}</strong><span class="palmares-label">Recopa</span></div>` : ''}
    ${info.mundialClubes > 0 ? `<div class="palmares-item"><strong class="palmares-num">${info.mundialClubes}</strong><span class="palmares-label">Mundial</span></div>` : ''}
</div>

<div class="forma-reciente">${formaReciente}</div>

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
    <span class="partidos-tab" data-ver="plantilla">Plantilla</span>
    <span class="partidos-tab" data-ver="noticias">Noticias</span>
    <span class="partidos-tab" data-ver="fichajes">Fichajes</span>
    <span class="partidos-tab" data-ver="evolucion">Evolución</span>
</div>

<div class="ultimos-partidos">
    <div class="partidos-lista" id="pl-jugados">${htmlJugados}</div>
    <div class="partidos-lista" id="pl-proximos" style="display:none">${htmlProximos}</div>
    <div class="partidos-lista" id="pl-plantilla" style="display:none"></div>
    <div class="partidos-lista" id="pl-noticias" style="display:none"><p class="tab-placeholder">Próximamente: Noticias</p></div>
    <div class="partidos-lista" id="pl-fichajes" style="display:none"><p class="tab-placeholder">Próximamente: Fichajes</p></div>
    <div class="partidos-lista" id="pl-evolucion" style="display:none">
        <div class="evolucion-container">
            <div class="evolucion-controls">
                <select id="evo-select" class="evolucion-select"><option value="">-- Comparar con --</option></select>
            </div>
            <div class="evolucion-grafico"><canvas id="evo-canvas"></canvas></div>
        </div>
    </div>
</div>

        `;

    const tabsEl = document.querySelector('.partidos-tabs');
    if (tabsEl) {
        const navH = document.querySelector('.navbar')?.offsetHeight || 0;
        tabsEl.style.top = navH + 'px';
    }

    tabsEl?.addEventListener('click', function(e) {
        const tab = e.target.closest('.partidos-tab');
        if (!tab) return;
        document.querySelectorAll('.partidos-tab').forEach(t => t.classList.remove('partidos-tab--active'));
        tab.classList.add('partidos-tab--active');
        const ver = tab.dataset.ver;
        document.getElementById('pl-jugados').style.display = ver === 'jugados' ? '' : 'none';
        document.getElementById('pl-proximos').style.display = ver === 'proximos' ? '' : 'none';
        document.getElementById('pl-plantilla').style.display = ver === 'plantilla' ? '' : 'none';
        document.getElementById('pl-noticias').style.display = ver === 'noticias' ? '' : 'none';
        document.getElementById('pl-fichajes').style.display = ver === 'fichajes' ? '' : 'none';
        document.getElementById('pl-evolucion').style.display = ver === 'evolucion' ? '' : 'none';

        if (ver === 'noticias') {
            cargarNoticias();
        }
        if (ver === 'fichajes') {
            cargarFichajes();
        }
        if (ver === 'plantilla') {
            cargarPlantilla(nombreEquipo);
        }
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
        window._evoDatos = datos.data;
        window._evoNombre = nombreEquipo;
        window._evoComparar = equipoComparar;

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

        if (!canvas.dataset.dragInit) {
            canvas.dataset.dragInit = 'true';
            initEvoDrag(canvas);
        }
    }

    window.addEventListener('resize', () => {
        const el = document.getElementById('pl-evolucion');
        if (el && el.style.display !== 'none') pintarEvo();
    });

    function normalizarEquipoRSS(nombre) {
        var map = {
            'alaves': ['alavés', 'alaves'],
            'athletic club': ['athletic', 'bilbao', 'athletic club'],
            'atlético madrid': ['atlético', 'atletico', 'colchonero'],
            'barcelona': ['barcelona', 'barça', 'fc barcelona', 'blaugrana'],
            'celta de vigo': ['celta', 'céltico'],
            'elche': ['elche'],
            'espanyol': ['espanyol'],
            'getafe': ['getafe'],
            'girona': ['girona'],
            'levante': ['levante'],
            'mallorca': ['mallorca'],
            'osasuna': ['osasuna'],
            'oviedo': ['oviedo'],
            'rayo vallecano': ['rayo', 'vallecano'],
            'real betis': ['betis', 'real betis', 'bétic', 'verdiblanco'],
            'real madrid': ['madrid', 'real madrid', 'merengue'],
            'real sociedad': ['sociedad', 'real sociedad', 'txuri'],
            'sevilla fc': ['sevilla', 'sevillista', 'nervión'],
            'valencia': ['valencia', 'ché'],
            'villarreal': ['villarreal', 'submarino']
        };
        var key = nombre.toLowerCase().trim();
        return map[key] || [key];
    }

    function noticiaCoincideEquipo(titulo, nombreEquipo) {
        var t = titulo.toLowerCase();
        var palabras = normalizarEquipoRSS(nombreEquipo);
        for (var i = 0; i < palabras.length; i++) {
            if (t.indexOf(palabras[i]) !== -1) return true;
        }
        return false;
    }

    async function cargarNoticias() {
        var container = document.getElementById('pl-noticias');
        if (!container) return;
        container.innerHTML = '<p class="tab-placeholder">Cargando noticias...</p>';

        var corte = new Date();
        corte.setDate(corte.getDate() - 3);
        var feeds = [
            { url: 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent('https://e00-marca.uecdn.es/rss/futbol/primera-division.xml'), fuente: 'MARCA' },
            { url: 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent('https://www.sport.es/es/rss/futbol/rss.xml'), fuente: 'SPORT' }
        ];

        var todas = [];
        for (var f = 0; f < feeds.length; f++) {
            try {
                var resp = await fetch(feeds[f].url);
                var data = await resp.json();
                if (data.status !== 'ok') continue;
                for (var i = 0; i < data.items.length; i++) {
                    var item = data.items[i];
                    var fechaPub = new Date(item.pubDate);
                    if (fechaPub < corte) continue;
                    if (!noticiaCoincideEquipo(item.title, nombreEquipo)) continue;
                    var dia = fechaPub.toDateString();
                    var imagen = item.enclosure && item.enclosure.link ? item.enclosure.link : (item.thumbnail || '');
                    if (!imagen && item.content) {
                        var m = item.content.match(/src=["']([^"']+)["']/);
                        if (m) imagen = m[1];
                    }
                    todas.push({
                        titulo: item.title,
                        fecha: fechaPub,
                        fechaStr: fechaPub.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
                        url: item.link,
                        imagen: imagen,
                        fuente: feeds[f].fuente,
                        dia: dia
                    });
                }
            } catch(e) {}
        }

        var dias = {};
        todas.forEach(function(n) {
            if (!dias[n.dia]) dias[n.dia] = [];
            dias[n.dia].push(n);
        });

        var seleccion = [];
        var keys = Object.keys(dias).sort().reverse();
        keys.forEach(function(d) {
            var delDia = dias[d].sort(function(a, b) { return b.fecha - a.fecha; });
            delDia.slice(0, 5).forEach(function(n) { seleccion.push(n); });
        });
        seleccion.sort(function(a, b) { return b.fecha - a.fecha; });
        seleccion = seleccion.slice(0, 15);

        if (!seleccion.length) {
            container.innerHTML = '<p class="tab-placeholder">No hay noticias recientes de ' + escHtml(nombreEquipo) + '</p>';
            return;
        }

        var html = '<div class="noticias-list">';
        for (var i = 0; i < seleccion.length; i++) {
            var n = seleccion[i];
            html += '<article class="noticia-card">';
            if (n.imagen) {
                html += '<div class="noticia-img" style="background-image:url(' + n.imagen + ')"><span class="noticia-fuente-badge">' + n.fuente + '</span></div>';
            }
            html += '<div class="noticia-body">';
            if (!n.imagen) {
                html += '<span class="noticia-fuente">' + n.fuente + '</span>';
            }
            html += '<h3 class="noticia-titulo">' + escHtml(n.titulo) + '</h3>';
            html += '<div class="noticia-footer">';
            html += '<span class="noticia-fecha">' + n.fechaStr + '</span>';
            if (n.url) {
                html += '<a href="' + n.url + '" target="_blank" rel="noopener noreferrer" class="noticia-link">Leer más →</a>';
            }
            html += '</div></div></article>';
        }
        html += '</div>';
        container.innerHTML = html;
    }

    async function cargarFichajes() {
        var container = document.getElementById('pl-fichajes');
        if (!container) return;
        if (container.querySelector('.fichajes-list')) return;
        container.innerHTML = '<p class="tab-placeholder">Cargando fichajes...</p>';

        try {
            var resp = await fetch('./data/fichajes.json');
            var data = await resp.json();
            var fichajes = data[slugEquipo];
            if (!fichajes || fichajes.length === 0) {
                container.innerHTML = '<p class="tab-placeholder">No hay fichajes registrados para este equipo</p>';
                return;
            }
            var html = '<div class="fichajes-list">';
            var llegadas = fichajes.filter(function(f) { return f.tipo === 'llegada'; });
            var salidas = fichajes.filter(function(f) { return f.tipo === 'salida'; });
            if (llegadas.length > 0) {
                html += '<div class="fichajes-section-label">Llegadas</div>';
                for (var i = 0; i < llegadas.length; i++) {
                    html += renderFichaje(llegadas[i], 'llegada');
                }
            }
            if (salidas.length > 0) {
                html += '<div class="fichajes-section-label">Salidas</div>';
                for (var i = 0; i < salidas.length; i++) {
                    html += renderFichaje(salidas[i], 'salida');
                }
            }
            html += '</div>';
            container.innerHTML = html;
        } catch(e) {
            container.innerHTML = '<p class="tab-placeholder">Error al cargar fichajes</p>';
        }
    }

    var plantillaCache = null;

    async function cargarPlantilla(teamName) {
        var container = document.getElementById('pl-plantilla');
        if (!container) return;
        if (plantillaCache) {
            renderPlantilla(plantillaCache, teamName, container);
            return;
        }
        container.innerHTML = '<p class="tab-placeholder">Cargando plantilla...</p>';

        try {
            var resp = await fetch(APP.ruta('plantilla'));
            var data = await resp.json();
            plantillaCache = data;
            renderPlantilla(data, teamName, container);
        } catch(e) {
            container.innerHTML = '<p class="tab-placeholder">Plantilla no disponible</p>';
        }
    }

    function renderPlantilla(data, teamName, container) {
        var team = data[teamName];
        if (!team || !team.players || !team.players.length) {
            container.innerHTML = '<p class="tab-placeholder">No hay datos de plantilla para este equipo</p>';
            return;
        }

        var posLabels = {
            Goalkeeper: 'Porteros',
            Defender: 'Defensas',
            Midfielder: 'Mediocampistas',
            Forward: 'Delanteros'
        };
        var posIcons = {
            Goalkeeper: '\uD83D\uDDF3',
            Defender: '\uD83D\uDEE1',
            Midfielder: '\u2B50',
            Forward: '\u26BD'
        };
        var posOrder = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];

        var grouped = {};
        posOrder.forEach(function(p) { grouped[p] = []; });
        team.players.forEach(function(p) {
            if (grouped[p.position]) grouped[p.position].push(p);
        });

        var html = '<div class="squad-card">';
        html += '<div class="squad-header">';
        if (team.logo) html += '<img src="' + escHtml(team.logo) + '" class="squad-logo" onerror="this.style.display=\'none\'">';
        html += '<h3 class="squad-team-name">' + escHtml(teamName) + '</h3>';
        html += '<span class="squad-count">' + team.players.length + ' jugadores convocados</span>';
        html += '</div>';

        posOrder.forEach(function(pos) {
            var players = grouped[pos];
            if (!players.length) return;
            html += '<div class="squad-section">';
            html += '<div class="squad-section-header">';
            html += '<span class="squad-section-icon">' + (posIcons[pos] || '') + '</span>';
            html += '<span class="squad-section-title">' + (posLabels[pos] || pos) + '</span>';
            html += '<span class="squad-section-count">' + players.length + '</span>';
            html += '</div>';
            html += '<div class="squad-grid">';
            players.forEach(function(p) {
                var fotoUrl = p.fotMobId ? 'https://images.fotmob.com/image_resources/playerimages/' + p.fotMobId + '.png' : '';
                html += '<div class="squad-player pos-' + p.position + '">';
                if (fotoUrl) {
                    html += '<img class="squad-player-photo" src="' + escHtml(fotoUrl) + '" alt="' + escHtml(p.name) + '" loading="lazy" onerror="this.style.display=\'none\'">';
                }
                html += '<div class="squad-player-num-wrap">';
                html += '<div class="squad-player-num">' + (p.number || '-') + '</div>';
                if (p.countryCode) {
                    var cc2 = countryCodeTo2(p.countryCode);
                    if (cc2) {
                        html += '<img class="squad-player-flag" src="https://flagcdn.com/w40/' + cc2 + '.png" alt="' + escHtml(p.nationality || '') + '" loading="lazy" title="' + escHtml(p.nationality || '') + '">';
                    }
                }
                html += '</div>';
                html += '<div class="squad-player-info">';
                html += '<div class="squad-player-name">' + escHtml(p.name) + '</div>';
                html += '<div class="squad-player-meta">';
                var starts = p.starts || 0;
                var subs = p.subs || 0;
                var total = starts + subs;
                if (total > 0) {
                    html += starts + 'T ' + subs + 'S';
                } else {
                    html += p.appearances + ' partidos';
                }
                html += '</div>';
                var goals = p.goals || 0;
                var yellows = p.yellowCards || 0;
                var reds = p.redCards || 0;
                if (goals > 0 || yellows > 0 || reds > 0) {
                    html += '<div class="squad-player-stats">';
                    if (goals > 0) html += '<span class="squad-stat squad-stat--goal">\u26BD ' + goals + '</span>';
                    if (yellows > 0) html += '<span class="squad-stat squad-stat--yellow">\uD83D\uDFE1 ' + yellows + '</span>';
                    if (reds > 0) html += '<span class="squad-stat squad-stat--red">\uD83D\uDD34 ' + reds + '</span>';
                    html += '</div>';
                }
                html += '</div>';
                html += '</div>';
            });
            html += '</div>';
            html += '</div>';
        });

        html += '</div>';

        html += '<div class="squad-alineacion-link"><a href="#" id="btn-alineacion-habitual">\u26BD Alineaci\u00f3n habitual</a></div>';

        container.innerHTML = html;

        document.getElementById('btn-alineacion-habitual')?.addEventListener('click', function(e) {
            e.preventDefault();
            renderAlineacion(team, teamName, container);
        });
    }

    function seleccionarTitular(team, position, count) {
        var candidates = team.players.filter(function(p) { return p.position === position; });
        candidates.sort(function(a, b) {
            var sa = a.starts || 0;
            var sb = b.starts || 0;
            if (sb !== sa) return sb - sa;
            var ga = a.goals || 0;
            var gb = b.goals || 0;
            if (gb !== ga) return gb - ga;
            var ya = a.yellowCards || 0;
            var yb = b.yellowCards || 0;
            return ya - yb;
        });
        return candidates.slice(0, count);
    }

    function renderAlineacion(team, teamName, container) {
        var gk = seleccionarTitular(team, 'Goalkeeper', 1);
        var def = seleccionarTitular(team, 'Defender', 4);
        var mid = seleccionarTitular(team, 'Midfielder', 3);
        var fwd = seleccionarTitular(team, 'Forward', 3);
        var xi = [].concat(gk, def, mid, fwd);

        function playerNode(p, idx) {
            var fotoUrl = p.fotMobId ? 'https://images.fotmob.com/image_resources/playerimages/' + p.fotMobId + '.png' : '';
            var h = '<div class="pitch-player pos-' + p.position + '">';
            if (fotoUrl) {
                h += '<img class="pitch-player-photo" src="' + escHtml(fotoUrl) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">';
            }
            h += '<span class="pitch-player-num">' + (p.number || '') + '</span>';
            h += '<span class="pitch-player-name">' + escHtml(p.name.split(' ').pop()) + '</span>';
            h += '</div>';
            return h;
        }

        var rows = [
            { label: '', players: gk },
            { label: '', players: def },
            { label: '', players: mid },
            { label: '', players: fwd }
        ];

        var html = '<div class="pitch-container">';
        html += '<div class="pitch">';
        html += '<div class="pitch-lines">';
        html += '<div class="pitch-center-circle"></div>';
        html += '<div class="pitch-center-line"></div>';
        html += '<div class="pitch-area-top"></div>';
        html += '<div class="pitch-area-bottom"></div>';
        html += '</div>';
        html += '<div class="pitch-formation">';

        rows.forEach(function(row) {
            html += '<div class="pitch-row">';
            row.players.forEach(function(p, i) {
                html += playerNode(p, i);
            });
            html += '</div>';
        });

        html += '</div>';
        html += '</div>';
        html += '<div class="pitch-back"><a href="#" id="btn-volver-plantilla">\u2190 Volver a la plantilla</a></div>';
        html += '</div>';

        container.innerHTML = html;

        document.getElementById('btn-volver-plantilla')?.addEventListener('click', function(e) {
            e.preventDefault();
            renderPlantilla({ [teamName]: team }, teamName, container);
        });
    }

    function renderFichaje(f, tipo) {
        var icono = tipo === 'llegada' ? '⬇' : '⬆';
        var precioClass = 'fichaje-precio--pago';
        var precioLabel = f.precio;
        if (f.precio.toLowerCase().indexOf('cesión') !== -1 || f.precio.toLowerCase().indexOf('cesion') !== -1) {
            precioClass = 'fichaje-precio--cesion';
        } else if (f.precio.toLowerCase().indexOf('libre') !== -1) {
            precioClass = 'fichaje-precio--libre';
        }
        var clubLabel = tipo === 'llegada' ? 'Procede de: ' : 'Destino: ';
        return '<div class="fichaje-item">'
            + '<div class="fichaje-icon fichaje-icon--' + tipo + '">' + icono + '</div>'
            + '<div class="fichaje-body">'
            + '<div class="fichaje-jugador">' + escHtml(f.jugador) + '</div>'
            + '<div class="fichaje-detalle">' + clubLabel + escHtml(f.club) + ' · ' + f.fecha + '</div>'
            + '</div>'
            + '<div class="fichaje-precio ' + precioClass + '">' + escHtml(precioLabel) + '</div>'
            + '</div>';
    }

}

APP.onChange(function() { cargarEquipo(); });