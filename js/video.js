async function cargarVideo(){
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const contenedor = document.getElementById("video-container");

    if (!id) {
        contenedor.innerHTML = "<p>Vídeo no encontrado.</p>";
        return;
    }

    const resp = await fetch(APP.ruta("videos"));
    const videos = await resp.json();
    const entry = videos[id];

    if (!entry) {
        contenedor.innerHTML = "<p>Vídeo no disponible.</p>";
        return;
    }

    if (typeof entry === "string" && entry.startsWith("http")) {
        contenedor.innerHTML =
            '<div class="video-embed-wrap">' +
                '<iframe ' +
                    'src="' + entry + '" ' +
                    'class="video-embed-iframe" ' +
                    'allow="autoplay; encrypted-media; fullscreen" ' +
                    'allowfullscreen>' +
                '</iframe>' +
            '</div>';
    } else {
        contenedor.innerHTML =
            '<div class="video-embed-wrap">' +
                '<video ' +
                    'class="video-embed-native" ' +
                    'controls ' +
                    'playsinline ' +
                    'webkit-playsinline ' +
                    'preload="metadata">' +
                    '<source src="videos/' + id + '.mp4" type="video/mp4">' +
                '</video>' +
            '</div>';
    }
}

APP.onChange(function() { cargarVideo(); });
