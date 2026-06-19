document.addEventListener('DOMContentLoaded', () => {
    const ruta = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'data/laliga2025.json' : 'https://raw.githubusercontent.com/FernandoGS65/STPLS/refs/heads/main/data/laliga2025.json';

    fetch(ruta)
        .then(res => res.json())
        .then(partidos => {
            const total = partidos.length;
            const goles = partidos.reduce((acc, p) => {
                const s = p.state?.score?.current;
                if (s) {
                    const [a, b] = s.split(' - ').map(Number);
                    return acc + (isNaN(a) ? 0 : a) + (isNaN(b) ? 0 : b);
                }
                return acc;
            }, 0);
            document.getElementById('heroTotalPartidos').textContent = total;
            document.getElementById('heroTotalGoles').textContent = goles;

            // --- classify ---
            const equipos = {};
            partidos.forEach(p => {
                const s = p.state?.score?.current;
                if (!s) return;
                const [gL, gV] = s.split(' - ').map(Number);
                if (isNaN(gL) || isNaN(gV)) return;
                [p.homeTeam.name, p.awayTeam.name].forEach(n => { if (!equipos[n]) equipos[n] = { pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0 }; });
                const l = equipos[p.homeTeam.name];
                const v = equipos[p.awayTeam.name];
                l.pj++; v.pj++;
                l.gf += gL; l.gc += gV;
                v.gf += gV; v.gc += gL;
                if (gL > gV) { l.pg++; v.pp++; }
                else if (gL < gV) { l.pp++; v.pg++; }
                else { l.pe++; v.pe++; }
            });
            const clasif = Object.entries(equipos).map(([nombre, e]) => ({
                nombre, ...e, pts: e.pg * 3 + e.pe, dg: e.gf - e.gc
            })).sort((a, b) => b.pts - a.pts || b.dg - a.dg);

            // --- top 8 classification ---
            const top8 = clasif.slice(0, 8);
            const zona = (i) => i < 4 ? 'champions' : i < 6 ? 'europa' : i < 7 ? 'conference' : 'descenso';
            document.getElementById('index-clasificacion').innerHTML = top8.map((e, i) => {
                const escudo = `https://raw.githubusercontent.com/FernandoGS65/STPLS/main/imagenes/${e.nombre.replaceAll(' ', '%20')}.png`;
                return `<a href="equipo.html?id=${encodeURIComponent(e.nombre)}" class="clasif-row clasif-${zona(i)}">
                    <span class="clasif-pos">${i + 1}</span>
                    <img src="${escudo}" class="clasif-escudo" alt="" onerror="this.style.display='none'">
                    <span class="clasif-nombre">${e.nombre}</span>
                    <span class="clasif-pts">${e.pts}</span>
                </a>`;
            }).join('');

            // --- last 5 results ---
            const terminados = partidos.filter(p => p.state?.description === 'Finished').reverse().slice(0, 5);
            document.getElementById('index-resultados').innerHTML = terminados.map(p => {
                const s = p.state.score.current;
                return `<div class="resultado-row">
                    <span class="resultado-equipo">${p.homeTeam.name}</span>
                    <strong class="resultado-marcador">${s}</strong>
                    <span class="resultado-equipo">${p.awayTeam.name}</span>
                </div>`;
            }).join('');

            // --- season stats ---
            const totalG = goles;
            const media = (totalG / total).toFixed(1);
            const mayorGoleada = partidos.reduce((m, p) => {
                const s = p.state?.score?.current;
                if (!s) return m;
                const [a, b] = s.split(' - ').map(Number);
                if (isNaN(a) || isNaN(b)) return m;
                const dif = Math.abs(a - b);
                return dif > (m.dif || 0) ? { local: p.homeTeam.name, visit: p.awayTeam.name, a, b, dif } : m;
            }, { dif: 0 });

            const jornadas = new Set(partidos.map(p => p.round));
            const finJornadas = partidos.filter(p => p.state?.description === 'Finished');
            const ultJornada = [...new Set(finJornadas.map(p => p.round))].pop() || '';

            document.getElementById('index-stats').innerHTML = `
                <div class="stats-grid">
                    <div class="stat-item"><strong>${total}</strong><span>Partidos</span></div>
                    <div class="stat-item"><strong>${totalG}</strong><span>Goles</span></div>
                    <div class="stat-item"><strong>${media}</strong><span>Media /partido</span></div>
                    <div class="stat-item"><strong>${jornadas.size}</strong><span>Jornadas</span></div>
                </div>
                ${mayorGoleada.dif > 0 ? `<div class="mayor-goleada">Mayor goleada: <strong>${mayorGoleada.local} ${mayorGoleada.a}-${mayorGoleada.b} ${mayorGoleada.visit}</strong></div>` : ''}
            `;
        })
        .catch(() => {
            ['heroTotalPartidos', 'heroTotalGoles'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = '—';
            });
        });
});
