param(
    [string]$Season = "2025-26",
    [string]$Comp = "liga"
)

$baseDir = "data\$Season\$comp"
$calendarioPath = "$baseDir\calendario.json"
$descargadosPath = "$baseDir\descargados.json"
$partidosDir = "$baseDir\partidos"
$outputPath = "$baseDir\estadisticas-equipo.json"

$calRaw = Get-Content -Raw $calendarioPath -Encoding UTF8 | ConvertFrom-Json
$calendario = if ($calRaw.data) { $calRaw.data } else { $calRaw }
$descargados = Get-Content -Raw $descargadosPath -Encoding UTF8 | ConvertFrom-Json

$teams = @{}

foreach ($match in $calendario) {
    $homeName = $match.homeTeam.name
    $awayName = $match.awayTeam.name
    if (-not $teams.ContainsKey($homeName)) { $teams[$homeName] = @{ name=$homeName; logo=$match.homeTeam.logo; played=0; won=0; drawn=0; lost=0; gf=0; ga=0; points=0; totalPossession=0; possGames=0; totalRating=0; ratingPlayers=0; cleanSheets=0; totalXG=0 } }
    if (-not $teams.ContainsKey($awayName)) { $teams[$awayName] = @{ name=$awayName; logo=$match.awayTeam.logo; played=0; won=0; drawn=0; lost=0; gf=0; ga=0; points=0; totalPossession=0; possGames=0; totalRating=0; ratingPlayers=0; cleanSheets=0; totalXG=0 } }

    $scoreStr = $match.state.score.current
    if ($scoreStr -and $scoreStr -match '^\d+\s*-\s*\d+$') {
        $parts = $scoreStr -split '\s*-\s*'
        $hg = [int]$parts[0]
        $ag = [int]$parts[1]

        $teams[$homeName].played++
        $teams[$awayName].played++
        $teams[$homeName].gf += $hg
        $teams[$homeName].ga += $ag
        $teams[$awayName].gf += $ag
        $teams[$awayName].ga += $hg

        if ($hg -gt $ag) {
            $teams[$homeName].won++; $teams[$homeName].points += 3
            $teams[$awayName].lost++
        } elseif ($hg -lt $ag) {
            $teams[$awayName].won++; $teams[$awayName].points += 3
            $teams[$homeName].lost++
        } else {
            $teams[$homeName].drawn++; $teams[$homeName].points++
            $teams[$awayName].drawn++; $teams[$awayName].points++
        }

        if ($ag -eq 0) { $teams[$homeName].cleanSheets++ }
        if ($hg -eq 0) { $teams[$awayName].cleanSheets++ }
    }
}

$descargadosIds = @()
if (Test-Path $descargadosPath) {
    $descargadosIds = $descargados | Where-Object { $_.boxscore -eq $true } | ForEach-Object { $_.id.ToString() }
}

foreach ($matchId in $descargadosIds) {
    $matchFile = "$partidosDir\$matchId.json"
    if (-not (Test-Path $matchFile)) { continue }

    $matchData = Get-Content -Raw $matchFile -Encoding UTF8 | ConvertFrom-Json
    $homeName = $matchData.homeTeam.name
    $awayName = $matchData.awayTeam.name

    if ($matchData.statistics) {
        foreach ($teamStat in $matchData.statistics) {
            $teamName = $teamStat.team.name
            if (-not $teamName -or -not $teams.ContainsKey($teamName)) { continue }

            $possStat = $teamStat.statistics | Where-Object { $_.displayName -eq "Possession" } | Select-Object -First 1
            if ($possStat -and $possStat.value) {
                $teams[$teamName].totalPossession += [double]$possStat.value
                $teams[$teamName].possGames++
            }

            $xgStat = $teamStat.statistics | Where-Object { $_.displayName -eq "Expected Goals" } | Select-Object -First 1
            if ($xgStat -and $xgStat.value) {
                $teams[$teamName].totalXG += [double]$xgStat.value
            }
        }
    }

    if ($matchData.boxScore -and $matchData.boxScore.value) {
        foreach ($boxTeam in $matchData.boxScore.value) {
            $teamName = $boxTeam.team.name
            if (-not $teamName -or -not $teams.ContainsKey($teamName)) { continue }

            foreach ($player in $boxTeam.players) {
                if ($player.minutesPlayed -gt 0 -and $player.matchRating) {
                    $rating = 0
                    if ([double]::TryParse($player.matchRating, [System.Globalization.NumberStyles]::Any, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$rating)) {
                        $teams[$teamName].totalRating += $rating
                        $teams[$teamName].ratingPlayers++
                    }
                }
            }
        }
    }
}

function Build-TeamObj($t) {
    $avgRating = if ($t.ratingPlayers -gt 0) { [math]::Round($t.totalRating / $t.ratingPlayers, 2) } else { 0 }
    $avgPoss = if ($t.possGames -gt 0) { [math]::Round($t.totalPossession / $t.possGames, 4) } else { 0 }
    $avgXG = if ($t.possGames -gt 0) { [math]::Round($t.totalXG / $t.possGames, 2) } else { 0 }
    return @{
        name = $t.name
        logo = $t.logo
        played = $t.played
        won = $t.won
        drawn = $t.drawn
        lost = $t.lost
        goalsFor = $t.gf
        goalsAgainst = $t.ga
        goalDifference = $t.gf - $t.ga
        points = $t.points
        avgRating = $avgRating
        cleanSheets = $t.cleanSheets
        avgPossession = $avgPoss
        avgXG = $avgXG
    }
}

$allTeams = $teams.Values | ForEach-Object { Build-TeamObj $_ }

$sortedRating = $allTeams | Where-Object { $_.played -gt 0 } | Sort-Object { - $_.avgRating }
$sortedClean = $allTeams | Where-Object { $_.played -gt 0 } | Sort-Object { - $_.cleanSheets }
$sortedPoss = $allTeams | Where-Object { $_.played -gt 0 } | Sort-Object { - $_.avgPossession }

$jornadasDescargadas = ($descargados | Where-Object { $_.boxscore -eq $true } | ForEach-Object { $_.jornada } | Sort-Object -Unique | Measure-Object).Count

$output = @{
    valoracion = $sortedRating | Select-Object -First 5
    valoracion15 = $sortedRating | Select-Object -First 15
    porteriasCero = $sortedClean | Select-Object -First 5
    porteriasCero15 = $sortedClean | Select-Object -First 15
    posesion = $sortedPoss | Select-Object -First 5
    posesion15 = $sortedPoss | Select-Object -First 15
    meta = @{
        jornadasDescargadas = [int]$jornadasDescargadas
        totalJornadas = 38
    }
}

$output | ConvertTo-Json -Depth 10 | Set-Content -Path $outputPath -Encoding UTF8
Write-Host "Estadisticas de equipo generadas: $outputPath"
Write-Host "Equipos: $($allTeams.Count) | Jornadas: $jornadasDescargadas"