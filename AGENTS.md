# STPLS — Spanish Total Players League Scores

Vanilla static PWA site (no build tools, no package.json, no tests).

## Dev server

```powershell
.\server.ps1               # PowerShell HttpListener on http://localhost:8000
```

## Data fetching (PowerShell scripts)

```powershell
# Copy config first (API key from RapidAPI/highlightly.net)
copy config.example.json config.json

# Fetch match details (daily limit: 100 calls, 200ms delay between calls)
.\fetch-partidos.ps1 -Mode detail -StartIndex 0 -BatchSize 20

# Then lineups + boxscore (merges into existing match files)
.\fetch-partidos.ps1 -Mode lineups -StartIndex 0 -BatchSize 20
.\fetch-partidos.ps1 -Mode boxscore -StartIndex 0 -BatchSize 20

# Batch wrapper (same params)
.\fetch-batch.ps1 -StartIndex 0 -BatchSize 20
```

## Architecture

- **Static HTML + CSS + vanilla JS** — no frameworks, no bundler
- **`js/app.js`** — core module (`APP`): theme toggle, season/comp selector, data path routing (`APP.ruta()`)
- Pages register via `APP.onChange(fn)` — fires when season/comp changes
- `js/api.js` exists but is **unused** by any page (dead code)
- `style.css` — `@import` chain loading all CSS modules from `css/`
- `css/` directory — 11 modular CSS files, one per page/feature:
  - `variables.css` — reset, CSS custom properties, light mode
  - `layout.css` — navbar, nav-icons, hero, footer, page wrappers
  - `index.css` — index page: liga cards, mini tables (clasif/results/stats)
  - `clasificacion.css` — clasificación page: header, rows, zones, legend
  - `resultados.css` — resultados page: match cards, selectors
  - `equipos.css` — equipos page: team card grid
  - `equipo-page.css` — equipo detail: hero, palmares, tabs, stats, evolution, news, transfers
  - `partido.css` — partido page: all `pv-*` classes (header, stats, events, lineups, pitch, boxscore, predictions)
  - `jugadores.css` — jugadores page: search, player cards
  - `estadisticas.css` — estadísticas page: tabs, stat tables, player rows
  - `arbitros.css` — árbitros page
  - `responsive.css` — all `@media` queries consolidated

## Data layout

```
data/{season}/{competition}/
  calendario.json    — match schedule (380 matches)
  partidos/{id}.json — match detail (venue, events, stats, lineups, boxscore)
  videos.json        — RTVE embed URLs keyed by "LL-J{nn}-{home}-{away}"
  descargados.json   — index of downloaded matches (auto-regenerated after fetch)
data/equipos-info.json — stadium, capacity, trophies per team
data/fichajes.json     — transfers per team (keyed by slug)
data/seasons.json      — available seasons/competitions
```

## Page → JS mapping

| Page | JS | Key behavior |
|---|---|---|
| `index.html` | `js/index.js` | Uses raw.githubusercontent.com URL when not on localhost |
| `resultados.html` | `js/resultados.js` | Round selector |
| `clasificaciones.html` | `js/clasificacion.js` | Jornada-by-jornada standings |
| `equipos.html` | `js/equipos.js` | Team list from calendar data |
| `equipo.html` | `js/equipo.js` | Tabs: jugados/proximos/plantilla/noticias/fichajes/evolucion |
| `partido.html` | `js/partido.js` | Uses `?v=2` cache busting |
| `video.html` | `js/video.js` | Iframe or `<video>` element |
| `estadisticas.html` | `js/estadisticas.js` | Tabs: jugadores/equipo, stat tables |
| `jugadores.html` | `js/jugadores.js` | Hardcoded player data |

## Gotchas

- `config.json` is gitignored — must be copied from `config.example.json`
- Match `round` field format: `"Regular Season - 38"` — parse with `.split("-")[1]`
- Video key: `LL-J{pad2}-{homeNoAccentsNoSpaces}-{awayNoAccentsNoSpaces}`
- `partido.html` appends `?v=2` to CSS/JS for cache busting — match when editing
- `index.js` uses a hardcoded GitHub raw URL fallback for calendar data
- API key sends as `x-rapidapi-key` header (fetch script) but `api.js` (unused) uses `x-api-key`
- `jugadores.js` uses **hardcoded** player arrays, not API data
- `equipos.html` uses old `<header class="hero">` pattern (unlike other pages with `<nav>` only)
- `seasons.json` currently has one entry (`2025-26` / `liga`) — add entries there for new seasons
