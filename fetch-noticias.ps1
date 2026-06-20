param(
    [string]$Season = "2025-26",
    [string]$Competition = "liga",
    [switch]$AllTeams
)

$dataDir = "data/$Season/$Competition"
$calendarioPath = "$dataDir/calendario.json"
$noticiasDir = "data/noticias"
$maxNoticias = 8
$diasMaximos = 2

if (-not (Test-Path $noticiasDir)) {
    New-Item -ItemType Directory -Path $noticiasDir -Force | Out-Null
}

function NormalizarNombre($nombre) {
    return $nombre.ToLower() -replace '\s+', '-' -replace 'á', 'a' -replace 'é', 'e' -replace 'í', 'i' -replace 'ó', 'o' -replace 'ú', 'u' -replace 'ñ', 'n' -replace '[^a-z0-9-]', ''
}

function BuscarNoticias($nombre) {
    Write-Host "Buscando noticias para: $nombre" -ForegroundColor Cyan

    $query = [System.Uri]::EscapeDataString("$nombre La Liga")
    $rssUrl = "https://news.google.com/rss/search?q=$query&hl=es&gl=ES&ceid=ES:es"
    $corte = (Get-Date).AddDays(-$diasMaximos)

    try {
        $resp = Invoke-WebRequest -Uri $rssUrl -Method Get -TimeoutSec 15 -UseBasicParsing
        [xml]$xml = $resp.Content
        $items = $xml.rss.channel.item
        if (-not $items) { throw "Sin resultados" }
        if ($items -isnot [array]) { $items = @($items) }

        $excluir = @('basket', 'baloncesto', 'acb', 'euroleague', 'handball', 'balonmano', 'futsal', 'liga endesa', 'playoff final', 'nba', 'euroliga')
        $vistos = @{}
        $noticias = @()

        foreach ($item in $items) {
            if ($noticias.Count -ge $maxNoticias) { break }

            $tituloRaw = $item.title
            if ([string]::IsNullOrWhiteSpace($tituloRaw) -or $tituloRaw.Length -lt 20) { continue }

            $excluirMatch = $false
            foreach ($palabra in $excluir) {
                if ($tituloRaw.ToLower() -match $palabra) { $excluirMatch = $true; break }
            }
            if ($excluirMatch) { continue }

            $titulo = $tituloRaw
            $fuente = ""

            if ($tituloRaw -match '\s*-\s*(.+)$') {
                $fuente = $matches[1].Trim()
                $titulo = $tituloRaw.Substring(0, $tituloRaw.Length - $matches[0].Length).Trim()
            }

            if ($item.source.'#text') {
                $fuente = $item.source.'#text'
            }

            if ($vistos.ContainsKey($titulo)) { continue }
            $vistos[$titulo] = $true

            $fecha = try {
                [DateTime]::ParseExact($item.pubDate, "ddd, dd MMM yyyy HH:mm:ss zzz", [System.Globalization.CultureInfo]::InvariantCulture)
            } catch {
                [DateTime]::UtcNow
            }

            if ($fecha -lt $corte) { continue }

            $link = $item.link
            if ([string]::IsNullOrWhiteSpace($fuente)) { $fuente = "Google News" }

            $descHtml = $item.description
            $resumen = $descHtml -replace '<[^>]+>', ''
            $resumen = $resumen -replace '^\s*', ''
            $resumen = $resumen -replace '\s+', ' '
            if ($resumen.Length -gt 200) { $resumen = $resumen.Substring(0, 200) + "..." }

            $noticias += [PSCustomObject]@{
                id = "$(NormalizarNombre $nombre)-$(Get-Random -Maximum 99999)"
                titulo = $titulo
                resumen = $resumen
                fuente = $fuente
                url = $link
                imagen = ""
                fecha = $fecha.ToString("yyyy-MM-dd")
                categoria = "noticia"
            }
        }

        return $noticias
    }
    catch {
        Write-Host "  Error: $_" -ForegroundColor Yellow
        return $null
    }
}

if ($AllTeams) {
    if (-not (Test-Path $calendarioPath)) {
        Write-Host "ERROR: No existe $calendarioPath" -ForegroundColor Red
        exit 1
    }
    $liga = Get-Content -Raw $calendarioPath -Encoding UTF8 | ConvertFrom-Json
    $equipos = ($liga.data | ForEach-Object { $_.homeTeam.name }) | Select-Object -Unique | Sort-Object
} else {
    $equipos = @("FC Barcelona", "Real Madrid")
}

foreach ($nombre in $equipos) {
    $noticias = BuscarNoticias($nombre)
    $archivo = "$noticiasDir/$(NormalizarNombre $nombre).json"

    if ($noticias -and $noticias.Count -gt 0) {
        $data = @{
            ultimaActualizacion = [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")
            noticias = $noticias
        }
        $json = $data | ConvertTo-Json -Depth 5
        [System.IO.File]::WriteAllText((Resolve-Path $archivo).Path, $json, [System.Text.Encoding]::UTF8)
        Write-Host "  Guardadas $($noticias.Count) noticias en $archivo" -ForegroundColor Green
    } else {
        Write-Host "  No se encontraron noticias para $nombre" -ForegroundColor DarkGray
    }

    Start-Sleep -Milliseconds 500
}

Write-Host "`n¡Noticias actualizadas!" -ForegroundColor Cyan
