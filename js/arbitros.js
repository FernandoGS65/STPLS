(function() {

    var arbitrosData = [];
    var selectedId = null;
    var currentTab = 'ficha';
    var partidosCache = null;

    function calcularEdad(fechaStr) {
        if (!fechaStr) return null;
        var parts = fechaStr.split('-');
        if (parts.length < 3) return null;
        var born = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        var now = new Date();
        var age = now.getFullYear() - born.getFullYear();
        var m = now.getMonth() - born.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < born.getDate())) age--;
        return age;
    }

    function calcularAntiguedad(primeraStr) {
        if (!primeraStr) return null;
        var year = parseInt(primeraStr);
        if (isNaN(year)) return null;
        return new Date().getFullYear() - year;
    }

    function fotoUrl(path) {
        if (!path) return null;
        var idx = path.indexOf('imagenes');
        if (idx === -1) return null;
        return path.substring(idx).replace(/\\/g, '/');
    }

    function escHtml(s) {
        var d = document.createElement('div');
        d.appendChild(document.createTextNode(s));
        return d.innerHTML;
    }

    function normalizarApellido(nombre) {
        if (!nombre) return '';
        return nombre
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    function matchArbitro(nombreArbitro) {
        if (!nombreArbitro) return null;
        var norm = normalizarApellido(nombreArbitro);
        return arbitrosData.find(function(a) {
            var parts = a.Nombre.split(/\s+/);
            var apellidos = parts.filter(function(p) { return p === p.toUpperCase() && p.length > 1; });
            if (apellidos.length >= 2) {
                var key = normalizarApellido(apellidos.join(' '));
                if (norm.indexOf(key) !== -1) return true;
            }
            var nombreLower = normalizarApellido(a.Nombre);
            if (norm.indexOf(nombreLower) !== -1 || nombreLower.indexOf(norm) !== -1) return true;
            return false;
        });
    }

    function roundJornada(round) {
        if (!round) return 0;
        var m = round.match(/(\d+)\s*$/);
        return m ? parseInt(m[1]) : 0;
    }

    function loadAllMatches() {
        if (partidosCache) return Promise.resolve(partidosCache);
        return fetch(APP.ruta('descargados'))
            .then(function(r) { return r.ok ? r.json() : []; })
            .then(function(descargados) {
                var promises = descargados.map(function(d) {
                    return fetch(APP.ruta('partido', d.id))
                        .then(function(r) { return r.ok ? r.json() : null; })
                        .catch(function() { return null; });
                });
                return Promise.all(promises);
            })
            .then(function(results) {
                partidosCache = results.filter(function(r) { return r !== null; });
                return partidosCache;
            });
    }

    function extractMatchData(match) {
        var events = match.events || [];
        var yc = 0, rc = 0, pen = 0;
        events.forEach(function(e) {
            if (e.type === 'Yellow Card') yc++;
            else if (e.type === 'Red Card') rc++;
            else if (e.type === 'Penalty') pen++;
        });
        return {
            id: match.id,
            jornada: roundJornada(match.round),
            fecha: match.date ? match.date.substring(0, 10) : '',
            home: match.homeTeam ? match.homeTeam.name : '',
            away: match.awayTeam ? match.awayTeam.name : '',
            score: match.state && match.state.score ? match.state.score.current : '',
            yellow: yc,
            red: rc,
            penalty: pen,
            referee: match.referee ? match.referee.name : ''
        };
    }

    function renderSelector() {
        if (arbitrosData.length <= 1) return '';
        var html = '<div class="arb-selector">';
        html += '<label class="arb-selector-label" for="arb-select">Seleccionar &aacute;rbitro</label>';
        html += '<select id="arb-select" class="arb-selector-select">';
        arbitrosData.forEach(function(a) {
            var sel = a.id === selectedId ? ' selected' : '';
            html += '<option value="' + a.id + '"' + sel + '>' + a.Nombre + '</option>';
        });
        html += '</select></div>';
        return html;
    }

    function renderTabs() {
        var html = '<div class="arb-tabs">';
        html += '<button class="arb-tab' + (currentTab === 'ficha' ? ' active' : '') + '" data-tab="ficha">Ficha</button>';
        html += '<button class="arb-tab' + (currentTab === 'partidos' ? ' active' : '') + '" data-tab="partidos">Partidos</button>';
        html += '<button class="arb-tab' + (currentTab === 'ranking' ? ' active' : '') + '" data-tab="ranking">Ranking</button>';
        html += '</div>';
        return html;
    }

    function renderFicha(a) {
        var edad = calcularEdad(a.FechaNacim);
        var antiguedad = calcularAntiguedad(a.FechaPrimera);
        var foto = fotoUrl(a.Foto);
        var esInternacional = a.Internacional === 1;
        var badgeClass = esInternacional ? 'arb-badge--internacional' : 'arb-badge--nacional';
        var badgeText = esInternacional ? 'FIFA / Internacional' : 'Comit\u00e9 Nacional';
        var badgeIcon = esInternacional ? '\u2605' : '\u25CF';

        var html = '<div class="arb-card">';
        html += '<div class="arb-foto-full">';
        html += foto
            ? '<img class="arb-foto" src="' + foto + '" alt="' + a.Nombre + '" onerror="this.parentNode.innerHTML=\'<div class=arb-foto-placeholder>\u26BD</div>\'">'
            : '<div class="arb-foto-placeholder">\u26BD</div>';
        html += '<div class="arb-foto-gradient"></div>';
        html += '<div class="arb-foto-overlay">';
        html += '<span class="arb-badge ' + badgeClass + '">' + badgeIcon + ' ' + badgeText + '</span>';
        html += '</div>';
        html += '</div>';

        html += '<div class="arb-body">';
        html += '<h2 class="arb-nombre">' + a.Nombre + '</h2>';
        html += '<p class="arb-colegio">\uD83D\uDCCD ' + a.Colegio + '</p>';

        html += '<div class="arb-stats">';
        if (edad !== null) {
            html += '<div class="arb-stat"><span class="arb-stat-value">' + edad + '</span><span class="arb-stat-label">Edad</span></div>';
        }
        if (antiguedad !== null) {
            html += '<div class="arb-stat"><span class="arb-stat-value">' + antiguedad + '</span><span class="arb-stat-label">A\u00f1os en 1\u00ba</span></div>';
        }
        html += '</div>';

        html += '</div>';
        html += '</div>';

        return html;
    }

    function renderPartidosTab() {
        var container = document.getElementById('arb-tab-content');
        if (!container) return;

        var selected = arbitrosData.find(function(a) { return a.id === selectedId; });
        if (!selected) return;

        loadAllMatches().then(function(matches) {
            var myMatches = [];
            matches.forEach(function(m) {
                var data = extractMatchData(m);
                if (matchArbitro(data.referee) && matchArbitro(data.referee).id === selected.id) {
                    myMatches.push(data);
                }
            });

            myMatches.sort(function(a, b) { return a.jornada - b.jornada; });

            if (!myMatches.length) {
                container.innerHTML = '<div class="arb-loading">No hay partidos registrados para este &aacute;rbitro.</div>';
                return;
            }

            var html = '<table class="arb-partidos-table">';
            html += '<thead><tr>';
            html += '<th>J</th><th>Fecha</th><th>Local</th><th></th><th>Visitante</th><th>Cards</th>';
            html += '</tr></thead>';
            html += '<tbody>';
            myMatches.forEach(function(m) {
                var fecha = m.fecha.substring(5).split('-').reverse().join('/');
                html += '<tr>';
                html += '<td class="arb-partidos-jornada">' + m.jornada + '</td>';
                html += '<td class="arb-partidos-fecha">' + fecha + '</td>';
                html += '<td class="arb-partidos-home">' + escHtml(m.home) + '</td>';
                html += '<td class="arb-partidos-score">' + escHtml(m.score) + '</td>';
                html += '<td class="arb-partidos-away">' + escHtml(m.away) + '</td>';
                html += '<td class="arb-partidos-cards">';
                if (m.yellow) html += '<span class="arb-cards-yellow">\uD83D\uDFE8' + m.yellow + '</span> ';
                if (m.red) html += '<span class="arb-cards-red">\uD83D\uDFE5' + m.red + '</span> ';
                if (m.penalty) html += '<span class="arb-cards-pen">\u26BD' + m.penalty + '</span>';
                html += '</td>';
                html += '</tr>';
            });
            html += '</tbody></table>';
            container.innerHTML = html;
        });
    }

    function renderRankingTab() {
        var container = document.getElementById('arb-tab-content');
        if (!container) return;

        var selected = arbitrosData.find(function(a) { return a.id === selectedId; });

        loadAllMatches().then(function(matches) {
            var stats = {};
            arbitrosData.forEach(function(a) {
                stats[a.id] = { id: a.id, nombre: a.Nombre, yellow: 0, red: 0, penalty: 0, total: 0, partidos: 0 };
            });

            matches.forEach(function(m) {
                var data = extractMatchData(m);
                var arb = matchArbitro(data.referee);
                if (arb && stats[arb.id]) {
                    stats[arb.id].yellow += data.yellow;
                    stats[arb.id].red += data.red;
                    stats[arb.id].penalty += data.penalty;
                    stats[arb.id].total += data.yellow + data.red + data.penalty;
                    stats[arb.id].partidos++;
                }
            });

            var ranked = Object.keys(stats).map(function(k) { return stats[k]; });
            ranked.sort(function(a, b) { return b.total - a.total; });

            var html = '<table class="arb-ranking-table">';
            html += '<thead><tr>';
            html += '<th>#</th><th>\u00c1rbitro</th><th>PJ</th><th>\uD83D\uDFE8</th><th>\uD83D\uDFE5</th><th>\u26BD</th><th>TOT</th>';
            html += '</tr></thead>';
            html += '<tbody>';
            ranked.forEach(function(r, i) {
                var highlight = (selected && r.id === selected.id) ? ' arb-ranking-highlight' : '';
                html += '<tr class="' + highlight + '">';
                html += '<td class="arb-ranking-pos">' + (i + 1) + '</td>';
                html += '<td class="arb-ranking-name">' + escHtml(r.nombre) + '</td>';
                html += '<td class="arb-ranking-num">' + r.partidos + '</td>';
                html += '<td class="arb-ranking-num arb-cards-yellow">' + r.yellow + '</td>';
                html += '<td class="arb-ranking-num arb-cards-red">' + r.red + '</td>';
                html += '<td class="arb-ranking-num arb-cards-pen">' + r.penalty + '</td>';
                html += '<td class="arb-ranking-total">' + r.total + '</td>';
                html += '</tr>';
            });
            html += '</tbody></table>';
            container.innerHTML = html;
        });
    }

    function renderContent() {
        var tabContent = document.getElementById('arb-tab-content');
        if (!tabContent) return;

        if (currentTab === 'ficha') {
            var cardWrap = document.getElementById('arb-card-wrap');
            if (cardWrap) cardWrap.style.display = '';
            tabContent.innerHTML = '';
        } else {
            var cardWrap = document.getElementById('arb-card-wrap');
            if (cardWrap) cardWrap.style.display = 'none';
            tabContent.innerHTML = '<div class="arb-loading">Cargando datos...</div>';
            if (currentTab === 'partidos') renderPartidosTab();
            else if (currentTab === 'ranking') renderRankingTab();
        }
    }

    function renderLista() {
        var container = document.getElementById('lista-arbitros');
        if (!container) return;

        if (!arbitrosData.length) {
            container.innerHTML =
                '<div class="arb-empty">' +
                    '<div class="arb-empty-icon">\u26BD</div>' +
                    '<div class="arb-empty-title">Sin \u00e1rbitros</div>' +
                    '<div class="arb-empty-desc">No hay datos de \u00e1rbitros disponibles para esta competici\u00f3n.</div>' +
                '</div>';
            return;
        }

        if (!selectedId && arbitrosData.length) {
            selectedId = arbitrosData[0].id;
        }

        var selected = arbitrosData.find(function(a) { return a.id === selectedId; });
        if (!selected) selected = arbitrosData[0];

        var html = renderSelector();
        html += '<div id="arb-card-wrap">';
        html += renderFicha(selected);
        html += '</div>';
        html += renderTabs();
        html += '<div class="arb-tab-content" id="arb-tab-content"></div>';
        container.innerHTML = html;

        var sel = document.getElementById('arb-select');
        if (sel) {
            sel.addEventListener('change', function() {
                selectedId = parseInt(this.value);
                currentTab = 'ficha';
                renderLista();
            });
        }

        var tabs = container.querySelectorAll('.arb-tab');
        tabs.forEach(function(tab) {
            tab.addEventListener('click', function() {
                currentTab = this.getAttribute('data-tab');
                container.querySelectorAll('.arb-tab').forEach(function(t) { t.classList.remove('active'); });
                this.classList.add('active');
                renderContent();
            });
        });

        renderContent();
    }

    function getJsonPath() {
        var state = APP.getState();
        if (!state.season || !state.competition) return null;
        return './data/' + state.season + '/' + state.competition + '/arbitros.json';
    }

    function init() {
        var path = getJsonPath();
        if (!path) {
            document.getElementById('lista-arbitros').innerHTML =
                '<div class="arb-empty">' +
                    '<div class="arb-empty-icon">\u26A0</div>' +
                    '<div class="arb-empty-title">No disponible</div>' +
                    '<div class="arb-empty-desc">Selecciona una temporada y competici\u00f3n.</div>' +
                '</div>';
            return;
        }

        fetch(path)
            .then(function(resp) {
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                return resp.json();
            })
            .then(function(data) {
                arbitrosData = data.sort(function(a, b) {
                    var aa = a.Nombre.replace(/^[a-záéíóúñ]+\s+/i, '').split(/\s+/)[0].toLowerCase();
                    var bb = b.Nombre.replace(/^[a-záéíóúñ]+\s+/i, '').split(/\s+/)[0].toLowerCase();
                    return aa.localeCompare(bb, 'es');
                });
                selectedId = null;
                currentTab = 'ficha';
                partidosCache = null;
                renderLista();
            })
            .catch(function(err) {
                console.error('Error cargando arbitros:', err);
                document.getElementById('lista-arbitros').innerHTML =
                    '<div class="arb-empty">' +
                        '<div class="arb-empty-icon">\u26A0</div>' +
                        '<div class="arb-empty-title">Error</div>' +
                        '<div class="arb-empty-desc">No se pudieron cargar los datos de \u00e1rbitros.</div>' +
                    '</div>';
            });
    }

    APP.onChange(function() {
        partidosCache = null;
        init();
    });

    if (APP.getState && APP.getState().ready) {
        init();
    }
})();
