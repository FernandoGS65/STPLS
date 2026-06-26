param(
    [string]$Season = "2025-26",
    [string]$Competition = "liga"
)

$root = $PSScriptRoot
$dataDir = Join-Path $root "data/$Season/$Competition"
$plantillaPath = Join-Path $dataDir "plantilla.json"
$partidosDir = Join-Path $dataDir "partidos"

if (-not (Test-Path $plantillaPath)) {
    Write-Host "ERROR: No existe $plantillaPath" -ForegroundColor Red
    exit 1
}

Write-Host "Cargando plantilla..." -ForegroundColor Cyan
$plantilla = Get-Content -Raw $plantillaPath -Encoding UTF8 | ConvertFrom-Json

$playerStats = @{}

foreach ($teamName in $plantilla.PSObject.Properties.Name) {
    $team = $plantilla.$teamName
    if (-not $team.players) { continue }
    foreach ($player in $team.players) {
        $playerStats[[string]$player.id] = @{
            appearances = 0
            starts = 0
            subs = 0
            goals = 0
            yellowCards = 0
            redCards = 0
            totalRating = 0.0
            ratingCount = 0
            teamName = $teamName
        }
    }
}

$matchFiles = Get-ChildItem -Path $partidosDir -Filter "*.json" -ErrorAction SilentlyContinue
Write-Host "Procesando $($matchFiles.Count) partidos..." -ForegroundColor Cyan

$processed = 0
$withBoxScore = 0

foreach ($file in $matchFiles) {
    try {
        $match = Get-Content -Raw $file.FullName -Encoding UTF8 | ConvertFrom-Json
        $processed++

        $lineupById = @{}
        if ($match.lineups) {
            foreach ($side in @($match.lineups.homeTeam, $match.lineups.awayTeam)) {
                if (-not $side) { continue }
                if ($side.initialLineup) {
                    foreach ($row in $side.initialLineup) {
                        if ($row -is [System.Array]) {
                            foreach ($player in $row) {
                                $playerId = [string]$player.id
                                if ($playerId -and -not $lineupById.ContainsKey($playerId)) {
                                    $lineupById[$playerId] = "starter"
                                }
                            }
                        } elseif ($row.id) {
                            $playerId = [string]$row.id
                            if ($playerId -and -not $lineupById.ContainsKey($playerId)) {
                                $lineupById[$playerId] = "starter"
                            }
                        }
                    }
                }
                if ($side.substitutes) {
                    foreach ($player in $side.substitutes) {
                        $playerId = [string]$player.id
                        if ($playerId -and -not $lineupById.ContainsKey($playerId)) {
                            $lineupById[$playerId] = "sub"
                        }
                    }
                }
            }
        }

        if (-not $match.boxScore -or -not $match.boxScore.value) { continue }
        $withBoxScore++

        foreach ($teamEntry in $match.boxScore.value) {
            if (-not $teamEntry.players) { continue }
            foreach ($player in $teamEntry.players) {
                $playerId = [string]$player.id
                if (-not $playerId -or -not $playerStats.ContainsKey($playerId)) { continue }

                $stats = $playerStats[$playerId]
                $stats.appearances++

                if ($lineupById.ContainsKey($playerId)) {
                    if ($lineupById[$playerId] -eq "starter") {
                        $stats.starts++
                    } else {
                        $stats.subs++
                    }
                } elseif (-not $player.isSubstitute) {
                    $stats.starts++
                } else {
                    $stats.subs++
                }

                if ($player.statistics) {
                    $s = $player.statistics
                    $stats.goals += [int]$s.goalsScored
                    $stats.yellowCards += [int]$s.cardsYellow
                    $stats.redCards += [int]$s.cardsRed
                }

                if ($player.matchRating) {
                    $rating = 0.0
                    if ([double]::TryParse([string]$player.matchRating, [ref]$rating)) {
                        if ($rating -gt 0) {
                            $stats.totalRating += $rating
                            $stats.ratingCount++
                        }
                    }
                }
            }
        }
    } catch {
        Write-Host "  Error en $($file.Name): $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Partidos procesados: $processed (con boxScore: $withBoxScore)" -ForegroundColor Cyan
Write-Host ""

$updated = 0
$notFound = 0

foreach ($teamName in $plantilla.PSObject.Properties.Name) {
    $team = $plantilla.$teamName
    if (-not $team.players) { continue }

    foreach ($player in $team.players) {
        $playerId = [string]$player.id
        if (-not $playerStats.ContainsKey($playerId)) { continue }

        $s = $playerStats[$playerId]
        if ($s.appearances -eq 0) { $notFound++; continue }

        $player.appearances = $s.appearances
        $player.starts = $s.starts
        $player.subs = $s.subs
        $player | Add-Member -MemberType NoteProperty -Name "goals" -Value $s.goals -Force
        $player | Add-Member -MemberType NoteProperty -Name "yellowCards" -Value $s.yellowCards -Force
        $player | Add-Member -MemberType NoteProperty -Name "redCards" -Value $s.redCards -Force

        if ($s.ratingCount -gt 0) {
            $avg = [math]::Round($s.totalRating / $s.ratingCount, 2)
            $player | Add-Member -MemberType NoteProperty -Name "avgRating" -Value $avg -Force
        }

        $updated++
    }
}

$jsonOut = $plantilla | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($plantillaPath, $jsonOut, [System.Text.Encoding]::UTF8)

Write-Host "Jugadores actualizados: $updated" -ForegroundColor Green
Write-Host "Sin partidos encontrados: $notFound" -ForegroundColor Yellow
Write-Host "Plantilla guardada en $plantillaPath" -ForegroundColor Cyan
