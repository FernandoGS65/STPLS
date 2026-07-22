param(
    [string]$Season = "2025-26",
    [string]$Competition = "liga"
)

$ErrorActionPreference = "SilentlyContinue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$baseDir = "data/$Season/$Competition"
$partidosDir = "$baseDir\partidos"
$plantillaPath = "$baseDir\plantilla.json"
$outputPath = "$baseDir\estadisticas-jugadores.json"

$plantilla = Get-Content $plantillaPath -Raw -Encoding UTF8 | ConvertFrom-Json

$totalJornadas = 38
$files = Get-ChildItem "$partidosDir\*.json"
$jornadasDescargadas = @{}
foreach ($m in $files) {
    $d = Get-Content $m.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($d.round -match 'Regular Season - (\d+)') {
        $jNum = [int]$Matches[1]
        if (-not $jornadasDescargadas.ContainsKey($jNum)) {
            $jornadasDescargadas[$jNum] = $true
        }
    }
}
$numJornadas = $jornadasDescargadas.Keys.Count
$minPartidos = [math]::Ceiling($numJornadas * 0.20)
Write-Host "Jornadas: $numJornadas | Min partidos (20%): $minPartidos"

# --- Build name->plantilla lookup ---
$nameLookup = @{}
foreach ($team in $plantilla.PSObject.Properties) {
    foreach ($p in $team.Value.players) {
        $nameLookup[$p.name] = @{ team = $team.Name; fotMobId = $p.fotMobId }
    }
}

# --- Collect data from events + boxScore ---
$playerAssists = @{}
$playerGoals = @{}
$playerStarts = @{}
$playerMinutes = @{}
$playerYellows = @{}
$playerReds = @{}
$playerSubbedOff = @{}
$playerSubbedOn = @{}
$playerPasses = @{}
$playerTackles = @{}
$playerFouls = @{}
$playerPenScored = @{}
$playerPenTotal = @{}

foreach ($f in $files) {
    $d = Get-Content $f.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($d.events) {
        foreach ($ev in $d.events) {
            if ($ev.type -eq "Goal" -and $ev.assist -and $ev.assist -ne "") {
                $aName = $ev.assist
                if (-not $playerAssists.ContainsKey($aName)) { $playerAssists[$aName] = 0 }
                $playerAssists[$aName]++
            }
            if ($ev.type -eq "Goal" -and $ev.player -and $ev.player -ne "") {
                $gName = $ev.player
                if (-not $playerGoals.ContainsKey($gName)) { $playerGoals[$gName] = 0 }
                $playerGoals[$gName]++
            }
            if ($ev.type -eq "Yellow Card" -and $ev.player -and $ev.player -ne "") {
                $yName = $ev.player
                if (-not $playerYellows.ContainsKey($yName)) { $playerYellows[$yName] = 0 }
                $playerYellows[$yName]++
            }
            if ($ev.type -eq "Red Card" -and $ev.player -and $ev.player -ne "") {
                $rName = $ev.player
                if (-not $playerReds.ContainsKey($rName)) { $playerReds[$rName] = 0 }
                $playerReds[$rName]++
            }
            if ($ev.type -eq "Substitution" -and $ev.player -and $ev.player -ne "") {
                $offName = $ev.player
                if (-not $playerSubbedOff.ContainsKey($offName)) { $playerSubbedOff[$offName] = 0 }
                $playerSubbedOff[$offName]++
            }
            if ($ev.type -eq "Substitution" -and $ev.substituted -and $ev.substituted -ne "") {
                $onName = $ev.substituted
                if (-not $playerSubbedOn.ContainsKey($onName)) { $playerSubbedOn[$onName] = 0 }
                $playerSubbedOn[$onName]++
            }
        }
    }
    if ($d.boxScore -and $d.boxScore.value) {
        foreach ($team in $d.boxScore.value) {
            foreach ($p in $team.players) {
                if ($p.position -eq "Goalkeeper") { continue }
                if (-not $p.minutesPlayed -or $p.minutesPlayed -lt 1) { continue }
                $pName = $p.name
                if (-not $playerStarts.ContainsKey($pName)) { $playerStarts[$pName] = 0 }
                if (-not $playerMinutes.ContainsKey($pName)) { $playerMinutes[$pName] = 0 }
                if (-not $playerPasses.ContainsKey($pName)) { $playerPasses[$pName] = 0 }
                if (-not $playerTackles.ContainsKey($pName)) { $playerTackles[$pName] = 0 }
                if (-not $playerFouls.ContainsKey($pName)) { $playerFouls[$pName] = 0 }
                if (-not $playerPenScored.ContainsKey($pName)) { $playerPenScored[$pName] = 0 }
                if (-not $playerPenTotal.ContainsKey($pName)) { $playerPenTotal[$pName] = 0 }
                if (-not $p.isSubstitute) { $playerStarts[$pName]++ }
                $playerMinutes[$pName] += [int]$p.minutesPlayed
                $playerPasses[$pName] += [int]$p.statistics.passesSuccessful
                $playerTackles[$pName] += [int]$p.statistics.tacklesTotal
                $playerFouls[$pName] += [int]$p.statistics.fouledOthers
                $playerPenScored[$pName] += [int]$p.statistics.penaltiesScored
                $playerPenTotal[$pName] += [int]$p.statistics.penaltiesTotal
            }
        }
    }
}

# --- Build all outfield players ---
$allOutfield = @()
foreach ($team in $plantilla.PSObject.Properties) {
    foreach ($p in $team.Value.players) {
        if ($p.position -eq "Goalkeeper") { continue }
        $name = $p.name
        $goals = 0
        if ($playerGoals.ContainsKey($name)) { $goals = $playerGoals[$name] }
        elseif ($p.goals -and $p.goals -gt 0) { $goals = [int]$p.goals }
        $assists = 0
        if ($playerAssists.ContainsKey($name)) { $assists = $playerAssists[$name] }
        $starts = 0
        if ($playerStarts.ContainsKey($name)) { $starts = $playerStarts[$name] }
        $minutes = 0
        if ($playerMinutes.ContainsKey($name)) { $minutes = $playerMinutes[$name] }
        $yellows = 0
        if ($playerYellows.ContainsKey($name)) { $yellows = $playerYellows[$name] }
        elseif ($p.yellowCards -and $p.yellowCards -gt 0) { $yellows = [int]$p.yellowCards }
        $reds = 0
        if ($playerReds.ContainsKey($name)) { $reds = $playerReds[$name] }
        elseif ($p.redCards -and $p.redCards -gt 0) { $reds = [int]$p.redCards }
        $subbedOff = 0
        if ($playerSubbedOff.ContainsKey($name)) { $subbedOff = $playerSubbedOff[$name] }
        $subbedOn = 0
        if ($playerSubbedOn.ContainsKey($name)) { $subbedOn = $playerSubbedOn[$name] }
        $passes = 0
        if ($playerPasses.ContainsKey($name)) { $passes = $playerPasses[$name] }
        $tackles = 0
        if ($playerTackles.ContainsKey($name)) { $tackles = $playerTackles[$name] }
        $fouls = 0
        if ($playerFouls.ContainsKey($name)) { $fouls = $playerFouls[$name] }
        $penScored = 0
        if ($playerPenScored.ContainsKey($name)) { $penScored = $playerPenScored[$name] }
        $penTotal = 0
        if ($playerPenTotal.ContainsKey($name)) { $penTotal = $playerPenTotal[$name] }
        $apps = [int]$p.appearances
        if ($apps -lt $minPartidos) { continue }
        $allOutfield += @{
            name = $name
            team = $team.Name
            fotMobId = [int]$p.fotMobId
            appearances = $apps
            goals = $goals
            assists = $assists
            starts = $starts
            minutes = $minutes
            yellowCards = $yellows
            redCards = $reds
            subbedOff = $subbedOff
            subbedOn = $subbedOn
            passes = $passes
            tackles = $tackles
            fouls = $fouls
            penScored = $penScored
            penTotal = $penTotal
            avgRating = if ($p.avgRating) { [math]::Round([double]$p.avgRating / 100, 2) } else { 0 }
            position = $p.position
        }
    }
}

# --- Top scorers ---
$goleadoresAll = @($allOutfield | Where-Object { $_.goals -gt 0 } | Sort-Object { [int]$_.goals } -Descending)
$goleadores = @($goleadoresAll | Select-Object -First 5)
$goleadores15 = @($goleadoresAll | Select-Object -First 15)

# --- Top assists ---
$asistenciasAll = @($allOutfield | Where-Object { $_.assists -gt 0 } | Sort-Object { [int]$_.assists } -Descending)
$asistencias = @($asistenciasAll | Select-Object -First 5)
$asistencias15 = @($asistenciasAll | Select-Object -First 15)

# --- Top passes ---
$pasesAll = @($allOutfield | Where-Object { $_.passes -gt 0 } | Sort-Object { [int]$_.passes } -Descending)
$pases = @($pasesAll | Select-Object -First 5)
$pases15 = @($pasesAll | Select-Object -First 15)

# --- Top tackles ---
$cortesAll = @($allOutfield | Where-Object { $_.tackles -gt 0 } | Sort-Object { [int]$_.tackles } -Descending)
$cortes = @($cortesAll | Select-Object -First 5)
$cortes15 = @($cortesAll | Select-Object -First 15)

# --- Top penalties ---
$penalesAll = @($allOutfield | Where-Object { $_.penTotal -gt 0 } | Sort-Object { [int]$_.penScored } -Descending)
$penales = @($penalesAll | Select-Object -First 5)
$penales15 = @($penalesAll | Select-Object -First 15)

# --- Top starters ---
$titularesAll = @($allOutfield | Where-Object { $_.starts -gt 0 } | Sort-Object { [int]$_.starts } -Descending)
$titulares = @($titularesAll | Select-Object -First 5)
$titulares15 = @($titularesAll | Select-Object -First 15)

# --- Top subbed off ---
$sustituidosAll = @($allOutfield | Where-Object { $_.subbedOff -gt 0 } | Sort-Object { [int]$_.subbedOff } -Descending)
$sustituidos = @($sustituidosAll | Select-Object -First 5)
$sustituidos15 = @($sustituidosAll | Select-Object -First 15)

# --- Top subbed on ---
$suplentesAll = @($allOutfield | Where-Object { $_.subbedOn -gt 0 } | Sort-Object { [int]$_.subbedOn } -Descending)
$suplentes = @($suplentesAll | Select-Object -First 5)
$suplentes15 = @($suplentesAll | Select-Object -First 15)

# --- Top minutes ---
$minuterosAll = @($allOutfield | Where-Object { $_.minutes -gt 0 } | Sort-Object { [int]$_.minutes } -Descending)
$minuteros = @($minuterosAll | Select-Object -First 5)
$minuteros15 = @($minuterosAll | Select-Object -First 15)

# --- Top fouls ---
$faltasAll = @($allOutfield | Where-Object { $_.fouls -gt 0 } | Sort-Object { [int]$_.fouls } -Descending)
$faltas = @($faltasAll | Select-Object -First 5)
$faltas15 = @($faltasAll | Select-Object -First 15)

# --- Top yellows ---
$amarillasAll = @($allOutfield | Where-Object { $_.yellowCards -gt 0 } | Sort-Object { [int]$_.yellowCards } -Descending)
$amarillas = @($amarillasAll | Select-Object -First 5)
$amarillas15 = @($amarillasAll | Select-Object -First 15)
Write-Host "`nAmarillas TOP 5:"
foreach ($a in $amarillas) { Write-Host "  $($a.name) ($($a.team)): $($a.yellowCards)" }

# --- Top reds ---
$rojasAll = @($allOutfield | Where-Object { $_.redCards -gt 0 } | Sort-Object { [int]$_.redCards } -Descending)
$rojas = @($rojasAll | Select-Object -First 5)
$rojas15 = @($rojasAll | Select-Object -First 15)

# --- GK stats from boxScore ---
$gkStats = @{}

foreach ($f in $files) {
    $d = Get-Content $f.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
    if (-not $d.boxScore -or -not $d.boxScore.value) { continue }
    $teamIds = @()
    $teamData = @{}
    $gkPlayed = @{}
    foreach ($team in $d.boxScore.value) {
        $teamId = $team.team.id
        $teamIds += $teamId
        $teamData[$teamId] = @{ penScored = 0; penTotal = 0 }
        foreach ($p in $team.players) {
            if ($p.position -eq "Goalkeeper") {
                $name = $p.name
                $played = ($p.minutesPlayed -and [int]$p.minutesPlayed -gt 0)
                if ($played) {
                    $gkPlayed[$name] = $true
                    if (-not $gkStats.ContainsKey($name)) {
                        $gkStats[$name] = @{ gc = 0; matches = 0; ratings = @(); cleanSheets = 0; saves = 0; penSaved = 0; penFaced = 0; teamId = $teamId }
                    }
                    $gkStats[$name].gc += [int]$p.statistics.goalsConceded
                    $gkStats[$name].matches++
                    if ([int]$p.statistics.goalsConceded -eq 0) { $gkStats[$name].cleanSheets++ }
                    $gkStats[$name].saves += [int]$p.statistics.goalsSaved
                    if ($p.matchRating -and [double]$p.matchRating -gt 0) {
                        $gkStats[$name].ratings += [double]$p.matchRating
                    }
                }
            } else {
                if ($p.minutesPlayed -and [int]$p.minutesPlayed -gt 0) {
                    $teamData[$teamId].penScored += [int]$p.statistics.penaltiesScored
                    $teamData[$teamId].penTotal += [int]$p.statistics.penaltiesTotal
                }
            }
        }
    }
    # GK penalties faced = opposing team's penalties taken, only if GK played
    if ($teamIds.Count -eq 2) {
        foreach ($name in $gkPlayed.Keys) {
            $gkTeamId = $gkStats[$name].teamId
            foreach ($oppId in $teamIds) {
                if ($oppId -ne $gkTeamId -and $teamData.ContainsKey($oppId)) {
                    $gkStats[$name].penFaced += $teamData[$oppId].penTotal
                    $gkStats[$name].penSaved += ($teamData[$oppId].penTotal - $teamData[$oppId].penScored)
                }
            }
        }
    }
}

$porterosAll = @()
$ceroPorteriasAll = @()
$paradasAll = @()
$penParadasAll = @()
foreach ($name in $gkStats.Keys) {
    $s = $gkStats[$name]
    if ($s.matches -lt $minPartidos) { continue }
    $avgGC = [math]::Round($s.gc / $s.matches, 2)
    $avgR = 0
    if ($s.ratings.Count -gt 0) {
        $avgR = [math]::Round(($s.ratings | Measure-Object -Average).Average, 2)
    }
    $info = $nameLookup[$name]
    $gkObj = @{
        name = $name
        team = if ($info) { $info.team } else { "" }
        fotMobId = if ($info) { [int]$info.fotMobId } else { 0 }
        goalsConceded = $s.gc
        matches = $s.matches
        avgGoalsPerMatch = $avgGC
        avgRating = $avgR
        cleanSheets = $s.cleanSheets
        saves = $s.saves
        penSaved = $s.penSaved
        penFaced = $s.penFaced
    }
    $porterosAll += $gkObj
    $ceroPorteriasAll += $gkObj
    $paradasAll += $gkObj
    $penParadasAll += $gkObj
}
$porteros = @($porterosAll | Sort-Object { [double]$_.avgGoalsPerMatch } | Select-Object -First 5)
$porteros15 = @($porterosAll | Sort-Object { [double]$_.avgGoalsPerMatch } | Select-Object -First 15)
$ceroPorterias = @($ceroPorteriasAll | Sort-Object { [int]$_.cleanSheets } -Descending | Select-Object -First 5)
$ceroPorterias15 = @($ceroPorteriasAll | Sort-Object { [int]$_.cleanSheets } -Descending | Select-Object -First 15)
$paradas = @($paradasAll | Sort-Object { [int]$_.saves } -Descending | Select-Object -First 5)
$paradas15 = @($paradasAll | Sort-Object { [int]$_.saves } -Descending | Select-Object -First 15)
$penParadas = @($penParadasAll | Where-Object { $_.penFaced -gt 0 } | Sort-Object { [int]$_.penSaved } -Descending | Select-Object -First 5)
$penParadas15 = @($penParadasAll | Where-Object { $_.penFaced -gt 0 } | Sort-Object { [int]$_.penSaved } -Descending | Select-Object -First 15)

# --- Valoración ---
$valoradosAll = @($allOutfield | Where-Object { $_.avgRating -gt 0 } | Sort-Object { [double]$_.avgRating } -Descending)
$valorados = @($valoradosAll | Select-Object -First 5)
$valorados15 = @($valoradosAll | Select-Object -First 15)

# --- Output ---
$output = @{
    goleadores = $goleadores
    goleadores15 = $goleadores15
    asistencias = $asistencias
    asistencias15 = $asistencias15
    pases = $pases
    pases15 = $pases15
    cortes = $cortes
    cortes15 = $cortes15
    penales = $penales
    penales15 = $penales15
    titulares = $titulares
    titulares15 = $titulares15
    sustituidos = $sustituidos
    sustituidos15 = $sustituidos15
    suplentes = $suplentes
    suplentes15 = $suplentes15
    minuteros = $minuteros
    minuteros15 = $minuteros15
    faltas = $faltas
    faltas15 = $faltas15
    amarillas = $amarillas
    amarillas15 = $amarillas15
    rojas = $rojas
    rojas15 = $rojas15
    porteros = $porteros
    porteros15 = $porteros15
    ceroPorterias = $ceroPorterias
    ceroPorterias15 = $ceroPorterias15
    paradas = $paradas
    paradas15 = $paradas15
    penParadas = $penParadas
    penParadas15 = $penParadas15
    valoracion = $valorados
    valoracion15 = $valorados15
    meta = @{
        jornadasDescargadas = $numJornadas
        minPartidos = $minPartidos
        totalJornadas = $totalJornadas
    }
}
$output | ConvertTo-Json -Depth 5 | Set-Content $outputPath -Encoding UTF8
Write-Host "`nOK: $outputPath"
