function matchesFromSupabase(matches) {
    var isPremier = APP.getState().competition === 'premier';
    return matches.map(function(m) {
        return {
            id: m.id,
            round: m.round,
            date: m.date,
            country: { code: isPremier ? 'GB-ENG' : 'ES', name: isPremier ? 'England' : 'Spain', logo: '' },
            state: {
                clock: null,
                score: {
                    current: m.home_score != null ? m.home_score + '-' + m.away_score : null,
                    penalties: null
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
            },
            league: { id: isPremier ? 33973 : 119924, name: isPremier ? 'Premier League' : 'La Liga', season: 2026 }
        };
    });
}

function plantillaFromSupabase(teamName, players) {
    return {
        [teamName]: {
            logo: players.length && players[0].team ? players[0].team.logo_url : '',
            players: players.map(function(p) {
                var s = p.stats || {};
                return {
                    id: p.id,
                    name: p.name,
                    position: p.position,
                    shirtNumber: p.shirt_number,
                    number: p.shirt_number,
                    age: p.age,
                    nationality: p.nationality,
                    countryCode: p.country_code || p.countryCode || '',
                    photo: p.photo_url,
                    fotMobId: p.fotmob_id,
                    stats: s,
                    starts: s.starts || 0,
                    subs: s.subs || 0,
                    appearances: s.appearances || 0,
                    goals: s.goals || 0,
                    yellowCards: s.yellowCards || 0,
                    redCards: s.redCards || 0
                };
            })
        }
    };
}

function newsFromSupabase(items) {
    return items.map(function(n) {
        return {
            titulo: n.title,
            title: n.title,
            resumen: n.summary,
            summary: n.summary,
            url: n.url,
            imagen: n.image_url,
            image: n.image_url,
            fuente: n.source,
            source: n.source,
            fecha: n.published_at
        };
    });
}

function arbitrosFromSupabase(rows) {
    return rows.map(function(r) {
        return {
            id: r.id,
            Nombre: r.name,
            Colegio: r.college,
            Internacional: r.international ? 1 : 0,
            FechaNacim: r.birth_date,
            FechaPrimera: r.first_date,
            Foto: r.photo_url
        };
    });
}

function transfersFromSupabase(teamName, items) {
    const result = {};
    result[teamName] = items.map(function(t) {
        return {
            nombre: t.player_name,
            player_name: t.player_name,
            jugador: t.player_name,
            tipo: t.type,
            desde: t.from_team,
            from_team: t.from_team,
            hacia: t.to_team,
            to_team: t.to_team,
            club: t.type === 'llegada' ? t.from_team : t.to_team,
            precio: '-',
            fecha: t.date
        };
    });
    return result;
}

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

        const local =
            partido.homeTeam.name;

        const visitante =
            partido.awayTeam.name;

        if (!tabla[local]) {

            tabla[local] = {

                nombre: local,

                logo:
                    APP.fixLogo(partido.homeTeam.logo),

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
                    APP.fixLogo(partido.awayTeam.logo),

                puntos: 0,

                pj: 0,
                pg: 0,
                pe: 0,
                pp: 0,

                gf: 0,
                gc: 0

            };

        }

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
    const tienePartidos = todosPartidos.some(p =>
        p.state && p.state.score && p.state.score.current
    );
    if (!tienePartidos) return evo;
    for (let j = 1; j <= 38; j++) {
        const filtrados = todosPartidos.filter(p => {
            const jn = parseInt(p.round.split("-")[1].trim());
            return jn <= j;
        });
        const clasif = calcularClasificacion(filtrados);
        const eq = clasif.find(e => e.nombre === nombreEquipo);
        if (eq && eq.pj > 0) evo.push({ jornada: j, posicion: eq.posicion });
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

    const nombreEquipo = obtenerParametro("id");
    let datos = { data: [] };
    let videos = {};
    let matchIdsConDatos = new Set();
    let useSupabase = false;
    let supabaseTeamId = null;
    let supabasePlayers = [];

    if (window.STPLS_API && window.STPLS_API.fetchMatches) {
        try {
            const allMatches = await window.STPLS_API.fetchMatches();
            if (allMatches && allMatches.length > 0) {
                datos.data = matchesFromSupabase(allMatches);
                videos = await window.STPLS_API.fetchVideos();
                matchIdsConDatos = new Set(datos.data.map(p => p.id.toString()));
                useSupabase = true;
                const teamMatch = allMatches.find(m =>
                    (m.home_team && m.home_team.name === nombreEquipo) ||
                    (m.away_team && m.away_team.name === nombreEquipo)
                );
                if (teamMatch) {
                    supabaseTeamId = teamMatch.home_team.name === nombreEquipo
                        ? teamMatch.home_team.id
                        : teamMatch.away_team.id;
                    supabasePlayers = await window.STPLS_API.fetchPlayers({ team_id: supabaseTeamId });
                }
            }
        } catch (e) {
            console.warn('Supabase fetch failed, falling back to JSON', e);
        }
    }

    if (!useSupabase) {
        const videosRespuesta = await fetch(APP.ruta("videos"));
        videos = await videosRespuesta.json();

        const respuesta = await fetch(APP.ruta("calendario"));
        datos = await respuesta.json();

        const descRespuesta = await fetch(APP.ruta("descargados"));
        const descargados = await descRespuesta.json();
        matchIdsConDatos = new Set(descargados.map(p => p.id.toString()));
    }

    let info = {};
    if (useSupabase && window.STPLS_API && window.STPLS_API.fetchTeamInfo) {
        try {
            info = await window.STPLS_API.fetchTeamInfo(nombreEquipo) || {};
        } catch (e) {
            console.warn('fetchTeamInfo failed', e);
        }
    }
    if (!info || !info.estadio) {
        try {
            const respuestaInfo = await fetch("./data/equipos-info.json");
            const equiposInfo = await respuestaInfo.json();
            info = equiposInfo[nombreEquipo] || {};
        } catch (e) {
            info = {};
        }
    }

    const slugEquipo =
        nombreEquipo.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
            .replace(/ó/g, 'o').replace(/ú/g, 'u')
            .replace(/ñ/g, 'n')
            .replace(/[^a-z0-9-]/g, '');

    const clasificacion =
        calcularClasificacion(
            datos.data
        );

    const equipo =
        clasificacion.find(
            e =>
            e.nombre === nombreEquipo
        );

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

    proximos.sort((a, b) =>
        new Date(a.date) - new Date(b.date)
    );

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
        const tieneDatos = matchIdsConDatos.has(partido.id.toString());
        const id = partido.id;

        let resultado;
        const score = partido.state && partido.state.score && partido.state.score.current;
        if (score) {
            resultado = score;
        } else if (partido.date) {
            const fechaObj = new Date(partido.date);
            const fechaStr = fechaObj.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
            const horaStr = fechaObj.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
            resultado = horaStr !== "00:00" ? fechaStr + " · " + horaStr : fechaStr;
        } else {
            resultado = "-";
        }

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
        const videoId = `${APP.videoPrefix()}${jornada.padStart(2,"0")}-${normalizarEquipo(local)}-${normalizarEquipo(visitante)}`;
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
        <span class="palmares-label">${APP.getState().competition === 'premier' ? 'Premier' : 'Liga'}</span>
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
    <span class="partidos-tab" data-ver="arbitrajes">Arbitrajes</span>
    <span class="partidos-tab" data-ver="noticias">Noticias</span>
    <span class="partidos-tab" data-ver="fichajes">Fichajes</span>
    <span class="partidos-tab" data-ver="evolucion">Evolución</span>
</div>

<div class="ultimos-partidos">
    <div class="partidos-lista" id="pl-jugados">${htmlJugados}</div>
    <div class="partidos-lista" id="pl-proximos" style="display:none">${htmlProximos}</div>
    <div class="partidos-lista" id="pl-plantilla" style="display:none"></div>
    <div class="partidos-lista" id="pl-arbitrajes" style="display:none"></div>
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
        document.getElementById('pl-arbitrajes').style.display = ver === 'arbitrajes' ? '' : 'none';
        document.getElementById('pl-noticias').style.display = ver === 'noticias' ? '' : 'none';
        document.getElementById('pl-fichajes').style.display = ver === 'fichajes' ? '' : 'none';
        document.getElementById('pl-evolucion').style.display = ver === 'evolucion' ? '' : 'none';

        if (ver === 'noticias') {
            cargarNoticias();
        }
        if (ver === 'arbitrajes') {
            cargarArbitrajes(jugados, nombreEquipo);
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

        if (evoPrincipal.length === 0) {
            canvas.style.display = 'none';
            const msg = canvas.nextElementSibling;
            if (!msg || !msg.classList.contains('evolucion-msg')) {
                const div = document.createElement('div');
                div.className = 'evolucion-msg';
                div.textContent = 'No hay datos de evolución disponibles para esta temporada.';
                canvas.parentElement.appendChild(div);
            }
            return;
        }

        canvas.style.display = '';
        const existingMsg = canvas.parentElement.querySelector('.evolucion-msg');
        if (existingMsg) existingMsg.remove();

        let nombres = [nombreEquipo];
        let todasSeries = [evoPrincipal];
        let colores = ['#f0c040'];

        if (equipoComparar) {
            const evoComp = calcularEvolucion(datos.data, equipoComparar);
            if (evoComp.length > 0) {
                nombres.push(equipoComparar);
                todasSeries.push(evoComp);
                colores.push('#3b82f6');
            }
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

    async function cargarArbitrajes(jugados, nombreEquipo) {
        var container = document.getElementById('pl-arbitrajes');
        if (!container) return;
        container.innerHTML = '<p class="tab-placeholder">Cargando arbitrajes...</p>';

        try {
            var arbitrosData = [];
            var partidosConRef = [];

            if (useSupabase && supabaseTeamId && window.STPLS_API && window.STPLS_API.fetchReferees) {
                var rows = await window.STPLS_API.fetchReferees();
                arbitrosData = arbitrosFromSupabase(rows);
                var matchesRef = await window.STPLS_API.fetchMatchesWithReferee(supabaseTeamId);
                partidosConRef = matchesRef.filter(function(m) {
                    return m.referee && m.referee.name && m.state && m.state.score && m.state.score.current;
                }).map(function(m) {
                    return { match: m, refereeName: m.referee.name, detail: null };
                });
            } else {
                var respArb = await fetch('./data/' + APP.getState().season + '/' + APP.getState().competition + '/arbitros.json');
                arbitrosData = await respArb.json();

                var respDesc = await fetch(APP.ruta('descargados'));
                var descargados = await respDesc.json();
                var idsDesc = new Set(descargados.map(function(d) { return d.id.toString(); }));

                for (var i = 0; i < jugados.length; i++) {
                    var j = jugados[i];
                    if (!idsDesc.has(j.id.toString())) continue;
                    try {
                        var respM = await fetch(APP.ruta('partido', j.id));
                        var matchData = await respM.json();
                        if (matchData.referee && matchData.referee.name) {
                            partidosConRef.push({ match: j, refereeName: matchData.referee.name, detail: matchData });
                        }
                    } catch(e) {}
                }
            }

            function normalizar(nombre) {
                return nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
            }

            function buscarArbitro(refName) {
                var norm = normalizar(refName);
                return arbitrosData.find(function(a) {
                    var parts = a.Nombre.split(/\s+/);
                    var apellidos = parts.filter(function(p) { return p === p.toUpperCase() && p.length > 1; });
                    if (apellidos.length >= 2) {
                        var key = normalizar(apellidos.join(' '));
                        if (norm.indexOf(key) !== -1) return true;
                        var unique = [];
                        for (var j = 0; j < apellidos.length; j++) {
                            var w = normalizar(apellidos[j]);
                            if (unique.indexOf(w) === -1) unique.push(w);
                        }
                        var matchCount = 0, sigCount = 0;
                        for (var j = 0; j < unique.length; j++) {
                            var w = unique[j];
                            if (w.length > 2) {
                                sigCount++;
                                if (norm.indexOf(w) !== -1) matchCount++;
                                else if (w.length > 5 && norm.indexOf(w.substring(0, 5)) !== -1) matchCount++;
                            }
                        }
                        if (sigCount >= 2 && matchCount >= sigCount) return true;
                    }
                    if (apellidos.length === 1) {
                        var key1 = normalizar(apellidos[0]);
                        if (norm.indexOf(key1) !== -1) return true;
                    }
                    var nombreLower = normalizar(a.Nombre);
                    if (norm.indexOf(nombreLower) !== -1 || nombreLower.indexOf(norm) !== -1) return true;
                    return false;
                });
            }

            var arbStats = {};
            partidosConRef.forEach(function(pr) {
                var arb = buscarArbitro(pr.refereeName);
                var key = arb ? arb.Nombre : pr.refereeName;
                if (!arbStats[key]) {
                    arbStats[key] = { nombre: key, id: arb ? arb.id : null, ganados: 0, empatados: 0, perdidos: 0, total: 0 };
                }
                var m = pr.match;
                var gl, gv;
                if (m.state && m.state.score && m.state.score.current) {
                    var parts = m.state.score.current.split('-').map(function(x) { return parseInt(x.trim()); });
                    gl = parts[0]; gv = parts[1];
                }
                if (gl === undefined) return;
                var esLocal = m.homeTeam.name === nombreEquipo;
                var gf = esLocal ? gl : gv;
                var gc = esLocal ? gv : gl;
                arbStats[key].total++;
                if (gf > gc) arbStats[key].ganados++;
                else if (gf === gc) arbStats[key].empatados++;
                else arbStats[key].perdidos++;
            });

            var ranked = Object.keys(arbStats).map(function(k) { return arbStats[k]; });
            ranked.sort(function(a, b) {
                var pctA = a.total > 0 ? a.ganados / a.total : 0;
                var pctB = b.total > 0 ? b.ganados / b.total : 0;
                if (pctB !== pctA) return pctB - pctA;
                return b.total - a.total;
            });

            if (!ranked.length) {
                container.innerHTML = '<p class="tab-placeholder">No hay datos de arbitrajes disponibles</p>';
                return;
            }

            var html = '<table class="arb-team-table">';
            html += '<thead><tr>';
            html += '<th class="arb-team-col-name">\u00c1rbitro</th>';
            html += '<th class="arb-team-col-num">PJ</th>';
            html += '<th class="arb-team-col-num">Gan</th>';
            html += '<th class="arb-team-col-num">Emp</th>';
            html += '<th class="arb-team-col-num">Per</th>';
            html += '<th class="arb-team-col-num">%G</th>';
            html += '</tr></thead>';
            html += '<tbody>';
            var totalPJ = 0, totalG = 0, totalE = 0, totalP = 0;
            ranked.forEach(function(r) {
                var pct = r.total > 0 ? Math.round((r.ganados / r.total) * 100) : 0;
                var link = r.id ? '<a href="arbitros.html?nombre=' + encodeURIComponent(r.nombre) + '" class="arb-team-link">' + escHtml(r.nombre) + '</a>' : escHtml(r.nombre);
                html += '<tr>';
                html += '<td class="arb-team-col-name">' + link + '</td>';
                html += '<td class="arb-team-col-num">' + r.total + '</td>';
                html += '<td class="arb-team-col-num arb-wins">' + r.ganados + '</td>';
                html += '<td class="arb-team-col-num">' + r.empatados + '</td>';
                html += '<td class="arb-team-col-num arb-losses">' + r.perdidos + '</td>';
                html += '<td class="arb-team-col-num">' + pct + '</td>';
                html += '</tr>';
                totalPJ += r.total;
                totalG += r.ganados;
                totalE += r.empatados;
                totalP += r.perdidos;
            });
            var totalPct = totalPJ > 0 ? Math.round((totalG / totalPJ) * 100) : 0;
            html += '<tr class="arb-ranking-total-row">';
            html += '<td class="arb-team-col-name">TOTAL</td>';
            html += '<td class="arb-team-col-num">' + totalPJ + '</td>';
            html += '<td class="arb-team-col-num arb-wins">' + totalG + '</td>';
            html += '<td class="arb-team-col-num">' + totalE + '</td>';
            html += '<td class="arb-team-col-num arb-losses">' + totalP + '</td>';
            html += '<td class="arb-team-col-num">' + totalPct + '</td>';
            html += '</tr>';
            html += '</tbody></table>';
            container.innerHTML = html;
        } catch(e) {
            container.innerHTML = '<p class="tab-placeholder">Error al cargar arbitrajes</p>';
        }
    }

    async function cargarNoticias() {
        var container = document.getElementById('pl-noticias');
        if (!container) return;
        if (container.querySelector('.noticias-list')) return;
        container.innerHTML = '<p class="tab-placeholder">Cargando noticias...</p>';

        try {
            var noticias = [];
            if (useSupabase && supabaseTeamId) {
                noticias = await window.STPLS_API.fetchNews(supabaseTeamId);
                noticias = newsFromSupabase(noticias);
            } else {
                var slug = nombreEquipo.toLowerCase().trim()
                    .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i')
                    .replace(/ó/g,'o').replace(/ú/g,'u').replace(/ñ/g,'n')
                    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

                var apiUrl = 'api/noticias?team=' + encodeURIComponent(slug);
                var resp = await fetch(apiUrl);
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                noticias = await resp.json();
            }

            var seleccion = [];
            for (var i = 0; i < noticias.length && seleccion.length < 15; i++) {
                seleccion.push(noticias[i]);
            }

            if (!seleccion.length) {
                container.innerHTML = '<p class="tab-placeholder">No hay noticias recientes de ' + escHtml(nombreEquipo) + '</p>';
                return;
            }

            var html = '<div class="noticias-list">';
            for (var j = 0; j < seleccion.length; j++) {
                var n = seleccion[j];
                var fechaPub = new Date(n.fecha);
                var fechaStr = fechaPub.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                html += '<article class="noticia-card">';
                if (n.imagen) {
                    html += '<div class="noticia-img" style="background-image:url(' + n.imagen + ')"><span class="noticia-fuente-badge">' + escHtml(n.fuente) + '</span></div>';
                }
                html += '<div class="noticia-body">';
                if (!n.imagen) {
                    html += '<span class="noticia-fuente">' + escHtml(n.fuente) + '</span>';
                }
                html += '<h3 class="noticia-titulo">' + escHtml(n.titulo) + '</h3>';
                html += '<div class="noticia-footer">';
                html += '<span class="noticia-fecha">' + fechaStr + '</span>';
                if (n.url) {
                    html += '<a href="' + n.url + '" target="_blank" rel="noopener noreferrer" class="noticia-link">Leer más →</a>';
                }
                html += '</div></div></article>';
            }
            html += '</div>';
            container.innerHTML = html;
        } catch(e) {
            container.innerHTML = '<p class="tab-placeholder">No hay noticias disponibles</p>';
        }
    }

    async function cargarFichajes() {
        var container = document.getElementById('pl-fichajes');
        if (!container) return;
        if (container.querySelector('.fichajes-list')) return;
        container.innerHTML = '<p class="tab-placeholder">Cargando fichajes...</p>';

        try {
            var data;
            if (useSupabase && supabaseTeamId) {
                var items = await window.STPLS_API.fetchTransfers(supabaseTeamId);
                data = transfersFromSupabase(slugEquipo, items);
            } else {
                var resp = await fetch('./data/fichajes.json');
                data = await resp.json();
            }
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

    function getPositionOverrides() {
        try {
            return JSON.parse(localStorage.getItem('stpls_position_overrides') || '{}');
        } catch(e) { return {}; }
    }

    function savePositionOverride(teamName, playerId, newPosition) {
        var overrides = getPositionOverrides();
        var key = teamName + ':' + playerId;
        overrides[key] = newPosition;
        localStorage.setItem('stpls_position_overrides', JSON.stringify(overrides));
    }

    function applyOverrides(data) {
        var overrides = getPositionOverrides();
        if (!Object.keys(overrides).length) return data;
        var result = JSON.parse(JSON.stringify(data));
        Object.keys(overrides).forEach(function(key) {
            var parts = key.split(':');
            var teamName = parts[0];
            var playerId = parseInt(parts[1]);
            var newPos = overrides[key];
            if (result[teamName] && result[teamName].players) {
                var pl = result[teamName].players.find(function(p) { return p.id === playerId; });
                if (pl) pl.position = newPos;
            }
        });
        return result;
    }

    function isLocalServer() {
        return location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    }

    async function cargarPlantilla(teamName) {
        var container = document.getElementById('pl-plantilla');
        if (!container) return;
        if (plantillaCache) {
            renderPlantilla(plantillaCache, teamName, container);
            return;
        }
        container.innerHTML = '<p class="tab-placeholder">Cargando plantilla...</p>';

        try {
            var data;
            if (useSupabase && supabasePlayers && supabasePlayers.length > 0) {
                data = plantillaFromSupabase(teamName, supabasePlayers);
                data = applyOverrides(data);
            } else {
                var resp = await fetch(APP.ruta('plantilla'));
                data = await resp.json();
                data = applyOverrides(data);
            }
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
        if (team.logo) html += '<img src="' + escHtml(APP.fixLogo(team.logo)) + '" class="squad-logo" onerror="this.style.display=\'none\'">';
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
                        html += '<img class="squad-player-flag" src="https://flagcdn.com/w40/' + cc2 + '.png" alt="' + escHtml(p.nationality || '') + '" loading="lazy" title="Editar posición de ' + escHtml(p.name) + '" data-player-id="' + p.id + '" data-team="' + escHtml(teamName) + '">';
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

        container.addEventListener('click', function(e) {
            var flag = e.target.closest('.squad-player-flag');
            if (!flag) return;
            var playerId = parseInt(flag.dataset.playerId);
            var tName = flag.dataset.team;
            var player = team.players.find(function(pl) { return pl.id === playerId; });
            if (player) abrirEditorPosicion(player, tName);
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

    async function renderAlineacion(team, teamName, container) {
        var gk = seleccionarTitular(team, 'Goalkeeper', 1);
        var def = seleccionarTitular(team, 'Defender', 4);
        var mid = seleccionarTitular(team, 'Midfielder', 3);
        var fwd = seleccionarTitular(team, 'Forward', 3);
        var xi = [].concat(gk, def, mid, fwd);

        var totalJornadas = 0;
        try {
            if (useSupabase && supabaseTeamId && window.STPLS_API && window.STPLS_API.countTeamDetailedMatches) {
                totalJornadas = await window.STPLS_API.countTeamDetailedMatches(supabaseTeamId);
            } else {
                var descResp = await fetch(APP.ruta('descargados'));
                var descData = await descResp.json();
                totalJornadas = descData.filter(function(m) {
                    return (m.home === teamName || m.away === teamName) && m.lineups && m.boxscore;
                }).length;
            }
        } catch(e) {}

        function playerNode(p, idx) {
            var fotoUrl = p.fotMobId ? 'https://images.fotmob.com/image_resources/playerimages/' + p.fotMobId + '.png' : '';
            var tit = p.starts || 0;
            var h = '<div class="pitch-player pos-' + p.position + '">';
            if (fotoUrl) {
                h += '<img class="pitch-player-photo" src="' + escHtml(fotoUrl) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">';
            }
            h += '<span class="pitch-player-num">' + (p.number || '') + '</span>';
            h += '<span class="pitch-player-name">' + escHtml(p.name.split(' ').pop()) + '</span>';
            h += '<span class="pitch-player-stats">' + tit + ' TIT</span>';
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
        html += '<div class="pitch-jornadas-badge">' + totalJornadas + ' JOR</div>';
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
            plantillaCache = null;
            cargarPlantilla(teamName);
        });
    }

    function abrirEditorPosicion(player, teamName) {
        var existing = document.getElementById('modal-posicion');
        if (existing) existing.remove();

        var posLabels = {
            Goalkeeper: 'Portero',
            Defender: 'Defensa',
            Midfielder: 'Centrocampista',
            Forward: 'Delantero'
        };
        var posIcons = {
            Goalkeeper: '\uD83D\uDDF3',
            Defender: '\uD83D\uDEE1',
            Midfielder: '\u2B50',
            Forward: '\u26BD'
        };
        var posOrder = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];

        var fotoUrl = player.fotMobId
            ? 'https://images.fotmob.com/image_resources/playerimages/' + player.fotMobId + '.png'
            : '';

        var html = '<div class="modal-overlay" id="modal-posicion">';
        html += '<div class="modal-box">';
        html += '<button class="modal-close" id="modal-close-btn">&times;</button>';

        if (!isLocalServer()) {
            html += '<div class="modal-info-banner">Los cambios se guardan solo en este navegador</div>';
        }

        html += '<div class="modal-player">';
        if (fotoUrl) {
            html += '<img class="modal-player-photo" src="' + escHtml(fotoUrl) + '" alt="' + escHtml(player.name) + '">';
        }
        html += '<div class="modal-player-info">';
        html += '<div class="modal-player-name">' + escHtml(player.name) + '</div>';
        html += '<div class="modal-player-current">';
        html += '<span class="pos-dot pos-dot--' + player.position + '"></span>';
        html += posLabels[player.position] || player.position;
        html += '</div>';
        html += '</div>';
        html += '</div>';

        html += '<div class="modal-divider"></div>';
        html += '<div class="modal-label">Selecciona la posici\u00f3n correcta</div>';

        html += '<div class="modal-positions" id="modal-pos-list">';
        posOrder.forEach(function(pos) {
            var sel = pos === player.position ? ' selected' : '';
            html += '<div class="modal-pos-option' + sel + '" data-pos="' + pos + '">';
            html += '<span class="modal-pos-dot modal-pos-dot--' + pos + '"></span>';
            html += '<span class="modal-pos-label">' + posLabels[pos] + '</span>';
            html += '<span class="modal-pos-icon">' + posIcons[pos] + '</span>';
            html += '</div>';
        });
        html += '</div>';

        html += '<div class="modal-actions">';
        html += '<button class="modal-btn modal-btn--cancel" id="modal-cancel-btn">Cancelar</button>';
        html += '<button class="modal-btn modal-btn--save" id="modal-save-btn" disabled>Guardar</button>';
        html += '</div>';

        html += '<div id="modal-result"></div>';
        html += '</div></div>';

        document.body.insertAdjacentHTML('beforeend', html);

        var overlay = document.getElementById('modal-posicion');
        var selectedPos = player.position;

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeModal();
        });
        document.getElementById('modal-close-btn').addEventListener('click', closeModal);
        document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);

        var options = overlay.querySelectorAll('.modal-pos-option');
        options.forEach(function(opt) {
            opt.addEventListener('click', function() {
                options.forEach(function(o) { o.classList.remove('selected'); });
                opt.classList.add('selected');
                selectedPos = opt.dataset.pos;
                document.getElementById('modal-save-btn').disabled = (selectedPos === player.position);
            });
        });

        document.getElementById('modal-save-btn').addEventListener('click', function() {
            if (selectedPos === player.position) return;
            var confirmMsg = '\u00BFGuardar cambio de ' + player.name + ' de '
                + posLabels[player.position] + ' a ' + posLabels[selectedPos] + '?';
            if (!confirm(confirmMsg)) return;
            guardarPosicionJugador(teamName, player.id, selectedPos, player);
        });

        function closeModal() {
            var m = document.getElementById('modal-posicion');
            if (m) m.remove();
        }
    }

    function guardarPosicionJugador(teamName, playerId, newPosition, player) {
        var saveBtn = document.getElementById('modal-save-btn');
        var cancelBtn = document.getElementById('modal-cancel-btn');
        if (saveBtn) saveBtn.disabled = true;
        if (cancelBtn) cancelBtn.disabled = true;

        var posLabels = {
            Goalkeeper: 'Portero',
            Defender: 'Defensa',
            Midfielder: 'Centrocampista',
            Forward: 'Delantero'
        };

        function onSuccess(mode) {
            if (plantillaCache && plantillaCache[teamName]) {
                var pl = plantillaCache[teamName].players.find(function(p) { return p.id === playerId; });
                if (pl) pl.position = newPosition;
            }

            var resultDiv = document.getElementById('modal-result');
            if (resultDiv) {
                var label = mode === 'local' ? ' (solo en este navegador)' : '';
                resultDiv.innerHTML = '<div class="modal-success">'
                    + '<div class="modal-success-icon">\u2705</div>'
                    + '<div class="modal-success-text">Posici\u00f3n actualizada a ' + posLabels[newPosition] + label + '</div>'
                    + '</div>';
            }

            setTimeout(function() {
                var m = document.getElementById('modal-posicion');
                if (m) m.remove();
                var container = document.getElementById('pl-plantilla');
                if (container && plantillaCache) {
                    renderPlantilla(plantillaCache, teamName, container);
                }
            }, 1200);
        }

        function onError(msg) {
            alert('Error al guardar: ' + msg);
            if (saveBtn) saveBtn.disabled = false;
            if (cancelBtn) cancelBtn.disabled = false;
        }

        if (isLocalServer()) {
            var payload = JSON.stringify({ team: teamName, playerId: playerId, newPosition: newPosition });
            fetch('/api/update-position', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload
            })
            .then(function(resp) { return resp.json(); })
            .then(function(result) {
                if (result.success) {
                    onSuccess('server');
                } else {
                    onError(result.error || 'Error desconocido');
                }
            })
            .catch(function() {
                savePositionOverride(teamName, playerId, newPosition);
                onSuccess('local');
            });
        } else {
            savePositionOverride(teamName, playerId, newPosition);
            onSuccess('local');
        }
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