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
        contenedor.innerHTML = `
            <div class="video-embed-wrap">
                <iframe
                    src="${entry}"
                    class="video-embed-iframe"
                    allow="autoplay; encrypted-media; fullscreen"
                    allowfullscreen>
                </iframe>
            </div>`;
    } else {
        contenedor.innerHTML = `
            <div class="video-embed-wrap">
                <video
                    class="video-embed-native"
                    controls
                    playsinline
                    webkit-playsinline
                    preload="metadata"
                    poster="">
                    <source src="videos/${id}.mp4" type="video/mp4">
                </video>
            </div>`;
        setupNativeVideoFullscreen(contenedor.querySelector('video'));
    }

    setupLandscapeDetection();
}

function setupNativeVideoFullscreen(video) {
    if (!video) return;

    video.addEventListener('webkitbeginfullscreen', function() {
        document.documentElement.classList.add('video-fullscreen-active');
    });

    video.addEventListener('webkitendfullscreen', function() {
        document.documentElement.classList.remove('video-fullscreen-active');
    });

    video.addEventListener('fullscreenchange', function() {
        if (document.fullscreenElement) {
            document.documentElement.classList.add('video-fullscreen-active');
        } else {
            document.documentElement.classList.remove('video-fullscreen-active');
        }
    });
}

function setupLandscapeDetection() {
    function checkOrientation() {
        var isLandscape = window.orientation === 90 || window.orientation === -90;
        var isNarrow = window.innerWidth <= 900;

        if (isLandscape && isNarrow) {
            document.documentElement.classList.add('video-landscape-mode');
        } else {
            document.documentElement.classList.remove('video-landscape-mode');
        }
    }

    window.removeEventListener('orientationchange', checkOrientation);
    window.addEventListener('orientationchange', function() {
        setTimeout(checkOrientation, 150);
    });
    checkOrientation();
}

APP.onChange(function() { cargarVideo(); });
