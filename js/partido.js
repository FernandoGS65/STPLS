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

    var plantillaCache = null;

    async function cargarPartido() {
        try {
            var d = null;
            var videos = null;

            // Try Supabase full detail first
            if (window.STPLS_API && window.STPLS_API.fetchMatchFullDetail) {
                try {
                    d = await window.STPLS_API.fetchMatchFullDetail(matchId);
                } catch (supErr) {
                    console.warn('Supabase match full detail failed:', supErr);
                }
            }

            // Fallback to JSON file
            if (!d) {
                try {
                    var detResp = await fetch(APP.ruta("partido", matchId));
                    if (detResp.ok) d = await detResp.json();
                } catch (e) {
                    console.warn('Match detail JSON failed:', e);
                }
            }

            if (!d) { showError("Partido no encontrado."); return; }

            // Load videos
            try {
                if (window.STPLS_API && window.STPLS_API.fetchVideos) {
                    videos = await window.STPLS_API.fetchVideos();
                }
            } catch (e) {
                console.warn('Supabase videos failed:', e);
            }
            if (!videos) {
                try {
                    var vidResp = await fetch(APP.ruta("videos"));
                    if (vidResp.ok) videos = await vidResp.json();
                } catch (e) {
                    console.warn('Videos JSON failed:', e);
                }
            }
            if (videos) {
                var key = buildVideoKey(d.round, d.homeTeam.name, d.awayTeam.name);
                if (videos[key]) videoUrlCache = videos[key];
            }

            if (!plantillaCache) {
                try {
                    var planResp = await fetch(APP.ruta("plantilla"));
                    if (planResp.ok) plantillaCache = await planResp.json();
                } catch (e) {
                    console.warn('Plantilla JSON failed:', e);
                }
            }

            render(d, d);
        } catch (e) {
            showError("Error: " + e.message);
        }
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
                    '<img src="' + APP.fixLogo(home.logo) + '" class="pv-logo" alt="' + escHtml(home.name) + '" onerror="this.src=\'imagenes/stpls-icon.png\'">' +
                    '<a href="equipo.html?id=' + encodeURIComponent(home.name) + '" class="pv-team-name">' + escHtml(home.name) + '</a>' +
                '</div>' +
                '<div class="pv-score">' + escHtml(score) + '</div>' +
                '<div class="pv-team">' +
                    '<img src="' + APP.fixLogo(away.logo) + '" class="pv-logo" alt="' + escHtml(away.name) + '" onerror="this.src=\'imagenes/stpls-icon.png\'">' +
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
        if (referee && referee.name) {
            parts.push('👤 <a href="arbitros.html?nombre=' + encodeURIComponent(referee.name) + '" class="pv-info-link">' + escHtml(referee.name) + '</a>');
        }
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
            var src = videoUrlCache;
            var iframeSrc = src;
            if (src.indexOf("youtube.com") !== -1 || src.indexOf("youtu.be") !== -1) {
                var ytId = "";
                if (src.indexOf("youtu.be/") !== -1) ytId = src.split("youtu.be/")[1].split("?")[0];
                else if (src.indexOf("v=") !== -1) ytId = src.split("v=")[1].split("&")[0];
                else if (src.indexOf("/embed/") !== -1) ytId = src.split("/embed/")[1].split("?")[0];
                if (ytId) iframeSrc = "https://www.youtube.com/embed/" + ytId + "?rel=0&modestbranding=1";
            }
            document.getElementById("pv-video-placeholder").innerHTML =
                '<iframe class="pv-video-iframe" src="' + iframeSrc + '" ' +
                'allowfullscreen ' +
                'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" ' +
                'frameborder="0"></iframe>';
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
            { key: "Red cards", label: "Tarjetas rojas", icon: "🟥" },
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
            var hDisplay = s.isPercent ? Math.round(hv * 100) + '%' : (v[0] ?? "-");
            var aDisplay = s.isPercent ? Math.round(av * 100) + '%' : (v[1] ?? "-");

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
        function dotLetter(type) {
            if (type === "Goal" || type === "Penalty" || type === "Own Goal") return "G";
            if (type.indexOf("Card") !== -1) return "T";
            if (type === "Substitution") return "S";
            if (type.indexOf("VAR") !== -1) return "V";
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
                    '<div class="pv-event-dot' + (dt ? ' ' + dt : '') + '">' + dotLetter(e.type) + '</div>' +
                    '<div class="pv-event-col ' + side + '">' +
                        (!isHome
                            ? '<div class="pv-event-body visit"><span class="pv-event-time">' + escHtml(e.time) + '\'</span><span class="pv-event-desc">' + desc + (extra ? '<small>' + extra + '</small>' : '') + '</span></div>'
                            : '') +
                    '</div>' +
                '</div>';
        });
        html += '<div class="pv-events-legend">';
        html += '<div class="pv-legend-item"><div class="pv-legend-dot" style="background:var(--accent-green)"></div>Gol</div>';
        html += '<div class="pv-legend-item"><div class="pv-legend-dot" style="background:var(--accent-gold)"></div>Tarjeta</div>';
        html += '<div class="pv-legend-item"><div class="pv-legend-dot" style="background:var(--accent-cyan)"></div>Sust.</div>';
        html += '<div class="pv-legend-item"><div class="pv-legend-dot" style="background:var(--accent-violet)"></div>VAR</div>';
        html += '</div>';
        html += '</div></div>';
        elContent.innerHTML = html;
    }

    /* ===== LINEUPS (single pitch view) ===== */
    function renderLineups(d, b, home, away) {
        if (!d.lineups) {
            elContent.innerHTML = '<div class="pv-section"><p class="pv-empty">Alineaciones no disponibles.<br><small>Se obtendrán al solicitar el modo lineups del script.</small></p></div>';
            return;
        }

        var homeT = d.lineups.homeTeam;
        var awayT = d.lineups.awayTeam;
        if (!homeT && !awayT) {
            elContent.innerHTML = '<div class="pv-section"><p class="pv-empty">Alineaciones no disponibles.</p></div>';
            return;
        }

        var ratingById = {};
        var bsPlayers = d.boxScore && (d.boxScore.value || d.boxScore);
        if (Array.isArray(bsPlayers)) {
            bsPlayers.forEach(function(box) {
                if (box.players) box.players.forEach(function(p) {
                    if (p.id && p.matchRating) ratingById[p.id] = p.matchRating;
                });
            });
        }

        var cardByName = {}, cardById = {};
        var goalCountById = {};
        var goalCountByName = {};
        var subEvents = [];
        if (d.events) {
            d.events.forEach(function(e) {
                var code = null;
                if (e.type === "Yellow Card") code = "yellow";
                else if (e.type === "Red Card") code = "red";
                else if (e.type === "Second Yellow Card") code = "yr";
                if (code && e.player) cardByName[e.player] = code;
                if (code && e.playerId) cardById[e.playerId] = code;
                if ((e.type === "Goal" || e.type === "Penalty") && e.player) {
                    if (e.playerId) goalCountById[e.playerId] = (goalCountById[e.playerId] || 0) + 1;
                    goalCountByName[e.player] = (goalCountByName[e.player] || 0) + 1;
                }
                if (e.type === "Substitution") subEvents.push(e);
            });
        }

        function normalize(s) {
            return (s || '').toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]/g, '');
        }

        function matchName(eventVal, targetVal) {
            if (!eventVal || !targetVal) return false;
            var a = normalize(eventVal);
            var b = normalize(targetVal);
            if (a === b) return true;
            if (b.indexOf(a) !== -1 || a.indexOf(b) !== -1) return true;
            var parts = targetVal.trim().split(/\s+/);
            if (parts.length > 1) {
                var abbr = parts[0].charAt(0) + '. ' + parts[parts.length - 1];
                if (normalize(abbr) === a) return true;
            }
            return false;
        }

        function findEvent(name, id, mapName, mapId) {
            if (id && mapId[id]) return mapId[id];
            if (name && mapName[name]) return mapName[name];
            return null;
        }

        function getCard(p) {
            return findEvent(p.name, p.id, cardByName, cardById) || null;
        }
        function getGoalCount(p) {
            if (p.id && goalCountById[p.id]) return goalCountById[p.id];
            if (p.name && goalCountByName[p.name]) return goalCountByName[p.name];
            return 0;
        }

        function getSubInEvent(p) {
            for (var i = 0; i < subEvents.length; i++) {
                var e = subEvents[i];
                // e.substituted = the player COMING ON (entering)
                if (p.id && e.substitutedId && p.id === e.substitutedId) return e;
                if (matchName(e.substituted, p.name)) return e;
            }
            return null;
        }
        function getSubOutEvent(p) {
            for (var i = 0; i < subEvents.length; i++) {
                var e = subEvents[i];
                // e.player = the player going OFF (leaving)
                if (p.id && e.playerId && p.id === e.playerId) return e;
                if (matchName(e.player, p.name)) return e;
            }
            return null;
        }

        function shortName(name) {
            if (!name) return '';
            var parts = name.trim().split(/\s+/);
            if (parts.length <= 1) return name;
            var last = parts[parts.length - 1];
            if (last.length <= 5) return last;
            return parts[0].charAt(0) + '. ' + last;
        }

        var fotMobById = {};
        var avgRatingById = {};
        if (plantillaCache) {
            Object.keys(plantillaCache).forEach(function(teamKey) {
                var team = plantillaCache[teamKey];
                if (team && team.players) {
                    team.players.forEach(function(p) {
                        if (p.id && p.fotMobId) fotMobById[p.id] = p.fotMobId;
                        if (p.id && p.avgRating) avgRatingById[p.id] = p.avgRating;
                    });
                }
            });
        }
        function playerPhotoUrl(p) {
            if (p && p.id && fotMobById[p.id]) return 'https://images.fotmob.com/image_resources/playerimages/' + fotMobById[p.id] + '.png';
            return '';
        }

        function renderPlayers(rows, isHome) {
            var html = '';
            var numRows = rows.length;
            rows.forEach(function(row, ri) {
                var topPct;
                if (isHome) {
                    topPct = numRows <= 1 ? 10 : 2 + (ri / (numRows - 1)) * 42;
                } else {
                    topPct = numRows <= 1 ? 90 : 56 + ((numRows - 1 - ri) / (numRows - 1)) * 34;
                }

                var count = row.length;
                var spacing = count <= 1 ? 0 : Math.min(90 / (count - 1), 30);
                var startX = count <= 1 ? 50 : 50 - ((count - 1) * spacing) / 2;

                row.forEach(function(p, pi) {
                    var leftPct = count <= 1 ? 50 : startX + pi * spacing;
                    if (leftPct < 8) leftPct = 8;
                    if (leftPct > 92) leftPct = 92;

                    var card = getCard(p);
                    var goalCt = getGoalCount(p);
                    var subOutEvt = getSubOutEvent(p);
                    var subInEvt = getSubInEvent(p);
                    var teamClass = isHome ? 'home' : 'away';
                    var posClass = '';
                    if (p.position === 'Goalkeeper') posClass = 'pos-gk';
                    else if (p.position === 'Defender') posClass = 'pos-def';
                    else if (p.position === 'Midfielder') posClass = 'pos-mid';
                    else if (p.position === 'Forward') posClass = 'pos-fwd';
                    var initials = (p.name || '').split(' ').map(function(w){ return w.charAt(0); }).join('').substring(0,2);

                    var photo = playerPhotoUrl(p);
                    html += '<div class="pv-player-node ' + teamClass + ' ' + posClass + '" style="top:' + topPct + '%;left:' + leftPct + '%">';
                    html += '<div class="pv-avatar-wrap">';
                    html += '<div class="pv-avatar ' + teamClass + '">';
                    if (photo) {
                        html += '<img class="pv-avatar-photo" src="' + escHtml(photo) + '" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">';
                        html += '<span class="pv-avatar-num fallback" style="display:none">' + (p.number || '') + '</span>';
                    } else {
                        html += '<span class="pv-avatar-num">' + (p.number || '') + '</span>';
                    }
                    html += '<span class="pv-avatar-initials">' + escHtml(initials) + '</span>';
                    html += '</div>';
                    if (card || goalCt || subOutEvt || subInEvt) {
                        html += '<div class="pv-avatar-badges">';
                        for (var gi = 0; gi < goalCt; gi++) html += '<span class="pv-ind-goal">\u26BD</span>';
                        if (subOutEvt) html += '<span class="pv-ind-sub out" data-tooltip="Sustituido por ' + escHtml(subOutEvt.substituted || '') + '"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16l-4-4 4-4"/><path d="M17 8l4 4-4 4"/><line x1="3" y1="12" x2="21" y2="12" opacity="0.3"/></svg></span>';
                        if (subInEvt) html += '<span class="pv-ind-sub in"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16l-4-4 4-4"/><path d="M17 8l4 4-4 4"/><line x1="3" y1="12" x2="21" y2="12" opacity="0.3"/></svg></span>';
                        if (card === 'yellow') html += '<span class="pv-ind-card yellow"></span>';
                        if (card === 'red') html += '<span class="pv-ind-card red"></span>';
                        if (card === 'yr') html += '<span class="pv-ind-card yr"></span>';
                        html += '</div>';
                    }
                    html += '</div>';
                    html += '<div class="pv-player-name">' + escHtml(shortName(p.name)) + '</div>';
                    var rating = ratingById[p.id];
                    if (rating) {
                        html += '<div class="pv-player-rating">' + rating + '</div>';
                    }
                    html += '</div>';
                });
            });
            return html;
        }

        function renderSubsSection(t, isHome) {
            if (!t.substitutes || !t.substitutes.length) return '';
            var teamClass = isHome ? 'home' : 'away';
            var html = '<div class="pv-subs-section ' + teamClass + '">';
            html += '<div class="pv-subs-title">SUPLENTES · ' + escHtml(t.name) + '</div>';
            html += '<div class="pv-subs-grid">';
            t.substitutes.forEach(function(s) {
                var card = getCard(s);
                var goalCt = getGoalCount(s);
                var subInEvt = getSubInEvent(s);
                var subOutEvt = getSubOutEvent(s);
                var entered = !!subInEvt;
                var num = s.number || '';
                var name = s.name || '';
                var photo = playerPhotoUrl(s);
                html += '<div class="pv-subs-row' + (entered ? ' played' : '') + '">';
                html += '<span class="pv-subs-badge">';
                if (photo) {
                    html += '<img class="pv-subs-photo" src="' + escHtml(photo) + '" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">';
                    html += '<span class="pv-subs-num fallback" style="display:none">' + num + '</span>';
                } else {
                    html += '<span class="pv-subs-num">' + num + '</span>';
                }
                html += '</span>';
                html += '<span class="pv-subs-name">' + escHtml(shortName(name)) + '</span>';
                if (entered) {
                    var sRat = ratingById[s.id] || avgRatingById[s.id];
                    if (sRat) {
                        var sArv = parseFloat(sRat);
                        var sArCls = sArv >= 7.5 ? 'high' : (sArv >= 6.5 ? 'mid' : 'low');
                        html += '<span class="pv-subs-rating ' + sArCls + '">' + sRat + '</span>';
                    }
                    html += '<span class="pv-subs-in-info">';
                    html += '<span class="pv-subs-arrow-in"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16l-4-4 4-4"/><path d="M17 8l4 4-4 4"/><line x1="3" y1="12" x2="21" y2="12" opacity="0.3"/></svg></span> ';
                    html += escHtml(shortName(subInEvt.player || ''));
                    html += ' <span class="pv-subs-min">' + escHtml(subInEvt.time || '') + '\'</span>';
                    html += '</span>';
                }
                for (var gi = 0; gi < goalCt; gi++) html += '<span class="pv-ind-goal">\u26BD</span>';
                if (card === 'yellow') html += '<span class="pv-ind-card yellow"></span>';
                if (card === 'red') html += '<span class="pv-ind-card red"></span>';
                if (card === 'yr') html += '<span class="pv-ind-card yr"></span>';
                html += '</div>';
            });
        html += '</div>';
            return html;
        }

        var homeAvg = null, awayAvg = null;
        if (d.boxScore && d.boxScore.value) {
            d.boxScore.value.forEach(function(box) {
                var sum = 0, cnt = 0;
                if (box.players) box.players.forEach(function(p) {
                    if (p.matchRating) { sum += parseFloat(p.matchRating); cnt++; }
                });
                var avg = cnt > 0 ? (sum / cnt).toFixed(2) : null;
                if (box.team && d.homeTeam && box.team.id === d.homeTeam.id) homeAvg = avg;
                else if (box.team && d.awayTeam && box.team.id === d.awayTeam.id) awayAvg = avg;
            });
        }

        var html = '<div class="pv-section"><div class="pv-lineups-new">';
        html += '<div class="pv-pitch-card">';

        var homeWins = homeAvg && awayAvg && parseFloat(homeAvg) > parseFloat(awayAvg);
        var awayWins = homeAvg && awayAvg && parseFloat(awayAvg) > parseFloat(homeAvg);

        if (homeT) {
            html += '<div class="pv-pitch-header home">';
            html += '<img src="' + escHtml(APP.fixLogo(homeT.logo || 'imagenes/stpls-icon.png')) + '" class="pv-pitch-shield" alt="" onerror="this.src=\'imagenes/stpls-icon.png\'">';
            html += '<h3>' + escHtml(homeT.name) + '</h3>';
            if (homeAvg) html += '<span class="pv-pitch-avg' + (homeWins ? ' best' : (awayWins ? ' worst' : '')) + '">' + homeAvg + '</span>';
            html += '<span class="pv-pitch-formation">' + escHtml(homeT.formation) + '</span>';
            html += '</div>';
        }

        html += '<div class="pv-pitch-wrap"><div class="pv-pitch">';
        html += '<div class="pv-pitch-spot"></div>';
        html += '<div class="pv-pitch-pa-b"></div><div class="pv-pitch-pa-t"></div>';
        html += '<div class="pv-pitch-ga-b"></div><div class="pv-pitch-ga-t"></div>';
        html += '<div class="pv-pitch-players">';

        if (homeT && homeT.initialLineup) html += renderPlayers(homeT.initialLineup, true);
        if (awayT && awayT.initialLineup) html += renderPlayers(awayT.initialLineup, false);

        html += '</div></div></div>';

        if (awayT) {
            html += '<div class="pv-pitch-header away">';
            html += '<img src="' + escHtml(APP.fixLogo(awayT.logo || 'imagenes/stpls-icon.png')) + '" class="pv-pitch-shield" alt="" onerror="this.src=\'imagenes/stpls-icon.png\'">';
            html += '<h3>' + escHtml(awayT.name) + '</h3>';
            if (awayAvg) html += '<span class="pv-pitch-avg' + (awayWins ? ' best' : (homeWins ? ' worst' : '')) + '">' + awayAvg + '</span>';
            html += '<span class="pv-pitch-formation">' + escHtml(awayT.formation) + '</span>';
            html += '</div>';
        }

        html += '</div>';

        if (homeT) html += renderSubsSection(homeT, true);
        if (awayT) html += renderSubsSection(awayT, false);

        html += '</div></div>';
        elContent.innerHTML = html;
    }

    /* ===== PLAYERS (BOX SCORE) ===== */
    function renderPlayers(d, b, home, away) {
        var bsData = d.boxScore && (d.boxScore.value || d.boxScore);
        if (!bsData || !Array.isArray(bsData) || !bsData.length) {
            elContent.innerHTML = '<div class="pv-section"><p class="pv-empty">Datos de jugadores no disponibles.<br><small>Se obtendrán al solicitar el modo boxscore del script.</small></p></div>';
            return;
        }
        var html = '<div class="pv-section">';
        bsData.forEach(function(box) {
            if (!box.players || !box.players.length) return;
            var sorted = box.players.slice().sort(function(a, b) {
                var order = {Goalkeeper:0, Defender:1, Midfielder:2, Forward:3};
                var posA = order[a.position] != null ? order[a.position] : 9;
                var posB = order[b.position] != null ? order[b.position] : 9;
                if (posA !== posB) return posA - posB;
                // Substitutes (S) always go below players with real minutes
                var isSubA = a.isSubstitute || a.minutesPlayed == null || a.minutesPlayed === 'S' ? 1 : 0;
                var isSubB = b.isSubstitute || b.minutesPlayed == null || b.minutesPlayed === 'S' ? 1 : 0;
                if (isSubA !== isSubB) return isSubA - isSubB;
                var minA = parseInt(a.minutesPlayed) || 0;
                var minB = parseInt(b.minutesPlayed) || 0;
                return minB - minA;
            });
            var logoTeam = APP.fixLogo(box.team.logo || "");
            html += '<div class="pv-box-card">';
            html += '<h3>' + (logoTeam ? '<img src="' + escHtml(logoTeam) + '" style="width:20px;height:20px;object-fit:contain">' : '') + escHtml(box.team.name) + '</h3>';
            html += '<div class="pv-box-scroll"><table class="pv-box-table"><thead><tr><th>#</th><th>Jugador</th><th>Pos</th><th>Min</th><th>G</th><th>A</th><th>TA</th><th>TR</th><th>Val</th></tr></thead><tbody>';
            sorted.forEach(function(p) {
                var s = p.statistics && p.statistics[0] ? p.statistics[0] : {};
                var min = p.isSubstitute ? 'S' : (p.minutesPlayed||"-");
                html += '<tr><td>' + (p.shirtNumber||"") + '</td><td class="pv-box-name">' + escHtml(p.name) + '</td><td>' + posShort(p.position) + '</td><td class="pv-box-min">' + min + '</td><td class="pv-box-g">' + (s.goalsScored||0) + '</td><td class="pv-box-a">' + (s.assists||0) + '</td><td class="pv-box-ta">' + (s.cardsYellow||0) + '</td><td class="pv-box-tr">' + (s.cardsRed||0) + '</td><td class="pv-box-rating">' + (p.matchRating||"-") + '</td></tr>';
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

        var desc = three.description ? escHtml(three.description) : "";
        if (desc) {
            desc = desc
                .replace(/home win/gi, "Victoria local")
                .replace(/away win/gi, "Victoria visitante")
                .replace(/draw/gi, "Empate")
                .replace(/probability/gi, "probabilidad")
                .replace(/The .*? is favored/gi, "Se favorece al $1")
                .replace(/favored to win/gi, "favorito para ganar");
        }

        elContent.innerHTML =
            '<div class="pv-section"><div class="pv-pred-card">' +
                '<h3>📊 Pronóstico pre-partido</h3>' +
                '<div class="pv-pred-row"><span class="pv-pred-label">' + escHtml(hName) + '</span><div class="pv-pred-track"><div class="pv-pred-fill home" style="width:' + hVal + '%"></div></div><span class="pv-pred-val home">' + prob.home + '</span></div>' +
                '<div class="pv-pred-row"><span class="pv-pred-label">Empate</span><div class="pv-pred-track"><div class="pv-pred-fill draw" style="width:' + dVal + '%"></div></div><span class="pv-pred-val draw">' + prob.draw + '</span></div>' +
                '<div class="pv-pred-row"><span class="pv-pred-label">' + escHtml(aName) + '</span><div class="pv-pred-track"><div class="pv-pred-fill away" style="width:' + aVal + '%"></div></div><span class="pv-pred-val away">' + prob.away + '</span></div>' +
                (desc ? '<p class="pv-pred-desc">💬 ' + desc + '</p>' : '') +
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
