function calcularClasificacion(partidos, jornadaMax = 38) {


const tabla = {};

partidos.forEach(partido => {

    const jornada = parseInt(
        partido.round.split("-")[1].trim()
    );

    if (jornada > jornadaMax) return;

    if (
        !partido.state ||
        !partido.state.score ||
        !partido.state.score.current
    ) return;

    const local = partido.homeTeam.name;
    const visitante = partido.awayTeam.name;

    const marcador =
        partido.state.score.current
            .split("-")
            .map(x => parseInt(x.trim()));

    const gl = marcador[0];
    const gv = marcador[1];

    if (!tabla[local]) {

        tabla[local] = {
            team: {
                name: local,
                logo: partido.homeTeam.logo
            },
            points: 0,
            total: {
                games: 0,
                wins: 0,
                draws: 0,
                loses: 0,
                scoredGoals: 0,
                receivedGoals: 0
            }
        };

    }

    if (!tabla[visitante]) {

        tabla[visitante] = {
            team: {
                name: visitante,
                logo: partido.awayTeam.logo
            },
            points: 0,
            total: {
                games: 0,
                wins: 0,
                draws: 0,
                loses: 0,
                scoredGoals: 0,
                receivedGoals: 0
            }
        };

    }

    tabla[local].total.games++;
    tabla[visitante].total.games++;

    tabla[local].total.scoredGoals += gl;
    tabla[local].total.receivedGoals += gv;

    tabla[visitante].total.scoredGoals += gv;
    tabla[visitante].total.receivedGoals += gl;

    if (gl > gv) {

        tabla[local].points += 3;

        tabla[local].total.wins++;
        tabla[visitante].total.loses++;

    }
    else if (gv > gl) {

        tabla[visitante].points += 3;

        tabla[visitante].total.wins++;
        tabla[local].total.loses++;

    }
    else {

        tabla[local].points++;
        tabla[visitante].points++;

        tabla[local].total.draws++;
        tabla[visitante].total.draws++;

    }

});

const clasificacion =
    Object.values(tabla);

clasificacion.sort((a, b) => {

    if (b.points !== a.points) {
        return b.points - a.points;
    }

    const dgA =
        a.total.scoredGoals -
        a.total.receivedGoals;

    const dgB =
        b.total.scoredGoals -
        b.total.receivedGoals;

    if (dgB !== dgA) {
        return dgB - dgA;
    }

    return (
        b.total.scoredGoals -
        a.total.scoredGoals
    );

});

clasificacion.forEach((equipo, index) => {
    equipo.position = index + 1;
});

return clasificacion;


}

function pintarClasificacion(clasificacion) {

const contenedor = document.getElementById("tabla-clasificacion");

let html = "";

clasificacion.forEach(equipo => {

    let zona = "";
    if (equipo.position <= 4) {
        zona = "clasificacion-row--champions";
    } else if (equipo.position <= 6) {
        zona = "clasificacion-row--europa";
    } else if (equipo.position === 7) {
        zona = "clasificacion-row--conference";
    } else if (equipo.position >= 18) {
        zona = "clasificacion-row--descenso";
    }

    let posClass = "";
    if (equipo.position === 1) posClass = "clasificacion-pos--gold";
    else if (equipo.position === 2) posClass = "clasificacion-pos--silver";
    else if (equipo.position === 3) posClass = "clasificacion-pos--bronze";

    const pj = equipo.total.games;
    const pg = equipo.total.wins;
    const pe = equipo.total.draws;
    const pp = equipo.total.loses;
    const gf = equipo.total.scoredGoals;
    const gc = equipo.total.receivedGoals;
    const dg = gf - gc;

    const dgClass = dg >= 0 ? "clasificacion-dg--pos" : "clasificacion-dg--neg";
    const dgText = dg > 0 ? "+" + dg : dg;

    html += `
<div class="clasificacion-row ${zona}">
    <div class="clasificacion-pos ${posClass}">${equipo.position}</div>
    <img src="${equipo.team.logo}" class="clasificacion-escudo" alt="${equipo.team.name}">
    <div class="clasificacion-nombre">
        <a href="equipo.html?id=${encodeURIComponent(equipo.team.name)}">${equipo.team.name}</a>
        <div class="clasificacion-stats-sec">
            <span>PJ ${pj} - PG ${pg} - PE ${pe} - PP ${pp} - GF ${gf} - GC ${gc}</span>
        </div>
    </div>
    <div class="clasificacion-puntos">
        <span class="clasificacion-pts">${equipo.points}</span>
        <span class="clasificacion-dg ${dgClass}">${dgText}</span>
    </div>
</div>`;
});

html += `
<div class="clasificacion-leyenda">
    <div class="clasificacion-leyenda-item">
        <div class="clasificacion-leyenda-dot clasificacion-leyenda-dot--champions"></div>
        <span>Champions League</span>
    </div>
    <div class="clasificacion-leyenda-item">
        <div class="clasificacion-leyenda-dot clasificacion-leyenda-dot--europa"></div>
        <span>Europa League</span>
    </div>
    <div class="clasificacion-leyenda-item">
        <div class="clasificacion-leyenda-dot clasificacion-leyenda-dot--conference"></div>
        <span>Conference League</span>
    </div>
    <div class="clasificacion-leyenda-item">
        <div class="clasificacion-leyenda-dot clasificacion-leyenda-dot--descenso"></div>
        <span>Descenso</span>
    </div>
</div>`;

contenedor.innerHTML = html;

}

async function cargarClasificacion() {


try {

    const respuesta =
        await fetch(
            APP.ruta("calendario")
        );

    const datos =
        await respuesta.json();

    const partidos =
        datos.data;

    const state = APP.getState();
    const seasonLabel = state.seasons.find(s => s.id === state.season);
    const tempEl = document.getElementById('clasificacion-temporada');
    if (tempEl && seasonLabel) {
        tempEl.textContent = 'Temporada ' + seasonLabel.label;
    }

    const selector =
        document.getElementById(
            "selector-jornada"
        );

    selector.innerHTML = "";

    for (
        let jornada = 38;
        jornada >= 1;
        jornada--
    ) {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            jornada;

        option.textContent =
            "Jornada " + jornada;

        selector.appendChild(
            option
        );

    }

    selector.value = 38;

    pintarClasificacion(
        calcularClasificacion(
            partidos,
            38
        )
    );

    selector.addEventListener(
        "change",
        () => {

            const jornada =
                parseInt(
                    selector.value
                );

            pintarClasificacion(
                calcularClasificacion(
                    partidos,
                    jornada
                )
            );

        }
    );

} catch(error) {

    console.error(error);

    document.getElementById(
        "tabla-clasificacion"
    ).innerHTML =
        "<p>Error cargando clasificación.</p>";

}


}

APP.onChange(function() { cargarClasificacion(); });
