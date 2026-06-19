function obtenerParametro(nombre){

    const params =
        new URLSearchParams(
            window.location.search
        );

    return params.get(nombre);

}

async function cargarVideo(){

    const id =
        obtenerParametro("id");

    const contenedor =
        document.getElementById(
            "video-container"
        );

    if(!id){

        contenedor.innerHTML =
            "<p>Vídeo no encontrado.</p>";

        return;

    }

    contenedor.innerHTML = `

        <video
            controls
            autoplay
            style="
                width:100%;
                border-radius:12px;
            ">

            <source
                src="videos/${id}.mp4"
                type="video/mp4">

        </video>

    `;

}

cargarVideo();