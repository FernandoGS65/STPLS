param(
    [string]$OutputPath = "data/equipos-info.json"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$teamSlugs = @(
    @{ name = "Arsenal";         wiki = "Arsenal_F.C." }
    @{ name = "Aston Villa";     wiki = "Aston_Villa_F.C." }
    @{ name = "Bournemouth";     wiki = "AFC_Bournemouth" }
    @{ name = "Brentford";       wiki = "Brentford_F.C." }
    @{ name = "Brighton";        wiki = "Brighton_%26_Hove_Albion_F.C." }
    @{ name = "Chelsea";         wiki = "Chelsea_F.C." }
    @{ name = "Coventry";        wiki = "Coventry_City_F.C." }
    @{ name = "Crystal Palace";  wiki = "Crystal_Palace_F.C." }
    @{ name = "Everton";         wiki = "Everton_F.C." }
    @{ name = "Fulham";          wiki = "Fulham_F.C." }
    @{ name = "Hull City";       wiki = "Hull_City_A.F.C." }
    @{ name = "Ipswich";         wiki = "Ipswich_Town_F.C." }
    @{ name = "Leeds";           wiki = "Leeds_United_F.C." }
    @{ name = "Liverpool";       wiki = "Liverpool_F.C." }
    @{ name = "Manchester City"; wiki = "Manchester_City_F.C." }
    @{ name = "Manchester United"; wiki = "Manchester_United_F.C." }
    @{ name = "Newcastle United"; wiki = "Newcastle_United_F.C." }
    @{ name = "Nottingham Forest"; wiki = "Nottingham_Forest_F.C." }
    @{ name = "Sunderland";      wiki = "Sunderland_A.F.C." }
    @{ name = "Tottenham";       wiki = "Tottenham_Hotspur_F.C." }
)

function Get-InfoboxValue($page, $label) {
    $infobox = $page.parse.text.'#text'
    if (-not $infobox) { return $null }
    # Try to find the infobox row for the given label
    $pattern = '(?s)' + [regex]::Escape($label) + '.*?<td[^>]*>(.*?)</td>'
    $match = [regex]::Match($infobox, $pattern)
    if ($match.Success) {
        $val = $match.Groups[1].Value
        # Strip HTML tags
        $val = $val -replace '<[^>]+>', ''
        $val = $val.Trim()
        # Remove citation markers [1], [2], etc.
        $val = $val -replace '\[\d+\]', ''
        $val = $val.Trim()
        return $val
    }
    return $null
}

function Get-Capacity($page) {
    $infobox = $page.parse.text.'#text'
    if (-not $infobox) { return $null }
    # Look for capacity pattern like "12,500" or "60,000" in a table cell after "Capacity"
    $pattern = '(?s)Capacity.*?<td[^>]*>(.*?)</td>'
    $match = [regex]::Match($infobox, $pattern)
    if ($match.Success) {
        $val = $match.Groups[1].Value
        $val = $val -replace '<[^>]+>', ''
        $val = $val -replace '\[\d+\]', ''
        $val = $val.Trim()
        # Extract digits
        $digits = $val -replace '\D', ''
        if ($digits -ne '') { return [int]$digits }
    }
    return $null
}

$existing = @{}
if (Test-Path $OutputPath) {
    $existing = Get-Content -Raw $OutputPath -Encoding UTF8 | ConvertFrom-Json
}

$result = @{}
# Copy existing La Liga data
foreach ($prop in $existing.PSObject.Properties) {
    $result[$prop.Name] = $prop.Value
}

$ok = 0; $fail = 0

Write-Host "=== Fetching Premier League team info from Wikipedia ===" -ForegroundColor Cyan
Write-Host ""

foreach ($team in $teamSlugs) {
    Write-Host "[$($team.name)]..." -NoNewline

    try {
        $url = "https://en.wikipedia.org/w/api.php?action=parse&page=$($team.wiki)&prop=text&section=0&format=json&redirects=1"
        $resp = Invoke-RestMethod -Uri $url -Method Get -ContentType "application/json"
        
        $infobox = $resp.parse.text.'#text'
        if (-not $infobox) {
            Write-Host " SKIP (no infobox)" -ForegroundColor DarkGray
            continue
        }

        $data = @{
            fundacion = 0
            ciudad = ""
            estadio = ""
            capacidad = 0
            temporadasPrimera = 0
            liga = 0
            champions = 0
            copaRey = 0
            supercopa = 0
            europaLeague = 0
            recopa = 0
            mundialClubes = 0
            web = ""
            apodo = ""
            colores = ""
        }

        # city
        $city = Get-InfoboxValue $resp "Location|City|Location"
        if (-not $city) { $city = Get-InfoboxValue $resp "City" }
        if (-not $city) {
            # Try to extract from the text
            $locMatch = [regex]::Match($infobox, '(?s)Location.*?<td[^>]*>(.*?)<br')
            if ($locMatch.Success) {
                $city = $locMatch.Groups[1].Value -replace '<[^>]+>', '' -replace '\[\d+\]', '' -replace ', England', '' -replace ', United Kingdom', ''
                $city = $city.Trim()
            }
        }
        $data.ciudad = ($city -replace ', England', '' -replace ', United Kingdom', '' -replace ', UK', '').Trim()

        # stadium
        $stadium = Get-InfoboxValue $resp "Stadium|Ground"
        $data.estadio = ($stadium -replace '<[^>]+>', '' -replace '\[\d+\]', '').Trim()

        # capacity
        $cap = Get-Capacity $resp
        if ($cap) { $data.capacidad = $cap }

        # founded
        $founded = Get-InfoboxValue $resp "Founded|Founding"
        if ($founded) {
            $yearMatch = [regex]::Match($founded, '(\d{4})')
            if ($yearMatch.Success) { $data.fundacion = [int]$yearMatch.Groups[1].Value }
        }

        # website
        $web = Get-InfoboxValue $resp "Website"
        if ($web) { $data.web = $web.Trim() }

        # nickname
        $nick = Get-InfoboxValue $resp "Nickname\(s\)|Nickname"
        if ($nick) { $data.apodo = $nick.Trim() }

        # colors
        $colors = Get-InfoboxValue $resp "Colour\(s\)|Colors|Colour"
        if ($colors) { $data.colores = $colors.Trim() }

        # league titles
        $leagueTitles = Get-InfoboxValue $resp "League titles|Premier League"
        if ($leagueTitles) {
            $numMatch = [regex]::Match($leagueTitles, '(\d+)')
            if ($numMatch.Success) { $data.liga = [int]$numMatch.Groups[1].Value }
        }

        # FA Cup
        $faCup = Get-InfoboxValue $resp "FA Cup"
        if (-not $faCup) { $faCup = Get-InfoboxValue $resp "FA Cups" }
        if ($faCup) {
            $numMatch = [regex]::Match($faCup, '(\d+)')
            if ($numMatch.Success) { $data.copaRey = [int]$numMatch.Groups[1].Value }
        }

        # Champions League / European Cup
        $ucl = Get-InfoboxValue $resp "UEFA Champions|European Cup"
        if ($ucl) {
            $numMatch = [regex]::Match($ucl, '(\d+)')
            if ($numMatch.Success) { $data.champions = [int]$numMatch.Groups[1].Value }
        }

        # Community Shield
        $shield = Get-InfoboxValue $resp "FA Community|Community Shield"
        if ($shield) {
            $numMatch = [regex]::Match($shield, '(\d+)')
            if ($numMatch.Success) { $data.supercopa = [int]$numMatch.Groups[1].Value }
        }

        # Europa League / UEFA Cup
        $uel = Get-InfoboxValue $resp "UEFA Europa|Europa League"
        if ($uel) {
            $numMatch = [regex]::Match($uel, '(\d+)')
            if ($numMatch.Success) { $data.europaLeague = [int]$numMatch.Groups[1].Value }
        }

        # Web
        $web = Get-InfoboxValue $resp "Website"
        if ($web) {
            $web = $web.Trim()
            $data.web = $web
        }

        $result[$team.name] = $data
        Write-Host " OK" -ForegroundColor Green
        $ok++

        Start-Sleep -Milliseconds 300
    } catch {
        Write-Host " FAIL: $($_.Exception.Message)" -ForegroundColor Red
        $fail++
    }
}

Write-Host ""
Write-Host "OK: $ok | Fail: $fail" -ForegroundColor Cyan

# Write output JSON manually for order preservation
$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine("{")
$keys = @($result.Keys | Sort-Object)
for ($k = 0; $k -lt $keys.Count; $k++) {
    $key = $keys[$k]
    $d = $result[$key]
    $comma = if ($k -lt $keys.Count - 1) { "," } else { "" }
    [void]$sb.AppendLine("  `"$key`": {")
    [void]$sb.AppendLine("    `"fundacion`": $($d.fundacion),")
    [void]$sb.AppendLine("    `"ciudad`": `"$($d.ciudad)`",")
    [void]$sb.AppendLine("    `"estadio`": `"$($d.estadio)`",")
    [void]$sb.AppendLine("    `"capacidad`": $($d.capacidad),")
    [void]$sb.AppendLine("    `"temporadasPrimera`": $($d.temporadasPrimera),")
    [void]$sb.AppendLine("    `"liga`": $($d.liga),")
    [void]$sb.AppendLine("    `"champions`": $($d.champions),")
    [void]$sb.AppendLine("    `"copaRey`": $($d.copaRey),")
    [void]$sb.AppendLine("    `"supercopa`": $($d.supercopa),")
    [void]$sb.AppendLine("    `"europaLeague`": $($d.europaLeague),")
    [void]$sb.AppendLine("    `"recopa`": $($d.recopa),")
    [void]$sb.AppendLine("    `"mundialClubes`": $($d.mundialClubes),")
    [void]$sb.AppendLine("    `"web`": `"$($d.web)`",")
    [void]$sb.AppendLine("    `"apodo`": `"$($d.apodo)`",")
    [void]$sb.AppendLine("    `"colores`": `"$($d.colores)`"")
    [void]$sb.AppendLine("  }$comma")
}
[void]$sb.AppendLine("}")
[System.IO.File]::WriteAllText($OutputPath, $sb.ToString(), [System.Text.Encoding]::UTF8)

Write-Host "Guardado: $OutputPath" -ForegroundColor Green
Write-Host "Hecho!" -ForegroundColor Cyan