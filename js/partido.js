(function() {
    const params = new URLSearchParams(window.location.search);
    const matchId = params.get("matchId");
    const elContent = document.getElementById("partido-content");
    const elHeader = document.getElementById("partido-header");
    const elInfo = document.getElementById("partido-info-bar");
    const elTabs = document.getElementById("partido-tabs");

    if (!matchId) { showError("No se especificó partido."); return; }

    function buildVideoKey(round, home, away) {
        var nn = round ? round.split("-").pop().trim() : "";
        if (nn.length < 2) nn = "0" + nn;
        function cln(s) {
            return s.replace(/[áàäâã]/g,"a").replace(/[éèëê]/g,"e").replace(/[íìïî]/g,"i")
                    .replace(/[óòöôõ]/g,"o").replace(/[úùüû]/g,"u").replace(/[ñ]/g,"n")
                    .replace(/[^a-zA-Z0-9]/g,"");
        }
        return "LL-J" + nn + "-" + cln(home) + "-" + cln(away);
    }

    var videoUrlCache = null;

    function cargarPartido() {
        Promise.all([
            fetch(APP.ruta("partido", matchId)).then(function(r) {
                return r.ok ? r.json() : null;
            }),
            fetch(APP.ruta("calendario")).then(function(r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }),
            fetch(APP.ruta("videos")).then(function(r) { return r.ok ? r.json() : null; })
        ]).then(function(res) {
            var d = res[0];
            var liga = res[1];
            var videos = res[2];
            var b = liga.data.find(function(m) { return m.id == matchId; });
            if (!b) { showError("Partido no encontrado en el calendario."); return; }

            if (videos) {
                var key = buildVideoKey(b.round, b.homeTeam.name, b.awayTeam.name);
                if (videos[key]) videoUrlCache = videos[key];
            }

            render(d, b);
        }).catch(function(e) {
            showError("Error: " + e.message);
        });
    }

    APP.onChange(function() { cargarPartido(); });

    function showError(msg) {
        elContent.innerHTML = '<p style="padding:2rem;text-align:center;color:var(--text-muted);font-size:13px">' + msg + '</p>';
    }

    function render(d, b) {
        var home = d ? d.homeTeam || b.homeTeam : b.homeTeam;
        var away = d ? d.awayTeam || b.awayTeam : b.awayTeam;
        var score = (d && d.state && d.state.score && d.state.score.current) || (b.state && b.state.score && b.state.score.current) || "-";

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
            '<div class="pv-header-bar">' +
                '<div class="pv-team">' +
                    '<img src="' + home.logo + '" class="pv-logo" alt="' + escHtml(home.name) + '" onerror="this.src=\'imagenes/stpls-icon.png\'">' +
                    '<a href="equipo.html?id=' + encodeURIComponent(home.name) + '" class="pv-team-name">' + escHtml(home.name) + '</a>' +
                '</div>' +
                '<div class="pv-score">' + escHtml(score) + '</div>' +
                '<div class="pv-team">' +
                    '<img src="' + away.logo + '" class="pv-logo" alt="' + escHtml(away.name) + '" onerror="this.src=\'imagenes/stpls-icon.png\'">' +
                    '<a href="equipo.html?id=' + encodeURIComponent(away.name) + '" class="pv-team-name">' + escHtml(away.name) + '</a>' +
                '</div>' +
            '</div>' +
            '<div class="pv-meta"><span class="pv-meta-chip">📅 Jornada ' + escHtml(numJ) + ' · ' + escHtml(fechaStr) + ' · ' + escHtml(horaStr) + '</span></div>';
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
        if (videoUrlCache) tabs.push("Resumen");
        if (d && d.statistics && d.statistics.length) tabs.push("Estadísticas");
        tabs.push("Eventos");
        tabs.push("Alineaciones");
        tabs.push("Jugadores");
        if (d && d.predictions && d.predictions.prematch && d.predictions.prematch.length) tabs.push("Pronóstico");

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
        if (tab === "Resumen") renderVideo(d, b, home, away);
        else if (tab === "Estadísticas") renderStats(d, b, home, away);
        else if (tab === "Eventos") renderEvents(d, b, home, away);
        else if (tab === "Alineaciones") renderLineups(d, b, home, away);
        else if (tab === "Jugadores") renderPlayers(d, b, home, away);
        else if (tab === "Pronóstico") renderPrediction(d, b, home, away);
    }

    /* ===== VIDEO ===== */
    function renderVideo(d, b, home, away) {
        if (!videoUrlCache) { elContent.innerHTML = '<p class="pv-empty">Resumen no disponible.</p>'; return; }
        elContent.innerHTML =
            '<div class="pv-section"><div class="pv-video-card">' +
                '<div class="pv-video-wrap" id="pv-video-placeholder">' +
                    '<div class="pv-video-overlay" id="pv-video-playbtn">' +
                        '<svg width="64" height="64" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="28" fill="rgba(0,0,0,.6)"/><path d="M26 21v22l18-11z" fill="#fff"/></svg>' +
                        '<p>Ver resumen</p>' +
                    '</div>' +
                '</div>' +
            '</div></div>';
        document.getElementById("pv-video-playbtn").onclick = function() {
            document.getElementById("pv-video-placeholder").innerHTML =
                '<iframe src="' + videoUrlCache + '" allowfullscreen frameborder="0" style="width:100%;height:100%;position:absolute;top:0;left:0"></iframe>';
        };
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

        var statOrder = [
            { key: "Possession", label: "Posesión", icon: "🎯", isPercent: true },
            { key: "Shots on target", label: "Tiros a puerta", icon: "⚽" },
            { key: "Total passes", label: "Total pases", icon: "👟" },
            { key: "Successful passes", label: "Pases completados", icon: "✅" },
            { key: "Big Chances Created", label: "Ocasiones claras", icon: "🌟" },
            { key: "Corners", label: "Córners", icon: "🚩" },
            { key: "Free Kicks", label: "Tiros libres", icon: "🦶" },
            { key: "Interceptions", label: "Intercepciones", icon: "🛑" },
            { key: "Dribbles", label: "Regates", icon: "🏃" },
            { key: "Fouls", label: "Faltas", icon: "🟡" },
            { key: "Yellow cards", label: "Tarjetas amarillas", icon: "🟨" },
            { key: "Offsides", label: "Fueras de juego", icon: "🚩" },
            { key: "Goalkeeper saves", label: "Paradas del portero", icon: "🧤" },
            { key: "Goal Kicks", label: "Saques de puerta", icon: "🥅" }
        ];

        var html = '<div class="pv-section"><div class="pv-stats-card">';
        statOrder.forEach(function(s) {
            var v = dict[s.key];
            if (!v) return;
            var hv = parseFloat((v[0]||"0").toString().replace(",","."));
            var av = parseFloat((v[1]||"0").toString().replace(",","."));
            var total = hv + av || 1;
            var ph = Math.round(hv / total * 100);
            var pa = Math.round(av / total * 100);
            var hDisplay = s.isPercent ? hv.toFixed(0) + '%' : (v[0] ?? "-");
            var aDisplay = s.isPercent ? av.toFixed(0) + '%' : (v[1] ?? "-");

            html +=
                '<div class="pv-stat-row">' +
                    '<span class="pv-stat-icon">' + s.icon + '</span>' +
                    '<div class="pv-stat-info">' +
                        '<div class="pv-stat-label">' + s.label + '</div>' +
                        '<div class="pv-stat-bar-wrap">' +
                            '<span class="pv-stat-val local">' + hDisplay + '</span>' +
                            '<div class="pv-bar-track">' +
                                '<div class="pv-bar-fill local" style="width:' + ph + '%"></div>' +
                                (ph < 100 && pa < 100 ? '<div class="pv-bar-gap"></div>' : '') +
                                '<div class="pv-bar-fill visit" style="width:' + pa + '%"></div>' +
                            '</div>' +
                            '<span class="pv-stat-val visit">' + aDisplay + '</span>' +
                        '</div>' +
                    '</div>' +
                '</div>';
        });
        html += '<div class="pv-stat-footer"><span>' + escHtml(hName) + '</span><span>' + escHtml(aName) + '</span></div>';
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

    /* ===== LINEUPS (pitch view) ===== */
    function renderLineups(d, b, home, away) {
        if (!d.lineups) {
            elContent.innerHTML = '<div class="pv-section"><p class="pv-empty">Alineaciones no disponibles.<br><small>Se obtendrán al solicitar el modo lineups del script.</small></p></div>';
            return;
        }

        // Cross-reference cards & goals from events
        var cardByName = {}, cardById = {};
        var goalByName = {}, goalById = {};
        if (d.events) {
            d.events.forEach(function(e) {
                var code = null;
                if (e.type === "Yellow Card") code = "yellow";
                else if (e.type === "Red Card") code = "red";
                else if (e.type === "Second Yellow Card") code = "yr";
                if (code && e.player) cardByName[e.player] = code;
                if (code && e.playerId) cardById[e.playerId] = code;
                if ((e.type === "Goal" || e.type === "Penalty") && e.player) {
                    goalByName[e.player] = true;
                    if (e.playerId) goalById[e.playerId] = true;
                }
            });
        }

        function getCard(p) {
            return (p.id && cardById[p.id]) || cardByName[p.name] || null;
        }
        function hasGoal(p) {
            return (p.id && goalById[p.id]) || goalByName[p.name] || false;
        }

        var html = '<div class="pv-section"><div class="pv-lineups-new">';

        [d.lineups.homeTeam, d.lineups.awayTeam].forEach(function(t) {
            if (!t) return;

            html += '<div class="pv-pitch-card">';
            html += '<div class="pv-pitch-header">';
            html += '<img src="' + escHtml(t.logo || 'imagenes/stpls-icon.png') + '" class="pv-pitch-shield" alt="" onerror="this.src=\'imagenes/stpls-icon.png\'">';
            html += '<h3>' + escHtml(t.name) + '</h3>';
            html += '<span class="pv-pitch-form">' + escHtml(t.formation) + '</span>';
            html += '</div>';

            // Pitch with markings
            html += '<div class="pv-pitch-wrap"><div class="pv-pitch">';
            html += '<div class="pv-pitch-spot"></div>';
            html += '<div class="pv-pitch-pa-b"></div><div class="pv-pitch-pa-t"></div>';
            html += '<div class="pv-pitch-ga-b"></div><div class="pv-pitch-ga-t"></div>';
            html += '<div class="pv-pitch-ps-b"></div><div class="pv-pitch-ps-t"></div>';

            // Players
            html += '<div class="pv-pitch-players">';
            var rows = t.initialLineup;
            var numRows = rows.length;
            rows.forEach(function(row, ri) {
                // Vertical: GK(ri=0) near bottom, forwards at top
                var topPct = numRows <= 1 ? 50 : 84 - (ri / (numRows - 1)) * 70;

                var count = row.length;
                var spacing = count <= 1 ? 0 : Math.min(72 / (count - 1), 26);
                var startX = count <= 1 ? 50 : 50 - ((count - 1) * spacing) / 2;

                row.forEach(function(p, pi) {
                    var leftPct = count <= 1 ? 50 : startX + pi * spacing;
                    if (leftPct < 8) leftPct = 8;
                    if (leftPct > 92) leftPct = 92;

                    var card = getCard(p);
                    var goal = hasGoal(p);

                    html += '<div class="pv-pitch-player" style="top:' + topPct + '%;left:' + leftPct + '%">';
                    html += '<div class="pv-pitch-badge">';
                    html += '<span class="pv-badge-num">' + (p.number || '') + '</span>';
                    html += '<span class="pv-badge-name">' + escHtml(p.name) + '</span>';
                    html += '</div>';
                    if (card || goal) {
                        html += '<div class="pv-player-card-indicator">';
                        if (goal) html += '<span class="pv-player-goal">⚽</span>';
                        if (card) html += '<span class="pv-player-card ' + card + '"></span>';
                        html += '</div>';
                    }
                    html += '</div>';
                });
            });
            html += '</div></div></div>'; // close pitch-players, pitch, pitch-wrap

            // Substitutes
            if (t.substitutes && t.substitutes.length) {
                html += '<details class="pv-pitch-subs"><summary>Suplentes (' + t.substitutes.length + ')</summary>';
                html += '<div class="pv-pitch-subs-list">';
                t.substitutes.forEach(function(s) {
                    var card = getCard(s);
                    html += '<span class="pv-subs-item">';
                    html += '<span class="pv-subs-num">' + (s.number || '') + '</span>';
                    html += escHtml(s.name);
                    if (card) {
                        html += '<span class="pv-subs-card-indicator"><span class="pv-player-card ' + card + '"></span></span>';
                    }
                    html += '</span>';
                });
                html += '</div></details>';
            }

            html += '</div>'; // close pitch-card
        });

        html += '</div></div>';
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
