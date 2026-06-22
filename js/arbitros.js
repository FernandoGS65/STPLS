(function() {

    var arbitrosData = [];
    var selectedId = null;

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

    function renderArbitro(a) {
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

        html += '<div class="arb-info">';
        html += '</div>';
        html += '</div>';
        html += '</div>';

        return html;
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
        html += renderArbitro(selected);
        container.innerHTML = html;

        var sel = document.getElementById('arb-select');
        if (sel) {
            sel.addEventListener('change', function() {
                selectedId = parseInt(this.value);
                renderLista();
            });
        }
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
        init();
    });

    if (APP.getState && APP.getState().ready) {
        init();
    }
})();
