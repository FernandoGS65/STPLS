console.log("api.js cargado");
const API_KEY = "TU_API_KEY";

const API_BASE =
  "https://soccer.highlightly.net";

async function obtenerClasificacion() {

  try {

    const respuesta = await fetch(
      `${API_BASE}/standings?leagueId=119924&season=2025`,
      {
        headers: {
          "x-api-key": API_KEY
        }
      }
    );

    if (!respuesta.ok) {

      throw new Error(
        `Error API: ${respuesta.status}`
      );

    }

    const datos =
      await respuesta.json();

    return datos;

  } catch (error) {

    console.error(
      "Error obteniendo clasificación:",
      error
    );

    return null;

  }

}

