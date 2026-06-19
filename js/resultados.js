async function cargarResultados() {

    try {

        const respuesta =
            await fetch(
                "./data/laliga2025.json"
            );

        const datos =
            await respuesta.json();

            const respuestaVideos =
    await fetch(
        "./data/videos.json"
    );

const videos =
    await respuestaVideos.json();

        const partidos =
            datos.data;

        const selector =
            document.getElementById(
                "selector-jornada"
            );

        selector.innerHTML = "";

        const jornadas =
            [...new Set(
                partidos.map(
                    p => p.round
                )
            )];

        jornadas.sort((a, b) => {

            const na =
                parseInt(
                    a.split("-")[1]
                );

            const nb =
                parseInt(
                    b.split("-")[1]
                );

            return nb - na;

        });

        jornadas.forEach(jornada => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                jornada;

            option.textContent =
                "Jornada " +
                jornada.split("-")[1].trim();

            selector.appendChild(
                option
            );

        });

        mostrarJornada(
    jornadas[0],
    partidos,
    videos
);
        selector.addEventListener(
            "change",
            () => {

                mostrarJornada(
    selector.value,
    partidos,
    videos
);

            }
        );

    }

    catch(error){

        console.error(
            "ERROR:",
            error
        );

    }

}

function normalizarEquipo(nombre){

    return nombre
        .replaceAll(" ", "")
        .replaceAll("á","a")
        .replaceAll("é","e")
        .replaceAll("í","i")
        .replaceAll("ó","o")
        .replaceAll("ú","u");
}


function mostrarJornada(
    jornada,
    partidos,
    videos
){

    const contenedor =
        document.getElementById(
            "lista-resultados"
        );

    const filtrados =
        partidos.filter(
            p => p.round === jornada
        );

    filtrados.sort((a,b)=>
        new Date(a.date) -
        new Date(b.date)
    );

    contenedor.innerHTML = "";

    filtrados.forEach(partido => {

        const card =
            document.createElement(
                "div"
            );

        card.className =
            "resultado-card";

        const resultado =
            partido.state?.score?.current
            || "-";

 const numeroJornada =
    jornada
        .split("-")[1]
        .trim()
        .padStart(2,"0");

const videoId =

    `LL-J${numeroJornada}-` +

    `${normalizarEquipo(
        partido.homeTeam.name
    )}-` +

    `${normalizarEquipo(
        partido.awayTeam.name
    )}`;

const tieneVideo =
    videos[videoId];
        const fecha = new Date(partido.date);
        const fechaStr = fecha.toLocaleDateString("es-ES", {
            weekday:"short", day:"numeric", month:"short"
        });
        const horaStr = fecha.toLocaleTimeString("es-ES", {
            hour:"2-digit", minute:"2-digit"
        });

        card.innerHTML = `

    <div class="resultado-fecha">${fechaStr} · ${horaStr}</div>

    <div class="equipo-local">

        <img
            src="${partido.homeTeam.logo}"
            class="escudo-partido"
            alt="${partido.homeTeam.name}">

       <a
    href="equipo.html?id=${encodeURIComponent(
        partido.homeTeam.name
    )}"
    class="link-equipo">

    ${partido.homeTeam.name}

</a>

    </div>

 <div class="resultado-centro">

    ${resultado}

</div>

<div class="equipo-visitante">

    <a
        href="equipo.html?id=${encodeURIComponent(
            partido.awayTeam.name
        )}"
        class="link-equipo">

        ${partido.awayTeam.name}

    </a>

    <img
        src="${partido.awayTeam.logo}"
        class="escudo-partido"
        alt="${partido.awayTeam.name}">

</div>

<div class="video-resultado${tieneVideo ? '' : ' video-resultado--empty'}">
    ${tieneVideo ? `<a href="video.html?id=${videoId}">🎥</a>` : ''}
</div>

`;

        contenedor.appendChild(
            card
        );

    });

}

cargarResultados();