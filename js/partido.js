(function() {
    const params = new URLSearchParams(window.location.search);
    const matchId = params.get("matchId");
    const elContent = document.getElementById("partido-content");
    const elHeader = document.getElementById("partido-header");
    const elInfo = document.getElementById("partido-info-bar");
    const elTabs = document.getElementById("partido-tabs");

    if (!matchId) { showError("No se especificó partido."); return; }

    Promise.all([
        fetch("./data/partidos/" + matchId + ".json").then(function(r) {
            if (!r.ok) throw new Error("El archivo de datos no existe en el servidor (HTTP " + r.status + "). Ejecuta fetch-partidos.ps1 para obtenerlo.");
            return r.json();
        }),
        fetch("./data/laliga2025.json").then(function(r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    ]).then(function(res) {
        var d = res[0];
        var liga = res[1];
        var b = liga.data.find(function(m) { return m.id == matchId; });
        if (!b) { showError("Partido no encontrado en laliga2025.json."); return; }
        render(d, b);
    }).catch(function(e) {
        showError("Error: " + e.message);
    });

    function showError(msg) {
        elContent.innerHTML = '<p style="padding:2rem;text-align:center;color:var(--text-muted);font-size:13px">' + msg + '</p>';
    }

    function render(d, b) {
        var home = d.homeTeam || b.homeTeam;
        var away = d.awayTeam || b.awayTeam;
        var score = (d.state && d.state.score && d.state.score.current) || (b.state && b.state.score && b.state.score.current) || "-";

        renderHeader(home, away, score, d, b);
        renderInfo(d, b);
        renderTabs(d, b, home, away);
    }

    /* ===== HEADER ===== */
    function renderHeader(home, away, score, d, b) {
        var r = (b.round || d.round || "");
        var numJ = r.split("-").length > 1 ? r.split("-")[1].trim() : "";
        var fechaObj = new Date(d.date || b.date);
        var fechaStr = isNaN(fechaObj.getTime()) ? "" : formatDate(fechaObj);
        var horaStr = isNaN(fechaObj.getTime()) ? "" : formatTime(fechaObj);

        elHeader.innerHTML =
            '<div class="pv-hero">' +
                '<div class="pv-vs">' +
                    '<div class="pv-team">' +
                        '<img src="' + home.logo + '" class="pv-logo" alt="' + escHtml(home.name) + '" onerror="this.src=\'imagenes/stpls-icon.png\'">' +
                        '<a href="equipo.html?id=' + encodeURIComponent(home.name) + '" class="pv-team-name">' + escHtml(home.name) + '</a>' +
                    '</div>' +
                    '<div class="pv-score-wrap">' +
                        '<div class="pv-score">' + escHtml(score) + '</div>' +
                    '</div>' +
                    '<div class="pv-team">' +
                        '<img src="' + away.logo + '" class="pv-logo" alt="' + escHtml(away.name) + '" onerror="this.src=\'imagenes/stpls-icon.png\'">' +
                        '<a href="equipo.html?id=' + encodeURIComponent(away.name) + '" class="pv-team-name">' + escHtml(away.name) + '</a>' +
                    '</div>' +
                '</div>' +
                '<div class="pv-meta"><span class="pv-meta-chip">📅 Jornada ' + escHtml(numJ) + ' · ' + escHtml(fechaStr) + ' · ' + escHtml(horaStr) + '</span></div>' +
            '</div>';
    }

    /* ===== INFO BAR ===== */
    function renderInfo(d, b) {
        var venue = d.venue;
        var referee = d.referee;
        var parts = [];
        if (venue) parts.push('🏟️ ' + escHtml(venue.name) + (venue.city ? ', ' + escHtml(venue.city) : ''));
        if (referee) parts.push('👤 ' + escHtml(referee.name));
        if (venue && venue.capacity) parts.push('👥 ' + parseInt(venue.capacity).toLocaleString('es-ES') + ' esp.');
        elInfo.innerHTML = parts.length ? '<div class="pv-info">' + parts.map(function(p) { return '<span>' + p + '</span>'; }).join('') + '</div>' : '';
    }

    /* ===== TABS ===== */
    function renderTabs(d, b, home, away) {
        var tabs = [];
        if (d.statistics && d.statistics.length) tabs.push("Estadísticas");
        tabs.push("Eventos");
        tabs.push("Alineaciones");
        tabs.push("Jugadores");
        if (d.predictions && d.predictions.prematch && d.predictions.prematch.length) tabs.push("Pronóstico");

        if (!tabs.length) { elContent.innerHTML = '<p style="padding:2rem;text-align:center;color:var(--text-muted);font-size:13px">Sin datos disponibles.</p>'; return; }

        var active = tabs[0];
        var tabHtml = '<div class="pv-tabs">';
        tabs.forEach(function(t) {
            tabHtml += '<button class="pv-tab' + (t === active ? ' active' : '') + '" data-tab="' + t + '">' + t + '</button>';
        });
        tabHtml += '</div>';
        elTabs.innerHTML = tabHtml;

        elTabs.querySelectorAll('.pv-tab').forEach(function(btn) {
            btn.addEventListener('click', function() {
                elTabs.querySelectorAll('.pv-tab').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                renderContent(btn.dataset.tab, d, b, home, away);
            });
        });

        renderContent(active, d, b, home, away);
    }

    function renderContent(tab, d, b, home, away) {
        if (tab === "Estadísticas") renderStats(d, b, home, away);
        else if (tab === "Eventos") renderEvents(d, b, home, away);
        else if (tab === "Alineaciones") renderLineups(d, b, home, away);
        else if (tab === "Jugadores") renderPlayers(d, b, home, away);
        else if (tab === "Pronóstico") renderPrediction(d, b, home, away);
    }

    /* ===== STATS ===== */
    function renderStats(d, b, home, away) {
        var stats = d.statistics;
        if (!stats || stats.length < 2) { elContent.innerHTML = '<p class="pv-empty">Sin estadísticas.</p>'; return; }

        var hName = stats[0].team.name;
        var aName = stats[1].team.name;
        var dict = {};
        stats[0].statistics.forEach(function(s) { dict[s.displayName] = [s.value]; });
        stats[1].statistics.forEach(function(s) {
            if (dict[s.displayName]) dict[s.displayName][1] = s.value;
            else dict[s.displayName][1] = s.value;
        });

        var keys = ["Ball Possession","Total Shots","Shots On Target","Shots Off Target","Corner Kicks","Fouls","Yellow Cards","Red Cards","Offsides"];
        var labels = {"Ball Possession":"Posesión","Total Shots":"Tiros","Shots On Target":"A puerta","Shots Off Target":"Fuera","Corner Kicks":"Córners","Fouls":"Faltas","Yellow Cards":"Amarillas","Red Cards":"Rojas","Offsides":"Fueras de juego"};
        var icons = {"Ball Possession":"🎯","Total Shots":"⚽","Shots On Target":"🎯","Shots Off Target":"👟","Corner Kicks":"🚩","Fouls":"🟡","Yellow Cards":"🟨","Red Cards":"🟥","Offsides":"🚩"};

        var html = '<div class="pv-section"><div class="pv-stats-card">';
        keys.forEach(function(k) {
            var v = dict[k];
            if (!v) return;
            var hv = parseFloat((v[0]||"0").toString().replace(",","."));
            var av = parseFloat((v[1]||"0").toString().replace(",","."));
            var total = hv + av || 1;
            var ph = Math.round(hv / total * 100);
            var pa = Math.round(av / total * 100);
            var label = labels[k] || k;
            var icon = icons[k] || "";

            html +=
                '<div class="pv-stat-row">' +
                    '<span class="pv-stat-icon">' + icon + '</span>' +
                    '<div class="pv-stat-info">' +
                        '<div class="pv-stat-label">' + label + '</div>' +
                        '<div class="pv-stat-bar-wrap">' +
                            '<span class="pv-stat-val local">' + (k === "Ball Possession" ? hv.toFixed(0) + '%' : (v[0]??"-")) + '</span>' +
                            '<div class="pv-bar-track">' +
                                '<div class="pv-bar-fill local" style="width:' + ph + '%"></div>' +
                                (ph < 100 && pa < 100 ? '<div class="pv-bar-gap"></div>' : '') +
                                '<div class="pv-bar-fill visit" style="width:' + pa + '%"></div>' +
                            '</div>' +
                            '<span class="pv-stat-val visit">' + (k === "Ball Possession" ? av.toFixed(0) + '%' : (v[1]??"-")) + '</span>' +
                        '</div>' +
                    '</div>' +
                '</div>';
        });
        html += '<div style="display:flex;justify-content:space-between;padding:8px 16px 6px;font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;border-top:1px solid var(--border-color)"><span>' + escHtml(hName) + '</span><span>' + escHtml(aName) + '</span></div>';
        html += '</div></div>';
        elContent.innerHTML = html;
    }

    /* ===== EVENTS (timeline) ===== */
    function renderEvents(d, b, home, away) {
        var evts = d.events;
        if (!evts || !evts.length) { elContent.innerHTML = '<p class="pv-empty">Sin eventos.</p>'; return; }

        var homeId = (d.homeTeam && d.homeTeam.id) || (b.homeTeam && b.homeTeam.id);
        var icons = {"Goal":"⚽","Penalty":"⚽","Own Goal":"⚽","Yellow Card":"🟨","Red Card":"🟥","Second Yellow Card":"🟨→🟥","Substitution":"🔄","Missed Penalty":"❌","VAR Goal Confirmed":"📺⚽","VAR Goal Cancelled":"📺❌","VAR Penalty":"📺⚖️"};

        function dotType(type) {
            if (type === "Goal" || type === "Penalty" || type === "Own Goal") return "goal";
            if (type.indexOf("Card") !== -1) return "card";
            if (type === "Substitution") return "sub";
            if (type.indexOf("VAR") !== -1) return "var";
            return "";
        }

        var html = '<div class="pv-section"><div class="pv-events-card">';
        evts.forEach(function(e) {
            var isHome = e.team && e.team.id === homeId;
            var side = isHome ? "local" : "visit";
            var icon = icons[e.type] || "📋";
            var desc = icon + ' ' + escHtml(e.player||"");
            var extra = "";
            if ((e.type === "Goal" || e.type === "Penalty") && e.assist) extra = escHtml(e.assist);
            if (e.type === "Substitution" && e.substituted) extra = 'Sale: ' + escHtml(e.substituted);
            var dt = dotType(e.type);

            html +=
                '<div class="pv-event">' +
                    '<div class="pv-event-col ' + side + '">' +
                        (isHome
                            ? '<div class="pv-event-body local"><span class="pv-event-time">' + escHtml(e.time) + '\'</span><span class="pv-event-desc">' + desc + (extra ? '<small>' + extra + '</small>' : '') + '</span></div>'
                            : '') +
                    '</div>' +
                    '<div class="pv-event-dot' + (dt ? ' ' + dt : '') + '"></div>' +
                    '<div class="pv-event-col ' + side + '">' +
                        (!isHome
                            ? '<div class="pv-event-body visit"><span class="pv-event-time">' + escHtml(e.time) + '\'</span><span class="pv-event-desc">' + desc + (extra ? '<small>' + extra + '</small>' : '') + '</span></div>'
                            : '') +
                    '</div>' +
                '</div>';
        });
        html += '</div></div>';
        elContent.innerHTML = html;
    }

    /* ===== LINEUPS ===== */
    function renderLineups(d, b, home, away) {
        if (!d.lineups) {
            elContent.innerHTML = '<div class="pv-section"><p class="pv-empty">Alineaciones no disponibles.<br><small>Se obtendrán al solicitar el modo lineups del script.</small></p></div>';
            return;
        }
        var logoHome = (d.homeTeam && d.homeTeam.logo) || (b.homeTeam && b.homeTeam.logo) || "";
        var logoAway = (d.awayTeam && d.awayTeam.logo) || (b.awayTeam && b.awayTeam.logo) || "";
        var logos = [logoHome, logoAway];
        var idx = 0;
        var html = '<div class="pv-section pv-lineups">';
        [d.lineups.homeTeam, d.lineups.awayTeam].forEach(function(t) {
            if (!t) return;
            html += '<div class="pv-lineup-card">';
            html += '<div class="pv-lineup-header">';
            if (logos[idx]) html += '<img src="' + logos[idx] + '" class="pv-lineup-shield" alt="">';
            html += '<h3>' + escHtml(t.name) + '</h3>';
            html += '<span class="pv-formation-badge">' + escHtml(t.formation) + '</span>';
            html += '</div>';
            html += '<div class="pv-field"><div class="pv-formation-grid">';
            t.initialLineup.forEach(function(row) {
                html += '<div class="pv-formation-row">';
                row.forEach(function(p) {
                    html += '<div class="pv-player-pin"><span class="pv-pin-num">' + (p.number||"") + '</span><span class="pv-pin-name">' + escHtml(p.name) + '</span></div>';
                });
                html += '</div>';
            });
            html += '</div></div>';
            if (t.substitutes && t.substitutes.length) {
                html += '<details class="pv-subs-card"><summary>🔁 Suplentes (' + t.substitutes.length + ')</summary><div class="pv-subs-grid">';
                t.substitutes.forEach(function(s) { html += '<span class="pv-sub-chip"><span class="sub-num">' + (s.number||"") + '</span> ' + escHtml(s.name) + '</span>'; });
                html += '</div></details>';
            }
            html += '</div>';
            idx++;
        });
        html += '</div>';
        elContent.innerHTML = html;
    }

    /* ===== PLAYERS (BOX SCORE) ===== */
    function renderPlayers(d, b, home, away) {
        if (!d.boxScore || !d.boxScore.length) {
            elContent.innerHTML = '<div class="pv-section"><p class="pv-empty">Datos de jugadores no disponibles.<br><small>Se obtendrán al solicitar el modo boxscore del script.</small></p></div>';
            return;
        }
        var html = '<div class="pv-section">';
        d.boxScore.forEach(function(box) {
            if (!box.players || !box.players.length) return;
            var sorted = box.players.slice().sort(function(a, b) {
                var order = {Goalkeeper:0, Defender:1, Midfielder:2, Forward:3};
                return (order[a.position]||9) - (order[b.position]||9);
            });
            var logoTeam = box.team.logo || "";
            html += '<div class="pv-box-card">';
            html += '<h3>' + (logoTeam ? '<img src="' + logoTeam + '" style="width:20px;height:20px;object-fit:contain">' : '') + escHtml(box.team.name) + '</h3>';
            html += '<div class="pv-box-scroll"><table class="pv-box-table"><thead><tr><th>#</th><th>Jugador</th><th>Pos</th><th>Min</th><th>G</th><th>A</th><th>TA</th><th>Val</th></tr></thead><tbody>';
            sorted.forEach(function(p) {
                var s = p.statistics && p.statistics[0] ? p.statistics[0] : {};
                var min = p.isSubstitute ? 'S' : (p.minutesPlayed||"-");
                html += '<tr><td>' + (p.shirtNumber||"") + '</td><td class="pv-box-name">' + escHtml(p.name) + '</td><td>' + posShort(p.position) + '</td><td class="pv-box-min">' + min + '</td><td class="pv-box-g">' + (s.goalsScored||0) + '</td><td class="pv-box-a">' + (s.assists||0) + '</td><td class="pv-box-ta">' + (s.cardsYellow||0) + '</td><td class="pv-box-rating">' + (p.matchRating||"-") + '</td></tr>';
            });
            html += '</tbody></table></div></div>';
        });
        html += '</div>';
        elContent.innerHTML = html;
    }

    /* ===== PREDICTION ===== */
    function renderPrediction(d, b, home, away) {
        var pre = d.predictions && d.predictions.prematch;
        if (!pre || !pre.length) { elContent.innerHTML = '<p class="pv-empty">Sin pronóstico.</p>'; return; }
        var three = null;
        pre.forEach(function(p) { if (p.modelType === "three-way") three = p; });
        if (!three) { elContent.innerHTML = '<p class="pv-empty">Sin pronóstico disponible.</p>'; return; }

        var prob = three.probabilities;
        var hName = (d.homeTeam && d.homeTeam.name) || "Local";
        var aName = (d.awayTeam && d.awayTeam.name) || "Visitante";

        var hVal = parseFloat(prob.home);
        var dVal = parseFloat(prob.draw);
        var aVal = parseFloat(prob.away);

        elContent.innerHTML =
            '<div class="pv-section"><div class="pv-pred-card">' +
                '<h3>📊 Pronóstico pre-partido</h3>' +
                '<div class="pv-pred-row"><span class="pv-pred-label">' + escHtml(hName) + '</span><div class="pv-pred-track"><div class="pv-pred-fill home" style="width:' + hVal + '%"></div></div><span class="pv-pred-val home">' + prob.home + '</span></div>' +
                '<div class="pv-pred-row"><span class="pv-pred-label">Empate</span><div class="pv-pred-track"><div class="pv-pred-fill draw" style="width:' + dVal + '%"></div></div><span class="pv-pred-val draw">' + prob.draw + '</span></div>' +
                '<div class="pv-pred-row"><span class="pv-pred-label">' + escHtml(aName) + '</span><div class="pv-pred-track"><div class="pv-pred-fill away" style="width:' + aVal + '%"></div></div><span class="pv-pred-val away">' + prob.away + '</span></div>' +
                (three.description ? '<p class="pv-pred-desc">💬 ' + escHtml(three.description) + '</p>' : '') +
            '</div></div>';
    }

    /* ===== HELPERS ===== */
    function formatDate(d) {
        try { return d.toLocaleDateString("es-ES", { weekday:"long", day:"numeric", month:"long", year:"numeric" }); }
        catch(e) { return d.toLocaleDateString(); }
    }
    function formatTime(d) {
        try { return d.toLocaleTimeString("es-ES", { hour:"2-digit", minute:"2-digit" }); }
        catch(e) { return d.toLocaleTimeString(); }
    }
    function posShort(pos) {
        var map = {Goalkeeper:"POR", Defender:"DEF", Midfielder:"MED", Forward:"DEL"};
        return map[pos] || (pos ? pos.substring(0,3) : "");
    }
    function escHtml(s) {
        if (s == null) return "";
        return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
    }
})();
