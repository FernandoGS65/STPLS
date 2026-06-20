function cargarIndex() {
    var local = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    var ruta = local ? APP.ruta('calendario') : 'https://raw.githubusercontent.com/FernandoGS65/STPLS/refs/heads/main/data/2025-26/liga/calendario.json';

    fetch(ruta)
        .then(function(res) { return res.json(); })
        .then(function(partidos) {
            var total = partidos.length;
            var goles = partidos.reduce(function(acc, p) {
                var s = p.state && p.state.score && p.state.score.current;
                if (s) {
                    var parts = s.split(' - ');
                    var a = parseInt(parts[0]);
                    var b = parseInt(parts[1]);
                    return acc + (isNaN(a) ? 0 : a) + (isNaN(b) ? 0 : b);
                }
                return acc;
            }, 0);
            document.getElementById('heroTotalPartidos').textContent = total;
            document.getElementById('heroTotalGoles').textContent = goles;

            var equipos = {};
            partidos.forEach(function(p) {
                var s = p.state && p.state.score && p.state.score.current;
                if (!s) return;
                var parts = s.split(' - ');
                var gL = parseInt(parts[0]);
                var gV = parseInt(parts[1]);
                if (isNaN(gL) || isNaN(gV)) return;
                [p.homeTeam.name, p.awayTeam.name].forEach(function(n) { if (!equipos[n]) equipos[n] = { pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0 }; });
                var l = equipos[p.homeTeam.name];
                var v = equipos[p.awayTeam.name];
                l.pj++; v.pj++;
                l.gf += gL; l.gc += gV;
                v.gf += gV; v.gc += gL;
                if (gL > gV) { l.pg++; v.pp++; }
                else if (gL < gV) { l.pp++; v.pg++; }
                else { l.pe++; v.pe++; }
            });
            var clasif = Object.keys(equipos).map(function(nombre) {
                var e = equipos[nombre];
                return { nombre: nombre, pj: e.pj, pg: e.pg, pe: e.pe, pp: e.pp, gf: e.gf, gc: e.gc, pts: e.pg * 3 + e.pe, dg: e.gf - e.gc };
            }).sort(function(a, b) { return b.pts - a.pts || b.dg - a.dg; });

            var top8 = clasif.slice(0, 8);
            function zona(i) { return i < 4 ? 'champions' : i < 6 ? 'europa' : i < 7 ? 'conference' : 'descenso'; }
            document.getElementById('index-clasificacion').innerHTML = top8.map(function(e, i) {
                var escudo = 'https://raw.githubusercontent.com/FernandoGS65/STPLS/main/imagenes/' + encodeURIComponent(e.nombre) + '.png';
                return '<a href="equipo.html?id=' + encodeURIComponent(e.nombre) + '" class="clasif-row clasif-' + zona(i) + '"><span class="clasif-pos">' + (i + 1) + '</span><img src="' + escudo + '" class="clasif-escudo" alt="" onerror="this.style.display=\'none\'"><span class="clasif-nombre">' + e.nombre + '</span><span class="clasif-pts">' + e.pts + '</span></a>';
            }).join('');

            var terminados = partidos.filter(function(p) { return p.state && p.state.description === 'Finished'; }).reverse().slice(0, 5);
            document.getElementById('index-resultados').innerHTML = terminados.map(function(p) {
                return '<div class="resultado-row"><span class="resultado-equipo">' + p.homeTeam.name + '</span><strong class="resultado-marcador">' + p.state.score.current + '</strong><span class="resultado-equipo">' + p.awayTeam.name + '</span></div>';
            }).join('');

            var totalG = goles;
            var media = (totalG / total).toFixed(1);
            var mayorGoleada = partidos.reduce(function(m, p) {
                var s = p.state && p.state.score && p.state.score.current;
                if (!s) return m;
                var parts = s.split(' - ');
                var a = parseInt(parts[0]);
                var b = parseInt(parts[1]);
                if (isNaN(a) || isNaN(b)) return m;
                var dif = Math.abs(a - b);
                return dif > (m.dif || 0) ? { local: p.homeTeam.name, visit: p.awayTeam.name, a: a, b: b, dif: dif } : m;
            }, { dif: 0 });

            var jornadas = new Set(partidos.map(function(p) { return p.round; }));
            document.getElementById('index-stats').innerHTML = '<div class="stats-grid"><div class="stat-item"><strong>' + total + '</strong><span>Partidos</span></div><div class="stat-item"><strong>' + totalG + '</strong><span>Goles</span></div><div class="stat-item"><strong>' + media + '</strong><span>Media /partido</span></div><div class="stat-item"><strong>' + jornadas.size + '</strong><span>Jornadas</span></div></div>' + (mayorGoleada.dif > 0 ? '<div class="mayor-goleada">Mayor goleada: <strong>' + mayorGoleada.local + ' ' + mayorGoleada.a + '-' + mayorGoleada.b + ' ' + mayorGoleada.visit + '</strong></div>' : '');
        })
        .catch(function() {
            ['heroTotalPartidos', 'heroTotalGoles'].forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.textContent = '—';
            });
        });
}

APP.onChange(function() { cargarIndex(); });
