const jugadores = [
  {
    nombre: "Lamine Yamal",
    equipo: "FC Barcelona",
    posicion: "Extremo",
    edad: 18,
    goles: 14
  },
  {
    nombre: "Robert Lewandowski",
    equipo: "FC Barcelona",
    posicion: "Delantero",
    edad: 37,
    goles: 26
  },
  {
    nombre: "Jude Bellingham",
    equipo: "Real Madrid",
    posicion: "Centrocampista",
    edad: 22,
    goles: 12
  },
  {
    nombre: "Vinicius Jr",
    equipo: "Real Madrid",
    posicion: "Extremo",
    edad: 25,
    goles: 18
  },
  {
    nombre: "Antoine Griezmann",
    equipo: "Atlético Madrid",
    posicion: "Delantero",
    edad: 34,
    goles: 15
  },
   {
    nombre: "Mikel Oyarzabal",
    equipo: "Real Sociedad",
    posicion: "Delantero",
    edad: 33,
    goles: 19
  },
   {
    nombre: "Marc Cubarsí",
    equipo: "FC Barcelona",
    posicion: "Defensa",
    edad: 18,
    goles: 1
  }
];

const lista =
  document.getElementById("lista-jugadores");

const buscador =
  document.getElementById("buscador-jugadores");

function mostrarJugadores(textoBusqueda = "") {

  let html = "";

  const filtrados = jugadores.filter(jugador => {

  const texto =
    textoBusqueda.toLowerCase();

  return (

    jugador.nombre
      .toLowerCase()
      .includes(texto)

    ||

    jugador.equipo
      .toLowerCase()
      .includes(texto)

    ||

    jugador.posicion
      .toLowerCase()
      .includes(texto)

  );

});

  filtrados.forEach(jugador => {

    html += `
      <div class="jugador-card">

        <h3>${jugador.nombre}</h3>

        <p><strong>Equipo:</strong> ${jugador.equipo}</p>

        <p><strong>Posición:</strong> ${jugador.posicion}</p>

        <p><strong>Edad:</strong> ${jugador.edad}</p>

        <p><strong>Goles:</strong> ⚽ ${jugador.goles}</p>

      </div>
    `;
  });

  lista.innerHTML = html;
}

mostrarJugadores();

buscador.addEventListener("input", () => {

  mostrarJugadores(
    buscador.value
  );

});