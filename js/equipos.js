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

        if (
            !partido.state ||
            !partido.state.score ||
            !partido.state.score.current
        ) return;

        const marcador =
            partido.state.score.current
                .split("-")
                .map(x => parseInt(x.trim()));

        const gl = marcador[0];
        const gv = marcador[1];

        const marcador =
            partido.state.score.current
                .split("-")
                .map(x => parseInt(x.trim()));

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

    clasificacion.sort((a, b) => {

        if (
            b.puntos !== a.puntos
        ) {

            return (
                b.puntos - a.puntos
            );

        }

        const dgA =
            a.gf - a.gc;

        const dgB =
            b.gf - b.gc;

        if (dgB !== dgA) {

            return dgB - dgA;

        }

        return b.gf - a.gf;

    });

    clasificacion.forEach(
        (equipo, index) => {

            equipo.posicion =
                index + 1;

        }
    );

    return clasificacion;

}

async function cargarEquipos() {

    try {

        const respuesta =
            await fetch(
                APP.ruta("calendario")
            );

        const datos =
            await respuesta.json();

        const clasificacion =
            calcularClasificacion(
                datos.data
            );

        const contenedor =
            document.getElementById(
                "lista-equipos"
            );

        let html = "";

        clasificacion.forEach(
            equipo => {

                html += `

                <a
                    href="equipo.html?id=${encodeURIComponent(
                        equipo.nombre
                    )}"
                    class="equipo-card-link">

                    <div class="equipo-card">

                        <img
                            src="${equipo.logo}"
                            class="escudo-equipo">

                        <h3>
                            ${equipo.nombre}
                        </h3>

                        <p>
                            ${equipo.posicion}º ·
                            ${equipo.puntos} pts
                        </p>

                    </div>

                </a>

                `;

            }
        );

        contenedor.innerHTML =
            html;

    }

    catch(error){

        console.error(error);

    }

}

APP.onChange(function() { cargarEquipos(); });