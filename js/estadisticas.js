(function() {

    var plantillaCache = null;
    var partidosCache = null;
    var cacheStats = {};
    var activeTab = null;

    var CATEGORIAS = [
        { id: 'goleadores', label: 'Goleadores', light: true },
        { id: 'asistencias', label: 'Asistencias', light: false },
        { id: 'zamora', label: 'Zamora', light: false },
        { id: 'rating', label: 'Rating', light: true },
        { id: 'tarjetas', label: 'Tarjetas', light: true },
        { id: 'penaltis', label: 'Penaltis', light: false },
        { id: 'xg', label: 'xG', light: false },
        { id: 'titularidades', label: 'Titularidades', light: true },
        { id: 'minutos', label: 'Minutos', light: false },
        { id: 'nacionalidades', label: 'Nacionalidades', light: true },
        { id: 'duelos', label: 'Duelos', light: false },
        { id: 'tiros', label: 'Tiros', light: false }
    ];

    function escHtml(s) {
        if (s == null) return '';
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function playerPhoto(fotMobId) {
        if (!fotMobId) return '';
        return 'https://images.fotmob.com/image_resources/playerimages/' + fotMobId + '.png';
    }

    /* ===== LOAD PLANTILLA ===== */
    async function loadPlantilla() {
        if (plantillaCache) return plantillaCache;
        var resp = await fetch(APP.ruta('plantilla'));
        plantillaCache = await resp.json();
        return plantillaCache;
    }

    /* ===== LOAD ALL MATCHES (heavy) ===== */
    async function loadPartidos() {
        if (partidosCache) return partidosCache;
        var resp = await fetch(APP.ruta('descargados'));
        var descargados = await resp.json();
        var promises = descargados.filter(function(d) {
            return d.boxscore;
        }).map(function(d) {
            return fetch(APP.ruta('partido', d.id))
                .then(function(r) { return r.json(); })
                .catch(function() { return null; });
        });
        partidosCache = (await Promise.all(promises)).filter(Boolean);
        return partidosCache;
    }

    /* ===== GET ALL PLAYERS FLAT ===== */
    function getAllPlayers(data) {
        var players = [];
        Object.keys(data).forEach(function(teamKey) {
            var team = data[teamKey];
            if (!team || !team.players) return;
            team.players.forEach(function(p) {
                players.push({
                    id: p.id,
                    name: p.name,
                    position: p.position,
                    teamName: teamKey,
                    teamLogo: team.logo || '',
                    fotMobId: p.fotMobId || null,
                    goals: p.goals || 0,
                    yellowCards: p.yellowCards || 0,
                    redCards: p.redCards || 0,
                    starts: p.starts || 0,
                    subs: p.subs || 0,
                    appearances: p.appearances || 0,
                    avgRating: p.avgRating || 0,
                    nationality: p.nationality || '',
                    countryCode: p.countryCode || ''
                });
            });
        });
        return players;
    }

    /* ===== CATEGORY CALCULATORS (light) ===== */
    function calcGoleadores() {
        var players = getAllPlayers(plantillaCache);
        return players
            .filter(function(p) { return p.goals > 0; })
            .sort(function(a, b) { return b.goals - a.goals; })
            .map(function(p) {
                return { player: p, value: p.goals, label: p.goals + '' };
            });
    }

    function calcRating() {
        var players = getAllPlayers(plantillaCache);
        return players
            .filter(function(p) { return p.appearances > 0 && p.avgRating > 0; })
            .sort(function(a, b) { return b.avgRating - a.avgRating; })
            .map(function(p) {
                return { player: p, value: p.avgRating, label: (p.avgRating / 100).toFixed(2) };
            });
    }

    function calcTarjetas() {
        var players = getAllPlayers(plantillaCache);
        return players
            .filter(function(p) { return (p.yellowCards + p.redCards) > 0; })
            .sort(function(a, b) {
                var diff = b.redCards - a.redCards;
                if (diff !== 0) return diff;
                return b.yellowCards - a.yellowCards;
            })
            .map(function(p) {
                return { player: p, value: p.yellowCards + p.redCards, label: p.yellowCards + ' / ' + p.redCards };
            });
    }

    function calcTitularidades() {
        var players = getAllPlayers(plantillaCache);
        return players
            .filter(function(p) { return p.starts > 0; })
            .sort(function(a, b) { return b.starts - a.starts; })
            .map(function(p) {
                return { player: p, value: p.starts, label: p.starts + '' };
            });
    }

    function calcNacionalidades() {
        var players = getAllPlayers(plantillaCache);
        var counts = {};
        players.forEach(function(p) {
            var key = p.nationality || 'Desconocido';
            if (!counts[key]) {
                counts[key] = { nationality: key, countryCode: p.countryCode, count: 0 };
            }
            counts[key].count++;
        });
        return Object.values(counts)
            .sort(function(a, b) { return b.count - a.count; })
            .map(function(item) {
                return {
                    player: { name: item.nationality, teamName: item.countryCode, teamLogo: '', fotMobId: null, countryCode: item.countryCode },
                    value: item.count,
                    label: item.count + '',
                    isNationality: true
                };
            });
    }

    /* ===== CATEGORY CALCULATORS (heavy) ===== */
    function aggregateFromMatches(field) {
        var totals = {};
        partidosCache.forEach(function(match) {
            if (!match || !match.boxScore) return;
            var bsData = match.boxScore.value || match.boxScore;
            if (!Array.isArray(bsData)) return;
            bsData.forEach(function(box) {
                if (!box.players) return;
                box.players.forEach(function(p) {
                    if (!p.id) return;
                    var val = 0;
                    if (typeof field === 'function') {
                        val = field(p);
                    } else if (p.statistics) {
                        val = p.statistics[field] || 0;
                    }
                    if (!val) return;
                    if (!totals[p.id]) {
                        totals[p.id] = {
                            id: p.id,
                            name: p.name,
                            position: p.position,
                            teamName: box.team ? box.team.name : '',
                            teamLogo: '',
                            fotMobId: null,
                            total: 0
                        };
                    }
                    totals[p.id].total += val;
                });
            });
        });
        return Object.values(totals);
    }

    function enrichWithPlantilla(items) {
        var plant = {};
        Object.keys(plantillaCache).forEach(function(teamKey) {
            var team = plantillaCache[teamKey];
            if (!team || !team.players) return;
            team.logo = team.logo || '';
            team.players.forEach(function(p) {
                plant[p.id] = { logo: team.logo, teamKey: teamKey };
            });
        });
        items.forEach(function(item) {
            if (plant[item.id]) {
                item.teamLogo = plant[item.id].logo;
                if (!item.teamName) item.teamName = plant[item.id].teamKey;
            }
        });
    }

    function calcAsistencias() {
        if (cacheStats.asistencias) return cacheStats.asistencias;
        var items = aggregateFromMatches('assists');
        enrichWithPlantilla(items);
        cacheStats.asistencias = items
            .filter(function(p) { return p.total > 0; })
            .sort(function(a, b) { return b.total - a.total; })
            .map(function(p) {
                return { player: p, value: p.total, label: p.total + '' };
            });
        return cacheStats.asistencias;
    }

    function calcZamora() {
        if (cacheStats.zamora) return cacheStats.zamora;
        var gk = {};
        partidosCache.forEach(function(match) {
            if (!match || !match.boxScore) return;
            var bsData = match.boxScore.value || match.boxScore;
            if (!Array.isArray(bsData)) return;
            bsData.forEach(function(box) {
                if (!box.players) return;
                box.players.forEach(function(p) {
                    if (!p.id || p.position !== 'Goalkeeper') return;
                    var mins = p.minutesPlayed || 0;
                    var conceded = (p.statistics && p.statistics.goalsConceded) || 0;
                    if (!gk[p.id]) {
                        gk[p.id] = {
                            id: p.id,
                            name: p.name,
                            position: 'Goalkeeper',
                            teamName: box.team ? box.team.name : '',
                            teamLogo: '',
                            fotMobId: null,
                            minutes: 0,
                            conceded: 0
                        };
                    }
                    gk[p.id].minutes += mins;
                    gk[p.id].conceded += conceded;
                });
            });
        });
        var items = Object.values(gk).filter(function(g) { return g.minutes >= 90; });
        enrichWithPlantilla(items);
        cacheStats.zamora = items
            .map(function(p) {
                var per90 = (p.conceded / (p.minutes / 90));
                return { player: p, value: per90, label: per90.toFixed(2) };
            })
            .sort(function(a, b) { return a.value - b.value; });
        return cacheStats.zamora;
    }

    function calcPenaltis() {
        if (cacheStats.penaltis) return cacheStats.penaltis;
        var penData = {};
        partidosCache.forEach(function(match) {
            if (!match || !match.boxScore) return;
            var bsData = match.boxScore.value || match.boxScore;
            if (!Array.isArray(bsData)) return;
            bsData.forEach(function(box) {
                if (!box.players) return;
                box.players.forEach(function(p) {
                    if (!p.id || !p.statistics) return;
                    var scored = p.statistics.penaltiesScored || 0;
                    var missed = p.statistics.penaltiesMissed || 0;
                    if (!scored && !missed) return;
                    if (!penData[p.id]) {
                        penData[p.id] = {
                            id: p.id,
                            name: p.name,
                            position: p.position,
                            teamName: box.team ? box.team.name : '',
                            teamLogo: '',
                            fotMobId: null,
                            scored: 0,
                            missed: 0
                        };
                    }
                    penData[p.id].scored += scored;
                    penData[p.id].missed += missed;
                });
            });
        });
        var items = Object.values(penData);
        enrichWithPlantilla(items);
        cacheStats.penaltis = items
            .filter(function(p) { return (p.scored + p.missed) > 0; })
            .sort(function(a, b) { return b.scored - a.scored; })
            .map(function(p) {
                return { player: p, value: p.scored, label: p.scored + ' / ' + p.missed };
            });
        return cacheStats.penaltis;
    }

    function calcXG() {
        if (cacheStats.xg) return cacheStats.xg;
        var items = aggregateFromMatches(function(p) {
            return (p.statistics && p.statistics.expectedGoals) || 0;
        });
        enrichWithPlantilla(items);
        cacheStats.xg = items
            .filter(function(p) { return p.total > 0; })
            .sort(function(a, b) { return b.total - a.total; })
            .map(function(p) {
                return { player: p, value: p.total, label: p.total.toFixed(2) };
            });
        return cacheStats.xg;
    }

    function calcMinutos() {
        if (cacheStats.minutos) return cacheStats.minutos;
        var items = aggregateFromMatches('minutesPlayed');
        enrichWithPlantilla(items);
        cacheStats.minutos = items
            .filter(function(p) { return p.total > 0; })
            .sort(function(a, b) { return b.total - a.total; })
            .map(function(p) {
                return { player: p, value: p.total, label: p.total + '' };
            });
        return cacheStats.minutos;
    }

    function calcDuelos() {
        if (cacheStats.duelos) return cacheStats.duelos;
        var items = aggregateFromMatches('duelsWon');
        enrichWithPlantilla(items);
        cacheStats.duelos = items
            .filter(function(p) { return p.total > 0; })
            .sort(function(a, b) { return b.total - a.total; })
            .map(function(p) {
                return { player: p, value: p.total, label: p.total + '' };
            });
        return cacheStats.duelos;
    }

    function calcTiros() {
        if (cacheStats.tiros) return cacheStats.tiros;
        var items = aggregateFromMatches('shotsOnTarget');
        enrichWithPlantilla(items);
        cacheStats.tiros = items
            .filter(function(p) { return p.total > 0; })
            .sort(function(a, b) { return b.total - a.total; })
            .map(function(p) {
                return { player: p, value: p.total, label: p.total + '' };
            });
        return cacheStats.tiros;
    }

    /* ===== RENDER TABS ===== */
    function renderTabs() {
        var container = document.getElementById('stats-tabs');
        if (!container) return;
        var html = '';
        CATEGORIAS.forEach(function(cat) {
            var active = cat.id === activeTab ? ' active' : '';
            html += '<div class="stats-tab' + active + '" data-cat="' + cat.id + '">' + cat.label + '</div>';
        });
        container.innerHTML = html;
        container.querySelectorAll('.stats-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                selectCategoria(tab.getAttribute('data-cat'));
            });
        });
    }

    /* ===== RENDER RANKING ===== */
    function renderRanking(data, valueLabel) {
        var container = document.getElementById('stats-content');
        if (!data || data.length === 0) {
            container.innerHTML = '<p class="stats-loading">No hay datos disponibles.</p>';
            return;
        }
        var top = data.slice(0, 10);
        var html = '<div class="stats-ranking">';
        top.forEach(function(item, idx) {
            var p = item.player;
            var photo = playerPhoto(p.fotMobId);
            var flagUrl = '';
            if (item.isNationality && p.countryCode) {
                flagUrl = 'https://flagcdn.com/w40/' + p.countryCode.toLowerCase() + '.png';
            }
            html += '<div class="stats-row">';
            html += '<span class="stats-pos">' + (idx + 1) + '</span>';
            if (item.isNationality) {
                html += '<img class="stats-photo" src="' + escHtml(flagUrl) + '" alt="" onerror="this.style.display=\'none\'">';
            } else {
                html += '<img class="stats-photo" src="' + escHtml(photo) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">';
            }
            html += '<div class="stats-info">';
            html += '<span class="stats-player-name">' + escHtml(p.name) + '</span>';
            html += '<div class="stats-team">';
            if (p.teamLogo) html += '<img class="stats-team-logo" src="' + escHtml(p.teamLogo) + '" alt="" onerror="this.style.display=\'none\'">';
            html += '<span class="stats-team-name">' + escHtml(p.teamName) + '</span>';
            html += '</div>';
            html += '</div>';
            html += '<span class="stats-value">' + escHtml(item.label) + '</span>';
            html += '</div>';
        });
        html += '</div>';
        container.innerHTML = html;
    }

    /* ===== SELECT CATEGORY ===== */
    async function selectCategoria(id) {
        activeTab = id;
        renderTabs();
        var container = document.getElementById('stats-content');
        container.innerHTML = '<p class="stats-loading">Cargando...</p>';

        try {
            var data;
            switch (id) {
                case 'goleadores':
                    data = calcGoleadores();
                    renderRanking(data);
                    break;
                case 'asistencias':
                    await loadPartidos();
                    data = calcAsistencias();
                    renderRanking(data);
                    break;
                case 'zamora':
                    await loadPartidos();
                    data = calcZamora();
                    renderRanking(data);
                    break;
                case 'rating':
                    data = calcRating();
                    renderRanking(data);
                    break;
                case 'tarjetas':
                    data = calcTarjetas();
                    renderRanking(data);
                    break;
                case 'penaltis':
                    await loadPartidos();
                    data = calcPenaltis();
                    renderRanking(data);
                    break;
                case 'xg':
                    await loadPartidos();
                    data = calcXG();
                    renderRanking(data);
                    break;
                case 'titularidades':
                    data = calcTitularidades();
                    renderRanking(data);
                    break;
                case 'minutos':
                    await loadPartidos();
                    data = calcMinutos();
                    renderRanking(data);
                    break;
                case 'nacionalidades':
                    data = calcNacionalidades();
                    renderRanking(data);
                    break;
                case 'duelos':
                    await loadPartidos();
                    data = calcDuelos();
                    renderRanking(data);
                    break;
                case 'tiros':
                    await loadPartidos();
                    data = calcTiros();
                    renderRanking(data);
                    break;
                default:
                    container.innerHTML = '<p class="stats-loading">Categoría no disponible.</p>';
            }
        } catch(e) {
            container.innerHTML = '<p class="stats-loading">Error al cargar datos.</p>';
        }
    }

    /* ===== INIT ===== */
    async function init() {
        try {
            await loadPlantilla();
            renderTabs();
            selectCategoria('goleadores');
        } catch(e) {
            document.getElementById('stats-content').innerHTML =
                '<p class="stats-loading">Error al cargar datos.</p>';
        }
    }

    APP.onChange(function() {
        plantillaCache = null;
        partidosCache = null;
        cacheStats = {};
        activeTab = null;
        init();
    });

    document.addEventListener('DOMContentLoaded', function() {
        init();
    });

})();
