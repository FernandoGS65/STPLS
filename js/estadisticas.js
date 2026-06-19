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