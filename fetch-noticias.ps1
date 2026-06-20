param(
    [string]$Season = "2025-26",
    [string]$Competition = "liga",
    [switch]$AllTeams
)

$dataDir = "data/$Season/$Competition"
$calendarioPath = "$dataDir/calendario.json"
$noticiasDir = "data/noticias"
$maxNoticias = 10

if (-not (Test-Path $noticiasDir)) {
    New-Item -ItemType Directory -Path $noticiasDir -Force | Out-Null
}

function NormalizarNombre($nombre) {
    return $nombre.ToLower() -replace '\s+', '-' -replace 'á', 'a' -replace 'é', 'e' -replace 'í', 'i' -replace 'ó', 'o' -replace 'ú', 'u' -replace 'ñ', 'n' -replace '[^a-z0-9-]', ''
}

function BuscarNoticias($nombre) {
    Write-Host "Buscando noticias para: $nombre" -ForegroundColor Cyan

    $query = [System.Uri]::EscapeDataString("$nombre fútbol La Liga")
    $rssUrl = "https://news.google.com/rss/search?q=$query&hl=es&gl=ES&ceid=ES:es"

    try {
        $xml = Invoke-RestMethod -Uri $rssUrl -Method Get -TimeoutSec 15
        $items = $xml.rss.channel.item
        if (-not $items) { throw "Sin resultados" }
        if ($items -isnot [array]) { $items = @($items) }

        $noticias = @()
        foreach ($item in $items[0..[Math]::Min($items.Count, $maxNoticias)]) {
            $titulo = $item.title -replace '^.*?- ', ''
            $link = $item.link

            $fecha = try {
                [DateTime]::ParseExact($item.pubDate, "ddd, dd MMM yyyy HH:mm:ss zzz", [System.Globalization.CultureInfo]::InvariantCulture)
            } catch {
                [DateTime]::UtcNow
            }

            $fuente = $item.source -replace '^.*?<source.*?>(.*?)</source>.*$', '$1'
            if ($fuente -eq $item.source) { $fuente = "Google News" }

            $noticias += [PSCustomObject]@{
                id = "$(NormalizarNombre $nombre)-$(Get-Random -Maximum 99999)"
                titulo = $titulo
                resumen = $item.description -replace '<[^>]+>', '' -replace '^.*?: '
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
        $data | ConvertTo-Json -Depth 5 | ForEach-Object { [System.IO.File]::WriteAllText((Resolve-Path $archivo).Path, $_, [System.Text.Encoding]::UTF8) }
        Write-Host "  Guardadas $($noticias.Count) noticias en $archivo" -ForegroundColor Green
    } else {
        Write-Host "  No se encontraron noticias para $nombre" -ForegroundColor DarkGray
    }

    Start-Sleep -Seconds 1
}

Write-Host "`n¡Noticias actualizadas!" -ForegroundColor Cyan
