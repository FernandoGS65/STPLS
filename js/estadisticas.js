const jugadores = [
  {
    nombre: "Lamine Yamal",
    equipo: "FC Barcelona",
    edad: 18,
    goles: 14
  },
  {
    nombre: "Robert Lewandowski",
    equipo: "FC Barcelona",
    edad: 37,
    goles: 26
  },
  {
    nombre: "Jude Bellingham",
    equipo: "Real Madrid",
    edad: 22,
    goles: 12
  },
  {
    nombre: "Vinicius Jr",
    equipo: "Real Madrid",
    edad: 25,
    goles: 18
  },
  {
    nombre: "Antoine Griezmann",
    equipo: "Atlético Madrid",
    edad: 34,
    goles: 15
  },
  {
    nombre: "Isco",
    equipo: "Real Betis",
    edad: 34,
    goles: 9
  },
  {
    nombre: "Ayoze Pérez",
    equipo: "Villarreal CF",
    edad: 32,
    goles: 16
  }
];

const goleadores =
  [...jugadores].sort(
    (a, b) => b.goles - a.goles
  );

const topGoleadores =
  document.getElementById("top-goleadores");

let htmlGoleadores = "";

goleadores.forEach((jugador, indice) => {

  let posicion = `${indice + 1}.`;

  if (indice === 0) posicion = "🥇";
  if (indice === 1) posicion = "🥈";
  if (indice === 2) posicion = "🥉";

  htmlGoleadores += `
    <p>
      ${posicion}
      ${jugador.nombre}
      - ⚽ ${jugador.goles}
    </p>
  `;
});

topGoleadores.innerHTML =
  htmlGoleadores;

const joven =
  [...jugadores].sort(
    (a, b) => a.edad - b.edad
  )[0];

document.getElementById(
  "jugador-joven"
).innerHTML = `
  <strong>${joven.nombre}</strong>
  <br>
  ${joven.edad} años
`;

const totalGoles =
  jugadores.reduce(
    (suma, jugador) =>
      suma + jugador.goles,
    0
  );

const promedio =
  (
    totalGoles /
    jugadores.length
  ).toFixed(1);

document.getElementById(
  "promedio-goles"
).innerHTML = `
  <strong>${promedio}</strong>
  goles por jugador
`;

(async function() {
  var container = document.getElementById("partidos-descargados");
  if (!container) return;
  try {
    var resp = await fetch("./data/descargados.json");
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    var partidos = await resp.json();
    var html = '<div class="desc-table-wrap"><table class="desc-table"><thead><tr><th>#</th><th>Local</th><th>Res</th><th>Visitante</th><th title="Detalle">D</th><th title="Alineaciones">A</th><th title="Boxscore">B</th></tr></thead><tbody>';
    for (var i = 0; i < partidos.length; i++) {
      var p = partidos[i];
      var f = new Date(p.date).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
      html += '<tr><td class="desc-j">' + p.jornada + '</td><td class="desc-local"><a href="partido.html?matchId=' + p.id + '">' + p.home + '</a></td><td class="desc-res">' + p.score + '</td><td class="desc-visit"><a href="partido.html?matchId=' + p.id + '">' + p.away + '</a></td><td class="desc-check' + (p.detail ? ' desc-yes' : '') + '">' + (p.detail ? '✓' : '—') + '</td><td class="desc-check' + (p.lineups ? ' desc-yes' : '') + '">' + (p.lineups ? '✓' : '—') + '</td><td class="desc-check' + (p.boxscore ? ' desc-yes' : '') + '">' + (p.boxscore ? '✓' : '—') + '</td></tr>';
    }
    html += '</tbody></table></div>';
    html += '<p class="desc-total">' + partidos.length + ' de 380 partidos descargados</p>';
    container.innerHTML = html;
  } catch (e) {
    container.innerHTML = '<p class="desc-error">Error al cargar: ' + e.message + '</p>';
  }
})();