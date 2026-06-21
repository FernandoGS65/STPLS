(function() {

    var calendario = null;
    var descargados = null;

    function init() {
        Promise.all([
            fetch(APP.ruta('calendario')).then(function(r) { return r.json(); }),
            fetch(APP.ruta('descargados')).then(function(r) { return r.ok ? r.json() : []; })
        ]).then(function(results) {
            calendario = results[0];
            descargados = results[1];
            render();
        }).catch(function(e) {
            document.getElementById('descargas-tbody').innerHTML =
                '<tr><td colspan="8" class="desc-error">Error al cargar datos: ' + e.message + '</td></tr>';
        });
    }

    function render() {
        if (!calendario) return;

        var matches = calendario.data || [];
        var total = matches.length;

        var downloadedMap = {};
        for (var i = 0; i < descargados.length; i++) {
            downloadedMap[descargados[i].id] = descargados[i];
        }

        var fullCount = 0;
        var partialCount = 0;
        var noneCount = 0;

        for (var j = 0; j < matches.length; j++) {
            var m = matches[j];
            var d = downloadedMap[m.id];
            if (!d) {
                noneCount++;
            } else if (d.detail && d.lineups && d.boxscore) {
                fullCount++;
            } else if (d.detail || d.lineups || d.boxscore) {
                partialCount++;
            } else {
                noneCount++;
            }
        }

        var downloaded = fullCount + partialCount;
        document.getElementById('total-matches').textContent = total;
        document.getElementById('downloaded-matches').textContent = downloaded;
        document.getElementById('pending-matches').textContent = total - downloaded;

        var tbody = document.getElementById('descargas-tbody');
        var html = '';

        var grouped = {};
        var jornadas = [];
        for (var k = 0; k < matches.length; k++) {
            var match = matches[k];
            var roundStr = match.round || '';
            var parts = roundStr.split('-');
            var jornadaNum = parseInt(parts[1] ? parts[1].trim() : '0', 10);

            if (!grouped[jornadaNum]) {
                grouped[jornadaNum] = [];
                jornadas.push(jornadaNum);
            }
            grouped[jornadaNum].push(match);
        }

        jornadas.sort(function(a, b) { return a - b; });

        for (var n = 0; n < jornadas.length; n++) {
            var jNum = jornadas[n];
            var jMatches = grouped[jNum];

            jMatches.sort(function(a, b) {
                return new Date(a.date) - new Date(b.date);
            });

            for (var p = 0; p < jMatches.length; p++) {
                var match = jMatches[p];
                var dl = downloadedMap[match.id];
                var dateObj = new Date(match.date);
                var dateStr = pad(dateObj.getDate()) + '/' + pad(dateObj.getMonth() + 1);

                var detail = dl ? dl.detail : false;
                var lineups = dl ? dl.lineups : false;
                var boxscore = dl ? dl.boxscore : false;

                var iconClass;
                if (detail && lineups && boxscore) {
                    iconClass = 'desc-icon-full';
                } else if (detail || lineups || boxscore) {
                    iconClass = 'desc-icon-partial';
                } else {
                    iconClass = 'desc-icon-none';
                }

                var homeName = match.homeTeam ? match.homeTeam.name : '?';
                var awayName = match.awayTeam ? match.awayTeam.name : '?';
                var score = dl && dl.score ? dl.score : (match.state && match.state.score ? match.state.score.current : '');
                var link = 'partido.html?matchId=' + match.id;

                html += '<tr>'
                    + '<td class="desc-j">' + jNum + '</td>'
                    + '<td class="desc-fecha">' + dateStr + '</td>'
                    + '<td class="desc-local"><a href="' + link + '">' + homeName + '</a></td>'
                    + '<td class="desc-score">' + score + '</td>'
                    + '<td class="desc-visit"><a href="' + link + '">' + awayName + '</a></td>'
                    + '<td class="desc-check' + (detail ? ' desc-yes' : '') + '">' + (detail ? '✓' : '—') + '</td>'
                    + '<td class="desc-check' + (lineups ? ' desc-yes' : '') + '">' + (lineups ? '✓' : '—') + '</td>'
                    + '<td class="desc-check' + (boxscore ? ' desc-yes' : '') + '">' + (boxscore ? '✓' : '—') + '</td>'
                    + '</tr>';
            }
        }

        tbody.innerHTML = html;

        var fullPct = total > 0 ? Math.round((fullCount / total) * 100) : 0;
        var partialPct = total > 0 ? Math.round((partialCount / total) * 100) : 0;

        document.getElementById('descargas-footer').innerHTML =
            '<strong>' + downloaded + '</strong> de ' + total + ' partidos descargados'
            + ' &mdash; <span class="desc-full">' + fullCount + ' completos</span>'
            + ' <span class="desc-partial">' + partialCount + ' parciales</span>'
            + ' <span class="desc-none">' + noneCount + ' pendientes</span>';
    }

    function pad(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    APP.onChange(function() { init(); });

})();
