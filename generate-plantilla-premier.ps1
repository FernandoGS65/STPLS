param(
    [string]$Season = "2026-27",
    [string]$Competition = "premier"
)

$ErrorActionPreference = "SilentlyContinue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$baseDir = "data/$Season/$Competition"
$partidosDir = "$baseDir/partidos"
$outputPath = "$baseDir/plantilla.json"

if (-not (Test-Path $partidosDir)) {
    Write-Host "ERROR: No existe $partidosDir" -ForegroundColor Red
    exit 1
}

Write-Host "=== Generando plantilla.json para $Season/$Competition ===" -ForegroundColor Cyan

$playerMap = @{}
$teamPlayers = @{}
$matchCount = 0

$files = Get-ChildItem "$partidosDir\*.json"
Write-Host "Procesando $($files.Count) partidos..." -ForegroundColor Yellow

foreach ($f in $files) {
    $match = Get-Content $f.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
    $matchCount++

    # Process boxscore first (most complete data)
    if ($match.boxScore -and $match.boxScore.value) {
        foreach ($teamBox in $match.boxScore.value) {
            $teamName = $teamBox.team.name
            if (-not $teamName) { continue }
            if (-not $teamPlayers.ContainsKey($teamName)) { $teamPlayers[$teamName] = @{} }

            foreach ($p in $teamBox.players) {
                $pid = $p.id
                if (-not $pid) { continue }
                if ($teamPlayers[$teamName].ContainsKey($pid)) {
                    $player = $teamPlayers[$teamName][$pid]
                    $player.appearances++
                    if ($p.isSubstitute -eq $false) { $player.starts++ } else { $player.subs++ }
                    if ($p.statistics) {
                        $s = $p.statistics
                        $player.goals += [int]($s.goalsScored -or 0)
                        $player.yellowCards += [int]($s.cardsYellow -or 0)
                        $player.redCards += [int]($s.cardsRed -or 0)
                    }
                    if ($p.matchRating) {
                        $rating = [double]($p.matchRating -replace '[^0-9.]', '')
                        if ($rating -gt 0) { $player.ratingSum += $rating; $player.ratingCount++ }
                    }
                } else {
                    $rating = 0; $ratingSum = 0; $ratingCount = 0
                    if ($p.matchRating) {
                        $r = [double]($p.matchRating -replace '[^0-9.]', '')
                        if ($r -gt 0) { $ratingSum = $r; $ratingCount = 1 }
                    }
                    $teamPlayers[$teamName][$pid] = @{
                        id = $pid
                        name = $p.name
                        position = $p.position
                        number = $p.shirtNumber
                        fotMobId = $null
                        nationality = ""
                        countryCode = ""
                        appearances = 1
                        starts = if ($p.isSubstitute -eq $false) { 1 } else { 0 }
                        subs = if ($p.isSubstitute -eq $true) { 1 } else { 0 }
                        goals = [int](($p.statistics.goalsScored -or 0))
                        yellowCards = [int](($p.statistics.cardsYellow -or 0))
                        redCards = [int](($p.statistics.cardsRed -or 0))
                        ratingSum = $ratingSum
                        ratingCount = $ratingCount
                    }
                }
            }
        }
    }

    # Also extract players from lineups (covers more players, less stats)
    if ($match.lineups) {
        foreach ($side in @('homeTeam', 'awayTeam')) {
            $lineupSide = $match.lineups.$side
            if (-not $lineupSide) { continue }
            $teamName = $lineupSide.name
            if (-not $teamName) { continue }
            if (-not $teamPlayers.ContainsKey($teamName)) { $teamPlayers[$teamName] = @{} }

            $allPlayers = @()
            if ($lineupSide.initialLineup) { $allPlayers += $lineupSide.initialLineup }
            if ($lineupSide.substitutes) { $allPlayers += $lineupSide.substitutes }

            foreach ($p in $allPlayers) {
                $pid = $p.id
                if (-not $pid) { continue }
                if (-not $teamPlayers[$teamName].ContainsKey($pid)) {
                    $teamPlayers[$teamName][$pid] = @{
                        id = $pid
                        name = $p.name
                        position = $p.position
                        number = $p.number
                        fotMobId = $null
                        nationality = ""
                        countryCode = ""
                        appearances = 0
                        starts = 0
                        subs = 0
                        goals = 0
                        yellowCards = 0
                        redCards = 0
                        ratingSum = 0
                        ratingCount = 0
                    }
                }
            }
        }
    }
}

Write-Host "Partidos procesados: $matchCount" -ForegroundColor Cyan
Write-Host "Equipos encontrados: $($teamPlayers.Keys.Count)" -ForegroundColor Cyan

$result = [ordered]@{}
foreach ($teamName in ($teamPlayers.Keys | Sort-Object)) {
    $players = @()
    foreach ($pid in ($teamPlayers[$teamName].Keys)) {
        $p = $teamPlayers[$teamName][$pid]
        $avgRating = if ($p.ratingCount -gt 0) { [math]::Round($p.ratingSum / $p.ratingCount * 100) } else { 0 }
        $players += @{
            id = $p.id
            name = $p.name
            position = $p.position
            number = $p.number
            fotMobId = $p.fotMobId
            nationality = $p.nationality
            countryCode = $p.countryCode
            appearances = $p.appearances
            starts = $p.starts
            subs = $p.subs
            goals = $p.goals
            yellowCards = $p.yellowCards
            redCards = $p.redCards
            avgRating = $avgRating
        }
    }
    $result[$teamName] = @{ players = ($players | Sort-Object -Property starts -Descending) }
}

$result | ConvertTo-Json -Depth 5 | ForEach-Object {
    [System.IO.File]::WriteAllText($outputPath, $_, [System.Text.Encoding]::UTF8)
}

Write-Host "Guardado: $outputPath" -ForegroundColor Green
Write-Host "Equipos: $($result.Keys.Count)" -ForegroundColor Cyan
$totalPlayers = 0; $result.Values | ForEach-Object { $totalPlayers += $_.players.Count }
Write-Host "Jugadores: $totalPlayers" -ForegroundColor Cyan
Write-Host "Hecho!" -ForegroundColor Cyan