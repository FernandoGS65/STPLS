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
        })
        .catch(() => {});
});
