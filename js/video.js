async function cargarVideo(){
    var params = new URLSearchParams(window.location.search);
    var id = params.get("id");
    var contenedor = document.getElementById("video-container");

    if (!id) {
        contenedor.innerHTML = "<p>Vídeo no encontrado.</p>";
        return;
    }

    var resp = await fetch(APP.ruta("videos"));
    var videos = await resp.json();
    var entry = videos[id];

    if (!entry) {
        contenedor.innerHTML = "<p>Vídeo no disponible.</p>";
        return;
    }

    var url = typeof entry === "string" ? entry : "";

    if (url.indexOf("youtube.com") !== -1 || url.indexOf("youtu.be") !== -1) {
        var ytId = "";
        if (url.indexOf("youtu.be/") !== -1) ytId = url.split("youtu.be/")[1].split("?")[0];
        else if (url.indexOf("v=") !== -1) ytId = url.split("v=")[1].split("&")[0];
        else if (url.indexOf("/embed/") !== -1) ytId = url.split("/embed/")[1].split("?")[0];
        if (ytId) {
            contenedor.innerHTML =
                '<div class="video-embed-wrap">' +
                    '<iframe class="video-embed-iframe" ' +
                        'src="https://www.youtube.com/embed/' + ytId + '?rel=0&modestbranding=1" ' +
                        'allowfullscreen ' +
                        'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" ' +
                        'frameborder="0">' +
                    '</iframe>' +
                '</div>';
            return;
        }
    }

    if (url.indexOf("rtve.es") !== -1) {
        contenedor.innerHTML =
            '<div class="video-embed-wrap">' +
                '<iframe class="video-embed-iframe" ' +
                    'src="' + url + '" ' +
                    'allowfullscreen ' +
                    'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" ' +
                    'frameborder="0">' +
                '</iframe>' +
            '</div>';
        return;
    }

    if (url && url.indexOf("http") === 0) {
        window.location.href = url;
        return;
    }

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

APP.onChange(function() { cargarVideo(); });
