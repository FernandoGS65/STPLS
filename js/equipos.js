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

    clasificacion.sort((a, b) =>
        a.nombre.localeCompare(b.nombre, 'es')
    );

    return clasificacion;

}

async function cargarEquipos() {

    try {

        let equipos = [];
        let useSupabase = false;

        // Try Supabase first
        if (window.STPLS_API && window.STPLS_API.fetchTeams) {
            try {
                const supabaseTeams = await window.STPLS_API.fetchTeams();
                if (supabaseTeams && supabaseTeams.length > 0) {
                    equipos = supabaseTeams.map(t => ({
                        nombre: t.name,
                        logo: APP.fixLogo(t.logo_url)
                    }));
                    useSupabase = true;
                }
            } catch (e) {
                console.warn('Supabase teams fetch failed, falling back to JSON', e);
            }
        }

        // Fallback to JSON
        if (!useSupabase) {
            const respuesta = await fetch(APP.ruta("calendario"));
            const datos = await respuesta.json();
            var seen = {};
            equipos = [];
            datos.data.forEach(function(p) {
                [p.homeTeam, p.awayTeam].forEach(function(t) {
                    if (!seen[t.name]) {
                        seen[t.name] = true;
                        equipos.push({ nombre: t.name, logo: APP.fixLogo(t.logo) });
                    }
                });
            });
            equipos.sort(function(a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
        }

        const contenedor = document.getElementById("lista-equipos");
        let html = "";

        equipos.forEach(equipo => {
            html += `
                <a
                    href="equipo.html?id=${encodeURIComponent(equipo.nombre)}"
                    class="equipo-card-link">
                    <div class="equipo-card">
                        <img
                            src="${equipo.logo}"
                            class="escudo-equipo">
                        <h3>${equipo.nombre}</h3>
                    </div>
                </a>
            `;
        });

        contenedor.innerHTML = html;

    }

    catch(error){

        console.error(error);

    }

}

function actualizarTituloEquipos() {
    var h2 = document.getElementById('equipos-titulo');
    if (!h2) return;
    var state = APP.getState();
    var season = state.seasons.find(function(s) { return s.id === state.season; });
    var comp = season ? season.competitions.find(function(c) { return c.id === state.competition; }) : null;
    h2.textContent = 'Equipos – ' + (comp ? comp.label : state.competition);
}

APP.onChange(function() { actualizarTituloEquipos(); cargarEquipos(); });
