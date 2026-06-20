param(
    [string]$Season = "2025-26",
    [string]$Competition = "liga",
    [switch]$AllTeams
)

$dataDir = "data/$Season/$Competition"
$calendarioPath = "$dataDir/calendario.json"
$noticiasDir = "data/noticias"
$maxPorEquipo = 5

if (-not (Test-Path $noticiasDir)) {
    New-Item -ItemType Directory -Path $noticiasDir -Force | Out-Null
}

$ns = New-Object System.Xml.XmlNamespaceManager(New-Object System.Xml.NameTable)
$ns.AddNamespace("media", "http://search.yahoo.com/mrss/")

function NormalizarNombre($nombre) {
    $map = @{
        [char]0x00E1 = 'a'; [char]0x00E9 = 'e'; [char]0x00ED = 'i'
        [char]0x00F3 = 'o'; [char]0x00FA = 'u'; [char]0x00F1 = 'n'
        [char]0x00C1 = 'A'; [char]0x00C9 = 'E'; [char]0x00CD = 'I'
        [char]0x00D3 = 'O'; [char]0x00DA = 'U'; [char]0x00D1 = 'N'
    }
    $result = $nombre.ToLower()
    foreach ($ch in $map.Keys) { $result = $result.Replace([string]$ch, $map[$ch]) }
    $result = $result -replace '\s+', '-' -replace '[^a-z0-9-]', ''
    return $result
}

function ParsearFecha($str) {
    try {
        return [DateTime]::ParseExact($str, "ddd, dd MMM yyyy HH:mm:ss zzz", [System.Globalization.CultureInfo]::InvariantCulture)
    } catch {
        try {
            return [DateTime]::ParseExact($str, "ddd, dd MMM yyyy HH:mm:ss 'GMT'zzz", [System.Globalization.CultureInfo]::InvariantCulture)
        } catch {
            return [DateTime]::UtcNow
        }
    }
}

function ObtenerFeed($url, $fuenteNombre) {
    Write-Host "  Leyendo $fuenteNombre..." -ForegroundColor DarkGray
    try {
        $resp = Invoke-WebRequest -Uri $url -Method Get -TimeoutSec 15 -UseBasicParsing
        $doc = New-Object System.Xml.XmlDocument
        $doc.LoadXml($resp.Content)
        $items = $doc.rss.channel.item
        if (-not $items) { return @() }
        if ($items -isnot [array]) { $items = @($items) }

        $resultados = @()
        foreach ($item in $items) {
            $titulo = $item.title.'#cdata-section'
            if (-not $titulo) { continue }

            $media = $item.SelectNodes("media:content", $ns)
            $imagen = ""
            if ($media.Count -gt 0) { $imagen = $media[0].GetAttribute("url") }

            $fecha = ParsearFecha($item.pubDate)

            $resultados += [PSCustomObject]@{
                titulo = $titulo
                fecha = $fecha
                url = $item.link
                imagen = $imagen
                fuente = $fuenteNombre
            }
        }
        return $resultados
    } catch {
        Write-Host "    Error: $_" -ForegroundColor Yellow
        return @()
    }
}

function ContieneEquipo($titulo, $nombreEquipo) {
    $tituloLower = $titulo.ToLower()
    $nombreLower = $nombreEquipo.ToLower()

    $sinonimos = @{
        "barcelona" = @("barcelona", "barça", "azulgrana", "blaugrana", "fc barcelona")
        "real madrid" = @("real madrid", "madrid", "merengue", "blancos")
        "real betis" = @("real betis", "betis", "bétic", "verdiblanco")
        "atlético madrid" = @("atlético madrid", "atletico madrid", "colchonero")
        "athletic club" = @("athletic club", "athletic", "bilbao", "rojiBlanco")
        "real sociedad" = @("real sociedad", "sociedad", "txuri")
        "valencia" = @("valencia", "ché", "valencianista")
        "sevilla fc" = @("sevilla", "sevillista", "nervión")
        "celta de vigo" = @("celta", "céltico")
        "villarreal" = @("villarreal", "submarino amarillo", "groguet")
        "rayo vallecano" = @("rayo vallecano", "rayo", "franjirrojo")
    }

    $variantes = @($nombreLower)
    if ($sinonimos.ContainsKey($nombreLower)) {
        $variantes = $sinonimos[$nombreLower]
    }

    foreach ($v in $variantes) {
        if ($tituloLower -match [regex]::Escape($v)) { return $true }
    }
    return $false
}

$feeds = @(
    @{ url = "https://e00-marca.uecdn.es/rss/futbol/primera-division.xml"; fuente = "MARCA" },
    @{ url = "https://www.sport.es/es/rss/futbol/rss.xml"; fuente = "SPORT" }
)

if ($AllTeams) {
    if (-not (Test-Path $calendarioPath)) { Write-Host "ERROR: No existe $calendarioPath" -ForegroundColor Red; exit 1 }
    $liga = Get-Content -Raw $calendarioPath -Encoding UTF8 | ConvertFrom-Json
    $equipos = ($liga.data | ForEach-Object { $_.homeTeam.name }) | Select-Object -Unique | Sort-Object
} else {
    $equipos = @("Barcelona", "Real Betis", "Valencia", "Real Madrid")
}

# Obtener todos los items de todos los feeds
Write-Host "Descargando feeds RSS..." -ForegroundColor Cyan
$todosItems = @()
foreach ($f in $feeds) {
    $items = ObtenerFeed $f.url $f.fuente
    Write-Host "  $($items.Count) noticias de $($f.fuente)" -ForegroundColor Green
    $todosItems += $items
}
Write-Host "Total: $($todosItems.Count) noticias" -ForegroundColor Cyan

foreach ($nombre in $equipos) {
    Write-Host "Filtrando para: $nombre" -ForegroundColor Cyan

    $noticiasEq = $todosItems | Where-Object {
        (ContieneEquipo $_.titulo $nombre)
    } | Sort-Object fecha -Descending | Select-Object -First $maxPorEquipo

    $archivo = "$noticiasDir/$(NormalizarNombre $nombre).json"

    if ($noticiasEq.Count -gt 0) {
        $data = @{
            ultimaActualizacion = [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")
            noticias = $noticiasEq | ForEach-Object {
                @{
                    id = "$(NormalizarNombre $nombre)-$(Get-Random -Maximum 99999)"
                    titulo = $_.titulo
                    resumen = ""
                    fuente = $_.fuente
                    url = $_.url
                    imagen = $_.imagen
                    fecha = $_.fecha.ToString("yyyy-MM-dd")
                    categoria = "noticia"
                }
            }
        }
        $json = $data | ConvertTo-Json -Depth 5
        if (-not (Test-Path $archivo)) { New-Item -ItemType File -Path $archivo -Force | Out-Null }
        [System.IO.File]::WriteAllText((Resolve-Path $archivo).Path, $json, [System.Text.Encoding]::UTF8)
        Write-Host "  Guardadas $($noticiasEq.Count) noticias" -ForegroundColor Green
    } else {
        Write-Host "  Sin noticias recientes" -ForegroundColor DarkGray
    }
}

Write-Host "`n¡Noticias actualizadas!" -ForegroundColor Cyan
