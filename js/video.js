async function cargarVideo(){
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const contenedor = document.getElementById("video-container");

    if (!id) {
        contenedor.innerHTML = "<p>Vídeo no encontrado.</p>";
        return;
    }

    const resp = await fetch("./data/videos.json");
    const videos = await resp.json();
    const entry = videos[id];

    if (!entry) {
        contenedor.innerHTML = "<p>Vídeo no disponible.</p>";
        return;
    }

    if (typeof entry === "string" && entry.startsWith("http")) {
        contenedor.innerHTML = `
            <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;">
                <iframe
                    src="${entry}"
                    style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;"
                    allow="autoplay; encrypted-media"
                    allowfullscreen>
                </iframe>
            </div>`;
    } else {
        contenedor.innerHTML = `
            <video controls autoplay style="width:100%;border-radius:12px;">
                <source src="videos/${id}.mp4" type="video/mp4">
            </video>`;
    }
}

cargarVideo();
