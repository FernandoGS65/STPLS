param(
    [string]$ConfigPath = "config.json",
    [string]$Season = "2025-26",
    [string]$Competition = "liga"
)

if (-not (Test-Path $ConfigPath)) {
    Write-Host "ERROR: No existe config.json." -ForegroundColor Red
    exit 1
}

$config = Get-Content -Raw $ConfigPath | ConvertFrom-Json
$baseUrl = $config.baseUrl

if ($config.apiKeys -and $config.apiKeys.Count -gt 0) {
    $apiKeys = @($config.apiKeys)
} else {
    Write-Host "ERROR: No se encontraron API keys." -ForegroundColor Red
    exit 1
}

$script:currentKeyIndex = 0
function Get-NextHeader {
    $key = $apiKeys[$script:currentKeyIndex % $apiKeys.Count]
    $script:currentKeyIndex++
    return @{ "x-rapidapi-key" = $key }
}

Write-Host "API keys: $($apiKeys.Count)" -ForegroundColor Yellow

$dataDir = "data/$Season/$Competition"
$calendarioPath = "$dataDir/calendario.json"
$partidosDir = "$dataDir/partidos"
$descargadosPath = "$dataDir/descargados.json"

$liga = Get-Content -Raw $calendarioPath -Encoding UTF8 | ConvertFrom-Json
$matches = $liga.data | Sort-Object round, date
$desc = Get-Content -Raw $descargadosPath -Encoding UTF8 | ConvertFrom-Json

$sinDetalle = @($desc | Where-Object { -not $_.detail } | ForEach-Object { $_.id })
$sinLineups = @($desc | Where-Object { -not $_.lineups } | ForEach-Object { $_.id })
$sinBoxscore = @($desc | Where-Object { -not $_.boxscore } | ForEach-Object { $_.id })

Write-Host ""
Write-Host "=== FASE 1: Detalle ($($sinDetalle.Count) partidos) ===" -ForegroundColor Cyan
$ok = 0; $fail = 0
foreach ($matchId in $sinDetalle) {
    $m = $matches | Where-Object { $_.id -eq $matchId } | Select-Object -First 1
    if (-not $m) { continue }
    $outPath = "$partidosDir/$matchId.json"
    $label = "$($m.homeTeam.name) vs $($m.awayTeam.name) J$([int]($m.round -replace 'Regular Season - '))"
    try {
        Write-Host "  $label... " -NoNewline
        $resp = Invoke-RestMethod -Uri "$baseUrl/matches/$matchId" -Headers (Get-NextHeader) -Method Get
        if ($resp -is [System.Array]) { $resp = $resp[0] }

        if (Test-Path $outPath) {
            $existente = Get-Content -Raw $outPath -Encoding UTF8 | ConvertFrom-Json
        } else {
            $existente = @{}
        }
        foreach ($prop in $resp.PSObject.Properties) {
            $existente | Add-Member -MemberType NoteProperty -Name $prop.Name -Value $prop.Value -Force
        }
        $existente | ConvertTo-Json -Depth 10 -Compress | ForEach-Object { [System.IO.File]::WriteAllText($outPath, $_, [System.Text.Encoding]::UTF8) }
        Write-Host "OK" -ForegroundColor Green
        $ok++
    } catch {
        Write-Host "FAIL: $_" -ForegroundColor Red
        $fail++
    }
    Start-Sleep -Milliseconds 200
}

Write-Host ""
Write-Host "=== FASE 2: Alineaciones ($($sinLineups.Count) partidos) ===" -ForegroundColor Cyan
$ok2 = 0; $fail2 = 0
foreach ($matchId in $sinLineups) {
    $m = $matches | Where-Object { $_.id -eq $matchId } | Select-Object -First 1
    if (-not $m) { continue }
    $outPath = "$partidosDir/$matchId.json"
    $label = "$($m.homeTeam.name) vs $($m.awayTeam.name) J$([int]($m.round -replace 'Regular Season - '))"
    try {
        Write-Host "  $label... " -NoNewline
        $resp = Invoke-RestMethod -Uri "$baseUrl/lineups/$matchId" -Headers (Get-NextHeader) -Method Get

        if (Test-Path $outPath) {
            $existente = Get-Content -Raw $outPath -Encoding UTF8 | ConvertFrom-Json
        } else {
            $existente = @{}
        }
        $existente | Add-Member -MemberType NoteProperty -Name "lineups" -Value $resp -Force
        $existente | ConvertTo-Json -Depth 10 -Compress | ForEach-Object { [System.IO.File]::WriteAllText($outPath, $_, [System.Text.Encoding]::UTF8) }
        Write-Host "OK" -ForegroundColor Green
        $ok2++
    } catch {
        Write-Host "FAIL: $_" -ForegroundColor Red
        $fail2++
    }
    Start-Sleep -Milliseconds 200
}

Write-Host ""
Write-Host "=== FASE 3: Box Score ($($sinBoxscore.Count) partidos) ===" -ForegroundColor Cyan
$ok3 = 0; $fail3 = 0
foreach ($matchId in $sinBoxscore) {
    $m = $matches | Where-Object { $_.id -eq $matchId } | Select-Object -First 1
    if (-not $m) { continue }
    $outPath = "$partidosDir/$matchId.json"
    $label = "$($m.homeTeam.name) vs $($m.awayTeam.name) J$([int]($m.round -replace 'Regular Season - '))"
    try {
        Write-Host "  $label... " -NoNewline
        $resp = Invoke-RestMethod -Uri "$baseUrl/box-score/$matchId" -Headers (Get-NextHeader) -Method Get
        if ($resp -is [System.Array]) { $resp = $resp[0] }

        if (Test-Path $outPath) {
            $existente = Get-Content -Raw $outPath -Encoding UTF8 | ConvertFrom-Json
        } else {
            $existente = @{}
        }
        $existente | Add-Member -MemberType NoteProperty -Name "boxScore" -Value $resp -Force
        $existente | ConvertTo-Json -Depth 10 -Compress | ForEach-Object { [System.IO.File]::WriteAllText($outPath, $_, [System.Text.Encoding]::UTF8) }
        Write-Host "OK" -ForegroundColor Green
        $ok3++
    } catch {
        Write-Host "FAIL: $_" -ForegroundColor Red
        $fail3++
    }
    Start-Sleep -Milliseconds 200
}

Write-Host ""
Write-Host "=== Regenerando descargados.json ===" -ForegroundColor Cyan
try {
    $liga = Get-Content -Raw $calendarioPath -Encoding UTF8 | ConvertFrom-Json
    $idx = @()
    Get-ChildItem "$partidosDir" -Name | ForEach-Object {
        $id = [int]$_.Replace(".json","")
        $m = $liga.data | Where-Object { $_.id -eq $id } | Select-Object -First 1
        if (-not $m) { return }
        $c = Get-Content -Raw "$partidosDir\$_" -Encoding UTF8 | ConvertFrom-Json
        $props = $c.PSObject.Properties.Name
        $j = [int]($m.round -replace 'Regular Season - ')
        [PSCustomObject]@{
            id = $id
            jornada = $j
            home = $m.homeTeam.name
            away = $m.awayTeam.name
            date = $m.date
            score = $m.state.score.current
            detail = ($props -contains 'venue')
            lineups = ($null -ne $c.lineups)
            boxscore = ($null -ne $c.boxScore)
        }
    } | Sort-Object jornada, date | ConvertTo-Json -Depth 5 | ForEach-Object { [System.IO.File]::WriteAllText($descargadosPath, $_, [System.Text.Encoding]::UTF8) }
    Write-Host "descargados.json regenerado" -ForegroundColor Green
} catch {
    Write-Host "AVISO: No se pudo regenerar: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== RESUMEN ===" -ForegroundColor Cyan
Write-Host "Detalle:  OK=$ok  Fail=$fail"
Write-Host "Lineups:  OK=$ok2  Fail=$fail2"
Write-Host "BoxScore: OK=$ok3  Fail=$fail3"
Write-Host "Total llamadas: $($ok+$fail+$ok2+$fail2+$ok3+$fail3)"
