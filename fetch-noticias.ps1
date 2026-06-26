param(
    [string]$Team = "",
    [string]$Season = "2025-26",
    [string]$Competition = "liga"
)

$root = $PSScriptRoot
$outDir = Join-Path $root "data/$Season/$Competition/noticias"
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

$feeds = @(
    @{ url = "https://e00-marca.uecdn.es/rss/futbol/primera-division.xml"; fuente = "MARCA" },
    @{ url = "https://www.sport.es/es/rss/futbol/rss.xml"; fuente = "SPORT" },
    @{ url = "https://feeds.as.com/mrss-s/pages/as/site/as.com/portada"; fuente = "AS" },
    @{ url = "https://www.football-espana.net/feed"; fuente = "FOOTBALL ESPANA" },
    @{ url = "https://www.transfermarkt.es/rss/news"; fuente = "TRANSFERMARKT" }
)

$teamAliases = @{
    "alaves"            = @("alavés", "alaves")
    "athletic-club"     = @("athletic", "bilbao", "athletic club")
    "atletico-madrid"   = @("atlético", "atletico", "colchonero")
    "barcelona"         = @("barcelona", "barça", "fc barcelona", "blaugrana")
    "celta-de-vigo"     = @("celta", "céltico")
    "elche"             = @("elche")
    "espanyol"          = @("espanyol")
    "getafe"            = @("getafe")
    "girona"            = @("girona")
    "levante"           = @("levante")
    "mallorca"          = @("mallorca")
    "osasuna"           = @("osasuna")
    "oviedo"            = @("oviedo")
    "rayo-vallecano"    = @("rayo", "vallecano")
    "real-betis"        = @("betis", "real betis", "bétic", "verdiblanco")
    "real-madrid"       = @("madrid", "real madrid", "merengue")
    "real-sociedad"     = @("sociedad", "real sociedad", "txuri")
    "sevilla-fc"        = @("sevilla", "sevillista", "nervión")
    "valencia"          = @("valencia", "ché")
    "villarreal"        = @("villarreal", "submarino")
}

function Get-TeamSlug($nombre) {
    $slug = $nombre.ToLower().Trim()
    $slug = $slug -replace 'á', 'a'
    $slug = $slug -replace 'é', 'e'
    $slug = $slug -replace 'í', 'i'
    $slug = $slug -replace 'ó', 'o'
    $slug = $slug -replace 'ú', 'u'
    $slug = $slug -replace 'ñ', 'n'
    $slug = $slug -replace 'ü', 'u'
    $slug = $slug -replace '\s+', '-'
    $slug = $slug -replace '[^a-z0-9-]', ''
    return $slug
}

function Get-Aliases($slug) {
    if ($teamAliases.ContainsKey($slug)) {
        return $teamAliases[$slug]
    }
    return @($slug)
}

function Test-TitleMatchesTeam($titulo, $aliases) {
    $t = $titulo.ToLower()
    foreach ($alias in $aliases) {
        if ($t.Contains($alias)) { return $true }
    }
    return $false
}

$nonFootballPatterns = @(
    'baloncesto', 'basketball', 'nba', 'euroliga', 'acb', 'endesa',
    'tenis', 'atletismo', 'ciclismo', 'f1', 'formula 1', 'motociclismo',
    'nfl', 'baseball', 'golf', 'boxeo', 'ufc', 'mma',
    'podcast', 'minuto 116'
)

$footballUrlPatterns = @('/futbol/', '/football/', '/soccer/', '/la-liga/', '/laliga/', '/primera-division')

function Test-IsFootball($titulo, $link) {
    $t = $titulo.ToLower()
    $l = $link.ToLower()

    foreach ($pattern in $nonFootballPatterns) {
        if ($t.Contains($pattern)) { return $false }
        if ($l.Contains($pattern)) { return $false }
    }

    foreach ($pattern in $footballUrlPatterns) {
        if ($l.Contains($pattern)) { return $true }
    }

    $footballWords = @('fichaje', 'fichó', 'firma', 'contrato', 'gol', 'partido', 'liga',
        'champions', 'europa league', 'copa', 'transfer', 'signing', 'deal',
        'match', 'goal', 'league', 'season', 'manager', 'coach', 'entrenador',
        'jugador', 'player', 'equipo', 'team', 'goles', 'tarjeta', 'red card',
        'yellow card', 'expulsión', 'lesión', 'injury', 'ondule', 'titular',
        'alineación', 'lineup', 'suplente', 'sustitución', 'penalti', 'penalty',
        'corner', 'tiro', 'shot', 'pases', 'posesión', 'possession', 'xg',
        'market value', 'valor de mercado', 'cláusula', 'clause', 'cedido', 'loan',
        'libre', 'free agent', 'renovación', 'extension', 'despido', 'dismissal')
    foreach ($word in $footballWords) {
        if ($t.Contains($word)) { return $true }
    }

    return $false
}

function Parse-FeedXml($xmlContent, $fuente) {
    $items = @()
    try {
        [xml]$xml = $xmlContent

        $nsManager = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
        $nsManager.AddNamespace("media", "http://search.yahoo.com/mrss/")

        $entries = @()
        if ($xml.rss) {
            $entries = $xml.rss.channel.item
        } elseif ($xml.feed) {
            $entries = $xml.feed.entry
        }
        if (-not $entries) { return @() }

        foreach ($entry in $entries) {
            $titulo = ""
            if ($entry.title) {
                $titulo = if ($entry.title -is [System.Xml.XmlElement]) { $entry.title.InnerText } else { [string]$entry.title }
                $titulo = $titulo.Trim()
            }

            $link = ""
            if ($entry.link) {
                $link = if ($entry.link -is [System.Xml.XmlElement]) {
                    $href = $entry.link.GetAttribute("href")
                    if ($href) { $href } else { $entry.link.InnerText }
                } else { [string]$entry.link }
                $link = $link.Trim()
            }

            $pubDate = ""
            if ($entry.pubDate) {
                $pubDate = if ($entry.pubDate -is [System.Xml.XmlElement]) { $entry.pubDate.InnerText } else { [string]$entry.pubDate }
                $pubDate = $pubDate.Trim()
            } elseif ($entry.published) {
                $pubDate = if ($entry.published -is [System.Xml.XmlElement]) { $entry.published.InnerText } else { [string]$entry.published }
                $pubDate = $pubDate.Trim()
            } elseif ($entry.updated) {
                $pubDate = if ($entry.updated -is [System.Xml.XmlElement]) { $entry.updated.InnerText } else { [string]$entry.updated }
                $pubDate = $pubDate.Trim()
            }

            $imagen = ""
            if ($entry.enclosure -and $entry.enclosure.url) {
                $imagen = [string]$entry.enclosure.url
            }
            if (-not $imagen) {
                $mediaContent = $entry.SelectSingleNode("media:content", $nsManager)
                if ($mediaContent -and $mediaContent.url) {
                    $imagen = [string]$mediaContent.url
                }
            }
            if (-not $imagen) {
                $mediaThumbnail = $entry.SelectSingleNode("media:thumbnail", $nsManager)
                if ($mediaThumbnail -and $mediaThumbnail.url) {
                    $imagen = [string]$mediaThumbnail.url
                }
            }
            if (-not $imagen -and $entry.description) {
                $desc = if ($entry.description -is [System.Xml.XmlElement]) { $entry.description.InnerText } else { [string]$entry.description }
                $match = [regex]::Match($desc, 'src=["'']([^"'']+)["'']')
                if ($match.Success) {
                    $imagen = $match.Groups[1].Value
                }
            }

            if ($imagen -and $imagen -match '\.(mp4|webm|avi|mov)(\?|$)') {
                $imagen = ""
            }

            $fecha = $null
            if ($pubDate) {
                try { $fecha = [DateTime]::Parse($pubDate) } catch {}
            }

            if (-not [string]::IsNullOrWhiteSpace($titulo)) {
                $items += @{
                    titulo = $titulo
                    link = $link
                    fecha = $fecha
                    imagen = $imagen
                    fuente = $fuente
                }
            }
        }
    } catch {
        Write-Host "  Error parseando feed $fuente : $($_.Exception.Message)" -ForegroundColor Yellow
    }
    return $items
}

$corte = (Get-Date).AddDays(-7)

$allItems = @()

Write-Host "Descargando feeds RSS..." -ForegroundColor Cyan
foreach ($feed in $feeds) {
    Write-Host "  $($feed.fuente)..." -NoNewline
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $webClient = New-Object System.Net.WebClient
        $webClient.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) STPLS/1.0")
        $webClient.Encoding = [System.Text.Encoding]::UTF8
        $xmlContent = $webClient.DownloadString($feed.url)
        $items = Parse-FeedXml $xmlContent $feed.fuente
        $allItems += $items
        Write-Host " OK ($($items.Count) items)" -ForegroundColor Green
    } catch {
        Write-Host " FALLO: $($_.Exception.Message)" -ForegroundColor Red
    }
    Start-Sleep -Milliseconds 200
}

Write-Host ""
Write-Host "Total items descargados: $($allItems.Count)" -ForegroundColor Cyan

$byTeam = @{}

foreach ($item in $allItems) {
    if (-not $item.fecha) { continue }
    if ($item.fecha -lt $corte) { continue }
    if ([string]::IsNullOrWhiteSpace($item.titulo)) { continue }
    if (-not (Test-IsFootball $item.titulo $item.link)) { continue }

    foreach ($teamEntry in $teamAliases.GetEnumerator()) {
        $slug = $teamEntry.Key
        $aliases = $teamEntry.Value

        if (Test-TitleMatchesTeam $item.titulo $aliases) {
            if (-not $byTeam.ContainsKey($slug)) {
                $byTeam[$slug] = @()
            }

            $exists = $false
            foreach ($existing in $byTeam[$slug]) {
                if ($existing.titulo -eq $item.titulo -and $existing.fuente -eq $item.fuente) {
                    $exists = $true
                    break
                }
            }
            if (-not $exists) {
                $byTeam[$slug] += @{
                    titulo = $item.titulo
                    fecha = $item.fecha.ToString("yyyy-MM-ddTHH:mm:ss.000Z")
                    url = $item.link
                    imagen = $item.imagen
                    fuente = $item.fuente
                }
            }
        }
    }
}

if ($Team -ne "") {
    $slug = Get-TeamSlug $Team
    $noticias = if ($byTeam.ContainsKey($slug)) {
        $byTeam[$slug] | Sort-Object { [DateTime]$_.fecha } -Descending
    } else {
        @()
    }
    $outFile = Join-Path $outDir "$slug.json"
    $noticias | ConvertTo-Json -Depth 5 | Set-Content -Path $outFile -Encoding UTF8
    Write-Host "Guardado: $slug.json ($($noticias.Count) noticias)" -ForegroundColor Green
} else {
    foreach ($teamEntry in $teamAliases.GetEnumerator()) {
        $slug = $teamEntry.Key
        $noticias = if ($byTeam.ContainsKey($slug)) {
            $byTeam[$slug] | Sort-Object { [DateTime]$_.fecha } -Descending
        } else {
            @()
        }
        $outFile = Join-Path $outDir "$slug.json"
        $noticias | ConvertTo-Json -Depth 5 | Set-Content -Path $outFile -Encoding UTF8
        Write-Host "Guardado: $slug.json ($($noticias.Count) noticias)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Hecho." -ForegroundColor Cyan
