(async function () {
    const params = new URLSearchParams(window.location.search);
    const matchId = params.get("matchId");
    if (!matchId) { document.getElementById("partido-content").innerHTML = "<p style='padding:2rem;text-align:center'>No se especificó partido.</p>"; return; }

    try {
        const [detalle, liga] = await Promise.all([
            fetch(`./data/partidos/${matchId}.json`).then(r => r.json()),
            fetch("./data/laliga2025.json").then(r => r.json())
        ]);

        const basico = liga.data.find(m => m.id == matchId);
        if (!basico) throw new Error("Partido no encontrado en laliga2025.json");

        render(detalle, basico);
    } catch (e) {
        document.getElementById("partido-content").innerHTML = `<p style='padding:2rem;text-align:center'>Error: ${e.message}</p>`;
    }
})();

function render(d, b) {
    const home = d.homeTeam || b.homeTeam;
    const away = d.awayTeam || b.awayTeam;
    const score = d.state?.score?.current || b.state?.score?.current || "-";

    renderHeader(home, away, score, d, b);
    renderInfoBar(d, b);
    renderTabs(d, b);
}

function renderHeader(home, away, score, d, b) {
    const numJornada = (b.round || d.round || "").split("-")[1]?.trim() || "";
    const fecha = new Date(d.date || b.date).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const hora = new Date(d.date || b.date).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

    const el = document.getElementById("partido-header");
    el.innerHTML = `
        <div class="partido-vs">
            <div class="partido-equipo">
                <img src="${home.logo}" class="escudo-grande" alt="${home.name}" onerror="this.src='imagenes/stpls-icon.png'">
                <a href="equipo.html?id=${encodeURIComponent(home.name)}" class="link-equipo">${home.name}</a>
            </div>
            <div class="partido-score">${score}</div>
            <div class="partido-equipo">
                <img src="${away.logo}" class="escudo-grande" alt="${away.name}" onerror="this.src='imagenes/stpls-icon.png'">
                <a href="equipo.html?id=${encodeURIComponent(away.name)}" class="link-equipo">${away.name}</a>
            </div>
        </div>
        <div class="partido-meta">Jornada ${numJornada} · ${fecha} · ${hora}</div>
    `;
}

function renderInfoBar(d, b) {
    const venue = d.venue;
    const referee = d.referee;
    const forecast = d.forecast;
    const estado = d.state?.description || b.state?.description || "";

    let html = `<div class="partido-info-bar">`;
    if (venue) html += `<span>🏟 ${venue.name}${venue.city ? `, ${venue.city}` : ""}</span>`;
    if (referee) html += `<span>👤 Árbitro: ${referee.name}</span>`;
    if (forecast) html += `<span>🌡 ${forecast.temperature}${forecast.status ? `, ${forecast.status}` : ""}</span>`;
    if (estado) html += `<span class="partido-estado">${estado}</span>`;
    if (venue?.capacity) html += `<span>👥 ${parseInt(venue.capacity).toLocaleString("es-ES")} esp.</span>`;
    html += `</div>`;
    document.getElementById("partido-info-bar").innerHTML = html;
}

function renderTabs(d, b) {
    const tabs = ["Estadísticas", "Eventos", "Alineaciones", "Jugadores", "Pronóstico"];
    if (!d.statistics?.length) tabs.splice(0, 1);
    if (!d.events?.length) tabs.splice(1, 1);
    if (!d.predictions?.prematch?.length) tabs.splice(tabs.indexOf("Pronóstico"), 1);
    if (!d.lineups) {
        // Lineups not fetched yet - will add later
    }

    const tabBar = document.getElementById("partido-tabs");
    const content = document.getElementById("partido-content");

    let activeTab = tabs[0] || "Estadísticas";

    function switchTab(name) {
        activeTab = name;
        tabBar.querySelectorAll(".partido-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === name));
        renderTabContent(name, d, b);
    }

    tabBar.innerHTML = `<div class="partido-tabs">${tabs.map(t => `<button class="partido-tab${t === activeTab ? " active" : ""}" data-tab="${t}">${t}</button>`).join("")}</div>`;
    tabBar.querySelectorAll(".partido-tab").forEach(btn => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));

    renderTabContent(activeTab, d, b);
}

function renderTabContent(tab, d, b) {
    const el = document.getElementById("partido-content");
    if (tab === "Estadísticas") renderEstadisticas(el, d);
    else if (tab === "Eventos") renderEventos(el, d);
    else if (tab === "Alineaciones") renderAlineaciones(el, d);
    else if (tab === "Jugadores") renderJugadores(el, d);
    else if (tab === "Pronóstico") renderPronostico(el, d);
}

function renderEstadisticas(el, d) {
    const stats = d.statistics;
    if (!stats?.length) { el.innerHTML = "<p class='partido-empty'>Sin estadísticas disponibles.</p>"; return; }

    const pares = {};
    const importantes = ["Ball Possession", "Total Shots", "Shots On Target", "Shots Off Target", "Corner Kicks", "Fouls", "Yellow Cards", "Red Cards", "Offsides"];
    const nombres = { "Ball Possession": "Posesión", "Total Shots": "Tiros totales", "Shots On Target": "Tiros a puerta", "Shots Off Target": "Tiros fuera", "Corner Kicks": "Córners", "Fouls": "Faltas", "Yellow Cards": "Tarjetas amarillas", "Red Cards": "Tarjetas rojas", "Offsides": "Fueras de juego" };

    stats[0].statistics.forEach(s => { pares[s.displayName] = [s.value]; });
    stats[1].statistics.forEach(s => { if (pares[s.displayName]) pares[s.displayName][1] = s.value; else pares[s.displayName] = [null, s.value]; });

    const hName = stats[0].team.name;
    const aName = stats[1].team.name;

    let html = `<div class="partido-stats">`;
    importantes.forEach(n => {
        const v = pares[n];
        if (!v) return;
        const h = parseFloat((v[0] || "0").toString().replace(",", "."));
        const a = parseFloat((v[1] || "0").toString().replace(",", "."));
        const total = h + a || 1;
        const pH = (h / total * 100).toFixed(0);
        const pA = (a / total * 100).toFixed(0);
        const label = nombres[n] || n;

        if (n === "Ball Possession") {
            html += `
                <div class="stat-row possession">
                    <span class="stat-home">${h.toFixed(0)}%</span>
                    <div class="stat-bar"><div class="stat-fill" style="width:${pH}%"></div></div>
                    <span class="stat-label">${label}</span>
                    <div class="stat-bar"><div class="stat-fill away" style="width:${pA}%"></div></div>
                    <span class="stat-away">${a.toFixed(0)}%</span>
                </div>`;
        } else {
            html += `
                <div class="stat-row">
                    <span class="stat-home">${v[0] ?? "-"}</span>
                    <div class="stat-bar"><div class="stat-fill" style="width:${pH}%"></div></div>
                    <span class="stat-label">${label}</span>
                    <div class="stat-bar"><div class="stat-fill away" style="width:${pA}%"></div></div>
                    <span class="stat-away">${v[1] ?? "-"}</span>
                </div>`;
        }
    });
    html += `</div>`;
    html += `<div class="stat-teams"><span>${hName}</span><span>${aName}</span></div>`;
    el.innerHTML = html;
}

function renderEventos(el, d) {
    const evts = d.events;
    if (!evts?.length) { el.innerHTML = "<p class='partido-empty'>Sin eventos disponibles.</p>"; return; }

    const homeId = d.homeTeam?.id || d.homeTeam?.id;
    const iconos = {
        "Goal": "⚽", "Penalty": "⚽", "Own Goal": "⚽",
        "Yellow Card": "🟨", "Red Card": "🟥", "Second Yellow Card": "🟨",
        "Substitution": "🔄",
        "Missed Penalty": "❌",
        "VAR Goal Confirmed": "📺⚽", "VAR Goal Cancelled": "📺❌", "VAR Penalty": "📺"
    };

    let html = `<div class="partido-eventos">`;
    evts.forEach(e => {
        const isHome = e.team?.id === (d.homeTeam?.id || d.homeTeam?.id);
        const icono = iconos[e.type] || "📋";
        let desc = `${icono} ${e.player || ""}`;
        if (e.type === "Goal" && e.assist) desc += ` (${e.assist})`;
        if (e.type === "Substitution" && e.substituted) desc += ` → ${e.substituted}`;

        html += `
            <div class="evento-row ${isHome ? "home" : "away"}">
                ${isHome ? `<span class="evento-time">${e.time}'</span><span class="evento-desc">${desc}</span>` : `<span class="evento-desc">${desc}</span><span class="evento-time">${e.time}'</span>`}
            </div>`;
    });
    html += `</div>`;
    el.innerHTML = html;
}

function renderAlineaciones(el, d) {
    if (!d.lineups) {
        el.innerHTML = "<p class='partido-empty'>Alineaciones no disponibles aún. Se obtendrán en próximas cargas.</p>";
        return;
    }

    function renderTeam(t, label) {
        if (!t?.initialLineup?.length) return "";
        let html = `<div class="lineup-team"><h3>${label} · ${t.formation}</h3><div class="lineup-grid">`;
        t.initialLineup.forEach(row => {
            html += `<div class="lineup-row">`;
            row.forEach(p => {
                html += `<div class="lineup-player"><span class="player-num">${p.number}</span><span class="player-name">${p.name}</span></div>`;
            });
            html += `</div>`;
        });
        if (t.substitutes?.length) {
            html += `<div class="lineup-subs"><h4>Suplentes</h4><div class="subs-list">`;
            t.substitutes.forEach(s => {
                html += `<span class="sub-item">${s.number} ${s.name}</span>`;
            });
            html += `</div></div>`;
        }
        html += `</div></div>`;
        return html;
    }

    el.innerHTML = `<div class="lineups-container">${renderTeam(d.lineups.homeTeam, "Local")}${renderTeam(d.lineups.awayTeam, "Visitante")}</div>`;
}

function renderJugadores(el, d) {
    if (!d.boxScore?.length) {
        el.innerHTML = "<p class='partido-empty'>Estadísticas de jugadores no disponibles aún.</p>";
        return;
    }

    const posOrder = { "Goalkeeper": 0, "Defender": 1, "Midfielder": 2, "Forward": 3 };

    function renderTeamBox(teamBox) {
        if (!teamBox?.players?.length) return "";
        const sorted = [...teamBox.players].sort((a, b) => (posOrder[a.position] ?? 9) - (posOrder[b.position] ?? 9));
        let html = `<div class="box-team"><h3>${teamBox.team.name}</h3><table class="box-table"><thead><tr><th>#</th><th>Jugador</th><th>Pos</th><th>Min</th><th>G</th><th>A</th><th>TA</th><th>Val</th></tr></thead><tbody>`;
        sorted.forEach(p => {
            const s = p.statistics?.[0] || {};
            html += `<tr><td>${p.shirtNumber ?? ""}</td><td class="player-name-cell">${p.name}</td><td>${abreviarPos(p.position)}</td><td>${p.isSubstitute ? "S" : p.minutesPlayed || "-"}</td><td>${s.goalsScored ?? 0}</td><td>${s.assists ?? 0}</td><td>${s.cardsYellow ?? 0}</td><td>${p.matchRating || "-"}</td></tr>`;
        });
        html += `</tbody></table></div>`;
        return html;
    }

    let html = `<div class="box-container">`;
    d.boxScore.forEach(b => html += renderTeamBox(b));
    html += `</div>`;
    el.innerHTML = html;
}

function renderPronostico(el, d) {
    const pre = d.predictions?.prematch;
    if (!pre?.length) { el.innerHTML = "<p class='partido-empty'>Sin pronóstico disponible.</p>"; return; }

    const tres = pre.find(p => p.modelType === "three-way");
    if (!tres) { el.innerHTML = "<p class='partido-empty'>Sin pronóstico disponible.</p>"; return; }

    const prob = tres.probabilities;
    const hName = d.homeTeam?.name || "Local";
    const aName = d.awayTeam?.name || "Visitante";

    el.innerHTML = `
        <div class="prediction-box">
            <h3>Pronóstico pre-partido</h3>
            <div class="prediction-bars">
                <div class="pred-row"><span class="pred-label">${hName}</span><div class="pred-bar"><div class="pred-fill home" style="width:${parseFloat(prob.home)}%"></div></div><span class="pred-val">${prob.home}</span></div>
                <div class="pred-row"><span class="pred-label">Empate</span><div class="pred-bar"><div class="pred-fill draw" style="width:${parseFloat(prob.draw)}%"></div></div><span class="pred-val">${prob.draw}</span></div>
                <div class="pred-row"><span class="pred-label">${aName}</span><div class="pred-bar"><div class="pred-fill away" style="width:${parseFloat(prob.away)}%"></div></div><span class="pred-val">${prob.away}</span></div>
            </div>
            ${tres.description ? `<p class="pred-desc">${tres.description}</p>` : ""}
        </div>`;
}

function abreviarPos(pos) {
    const map = { "Goalkeeper": "POR", "Defender": "DEF", "Midfielder": "MED", "Forward": "DEL" };
    return map[pos] || pos?.substring(0, 3) || "";
}
