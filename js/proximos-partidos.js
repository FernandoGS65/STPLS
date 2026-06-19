console.log("PROXIMOS PARTIDOS CARGADO");

const proximosPartidos = [
  {
    fecha: "2026-08-21",
    hora: "20:00",
    local: "Barcelona",
    visitante: "Valencia"
  },
  {
    fecha: "2026-08-22",
    hora: "18:30",
    local: "Atlético Madrid",
    visitante: "Betis"
  },
  {
    fecha: "2026-08-22",
    hora: "21:00",
    local: "Real Madrid",
    visitante: "Sevilla"
  },
  {
    fecha: "2026-08-23",
    hora: "16:15",
    local: "Athletic Club",
    visitante: "Osasuna"
  }
];

const contenedorPartidos =
  document.getElementById("proximos-partidos");

if (contenedorPartidos) {

  let html = "";

  proximosPartidos.forEach(partido => {

    html += `
      <div class="partido-card">

        <div class="fecha-partido">
          ${partido.fecha}
          ·
          ${partido.hora}
        </div>

        <div class="equipos-partido">
          ${partido.local}
          vs
          ${partido.visitante}
        </div>

      </div>
    `;
  });

  contenedorPartidos.innerHTML = html;
}