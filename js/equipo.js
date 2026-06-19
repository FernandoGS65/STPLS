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
function obtenerUltimosPartidos(
    partidos,
    nombreEquipo,
    cantidad = 12
) {

    const partidosEquipo =
        partidos.filter(partido => {

            return (
                partido.homeTeam.name === nombreEquipo ||
                partido.awayTeam.name === nombreEquipo
            );

        });

    partidosEquipo.sort((a,b)=>
        new Date(b.date) -
        new Date(a.date)
    );

    return partidosEquipo.slice(
        0,
        cantidad
    );

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

        const ultimosPartidos =
    obtenerUltimosPartidos(
        datos.data,
        nombreEquipo,
        12
    );
    let formaReciente = "";

ultimosPartidos.forEach(
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

let htmlUltimos = "";

ultimosPartidos.forEach(
    partido => {

        const local =
            partido.homeTeam.name;

        const visitante =
            partido.awayTeam.name;

        const resultado =
            partido.state?.score?.current
            || "-";

        let icono = "⚪";

        if (
            partido.state &&
            partido.state.score &&
            partido.state.score.current
        ) {

            const marcador =
                partido.state.score.current
                    .split("-")
                    .map(x =>
                        parseInt(
                            x.trim()
                        )
                    );

            const gl =
                marcador[0];

            const gv =
                marcador[1];

            const esLocal =
                local === nombreEquipo;

            if (
                (esLocal && gl > gv) ||
                (!esLocal && gv > gl)
            ) {

                icono = "🟢";

            }

            else if (gl === gv) {

                icono = "🟡";

            }

            else {

                icono = "🔴";

            }

        }

        const jornada =
    partido.round
        .split("-")[1]
        .trim();

const normalizarEquipo = nombre =>

    nombre
        .replaceAll(" ", "")
        .replaceAll("á","a")
        .replaceAll("é","e")
        .replaceAll("í","i")
        .replaceAll("ó","o")
        .replaceAll("ú","u");

const videoId =

    `LL-J${jornada.padStart(2,"0")}-` +

    `${normalizarEquipo(local)}-` +

    `${normalizarEquipo(visitante)}`;

const tieneVideo =
    videos[videoId];

htmlUltimos += `

    <div class="partido-reciente">

        <span class="forma">
            ${icono}
        </span>

        <span class="jornada-partido">
            J${jornada}
        </span>

        <span class="equipo-partido">
            ${local}
        </span>

        <strong class="resultado-partido">
            ${resultado}
        </strong>

        <span class="equipo-partido">
            ${visitante}
        </span>

        ${tieneVideo ? `

<a
    href="video.html?id=${videoId}"
    class="link-video">

    🎥

</a>

` : ""}

    </div>

`;

    }
);

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
            <h3>
    Últimos 12 partidos
</h3>

<div class="ultimos-partidos">

    ${htmlUltimos}

</div>

        </div>

    `;

}

cargarEquipo();