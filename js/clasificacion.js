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


const contenedor =
    document.getElementById(
        "tabla-clasificacion"
    );

let html = `

<div class="tabla-responsive">

    <table class="tabla-liga">

        <thead>

            <tr>

                <th>#</th>
                <th>Equipo</th>
                <th>PJ</th>
                <th>PG</th>
                <th>PE</th>
                <th>PP</th>
                <th>GF</th>
                <th>GC</th>
                <th>DG</th>
                <th>PTS</th>

            </tr>

        </thead>

        <tbody>
`;

clasificacion.forEach(equipo => {

    let claseFila = "";

    if (equipo.position <= 4) {

        claseFila = "champions";

    } else if (equipo.position <= 6) {

        claseFila = "europa";

    } else if (equipo.position === 7) {

        claseFila = "conference";

    } else if (equipo.position >= 18) {

        claseFila = "descenso";

    }

    const pj = equipo.total.games;
    const pg = equipo.total.wins;
    const pe = equipo.total.draws;
    const pp = equipo.total.loses;
    const gf = equipo.total.scoredGoals;
    const gc = equipo.total.receivedGoals;
    const dg = gf - gc;

    html += `

    <tr class="${claseFila}">

        <td class="posicion">
            ${equipo.position}
        </td>

        <td>

            <div class="equipo-col">

                <img
                    src="${equipo.team.logo}"
                    class="escudo-tabla"
                    alt="${equipo.team.name}">

                <a
    href="equipo.html?id=${encodeURIComponent(
        equipo.team.name
    )}"
    class="link-equipo">

    ${equipo.team.name}

</a>

            </div>

        </td>

        <td>${pj}</td>
        <td>${pg}</td>
        <td>${pe}</td>
        <td>${pp}</td>
        <td>${gf}</td>
        <td>${gc}</td>

        <td class="${
            dg >= 0
            ? "dg-positivo"
            : "dg-negativo"
        }">

            ${dg > 0 ? "+" : ""}${dg}

        </td>

        <td class="puntos">
            ${equipo.points}
        </td>

    </tr>
    `;

});

html += `

        </tbody>

    </table>

</div>
`;

contenedor.innerHTML = html;


}

async function cargarClasificacion() {


try {

    const respuesta =
        await fetch(
            "./data/laliga2025.json"
        );

    const datos =
        await respuesta.json();

    const partidos =
        datos.data;

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

cargarClasificacion();
