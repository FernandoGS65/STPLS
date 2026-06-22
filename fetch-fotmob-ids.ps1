<#
.SYNOPSIS
    Fetches FotMob player IDs for all La Liga teams and updates plantilla.json.
#>
param(
    [int]$DelayMs = 1500
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$teamMap = @{
    "Barcelona"       = 8634
    "Real Madrid"     = 8633
    "Villarreal"      = 10205
    "Atletico Madrid" = 9906
    "Real Betis"      = 8603
    "Celta de Vigo"   = 9910
    "Getafe"          = 8305
    "Rayo Vallecano"  = 8370
    "Valencia"        = 10267
    "Real Sociedad"   = 8560
    "Espanyol"        = 8558
    "Athletic Club"   = 8315
    "Sevilla FC"      = 8302
    "Alaves"          = 9866
    "Elche"           = 10268
    "Levante"         = 8581
    "Osasuna"         = 8371
    "Mallorca"        = 8661
    "Girona"          = 7732
    "Oviedo"          = 8670
}

function Remove-Accents([string]$s) {
    $s = $s.ToLower()
    $s = $s.Replace([char]0x00E1,'a').Replace([char]0x00E9,'e').Replace([char]0x00ED,'i')
    $s = $s.Replace([char]0x00F3,'o').Replace([char]0x00FA,'u').Replace([char]0x00F1,'n')
    $s = $s.Replace([char]0x00FC,'u')
    $s = $s.Replace([char]0x00C1,'A').Replace([char]0x00C9,'E').Replace([char]0x00CD,'I')
    $s = $s.Replace([char]0x00D3,'O').Replace([char]0x00DA,'U').Replace([char]0x00D1,'N')
    return $s.Trim() -replace '\s+',' '
}

function Find-TeamKey([string]$name, [hashtable]$mapping) {
    $norm = Remove-Accents $name
    foreach ($key in $mapping.Keys) {
        if ((Remove-Accents $key) -eq $norm) { return $key }
    }
    return $null
}

Write-Host "Fetching FotMob player IDs for $($teamMap.Count) La Liga teams..." -ForegroundColor Cyan

$allMappings = @{}
$idx = 0

foreach ($teamName in ($teamMap.Keys | Sort-Object)) {
    $fotmobId = $teamMap[$teamName]
    $idx++
    Write-Host "[$idx/$($teamMap.Count)] $teamName ($fotmobId)..." -ForegroundColor Yellow -NoNewline

    try {
        $resp = Invoke-WebRequest -Uri "https://www.fotmob.com/teams/$fotmobId/squad" -UseBasicParsing -TimeoutSec 20
        $html = $resp.Content

        $ndMatch = [regex]::Match($html, '<script id="__NEXT_DATA__" type="application/json">(.+?)</script>')
        if (-not $ndMatch.Success) { Write-Host " NO DATA" -ForegroundColor Red; continue }

        $nd = $ndMatch.Groups[1].Value | ConvertFrom-Json
        $teamData = $nd.props.pageProps.fallback."team-$fotmobId"
        if (-not $teamData.overview.squad) { Write-Host " NO SQUAD" -ForegroundColor Red; continue }

        $players = [ordered]@{}
        foreach ($group in $teamData.overview.squad) {
            foreach ($p in $group.members) {
                if ($p.id -and $p.name) {
                    $norm = Remove-Accents $p.name
                    if (-not $players.Contains($norm)) {
                        $players[$norm] = [int]$p.id
                    }
                }
            }
        }

        $allMappings[$teamName] = $players
        Write-Host " $($players.Count) players" -ForegroundColor Green
    } catch {
        Write-Host " ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }

    if ($idx -lt $teamMap.Count) { Start-Sleep -Milliseconds $DelayMs }
}

Write-Host ""
Write-Host "Matching with plantilla.json..." -ForegroundColor Cyan

$plantillaPath = Join-Path $PSScriptRoot "data\2025-26\liga\plantilla.json"
$rawJson = [System.IO.File]::ReadAllText($plantillaPath, [System.Text.Encoding]::UTF8)
$plantilla = $rawJson | ConvertFrom-Json

$matched = 0
$total = 0
$unmatched = @()

foreach ($teamProp in $plantilla.PSObject.Properties) {
    $teamName = $teamProp.Name
    $teamPlayers = $teamProp.Value.players
    if (-not $teamPlayers) { continue }

    $mappedKey = Find-TeamKey $teamName $allMappings
    if (-not $mappedKey) {
        foreach ($p in $teamPlayers) { $total++; $unmatched += "$teamName > $($p.name) (no FotMob team)" }
        continue
    }

    $fmPlayers = $allMappings[$mappedKey]

    foreach ($player in $teamPlayers) {
        $total++
        $pname = $player.name.Trim()
        $normP = Remove-Accents $pname

        $fotmobId = $null

        # Exact match
        if ($fmPlayers.Contains($normP)) {
            $fotmobId = $fmPlayers[$normP]
        }

        # Last name match
        if (-not $fotmobId) {
            $lastName = ($normP -split '\s+')[-1]
            if ($lastName.Length -ge 3) {
                foreach ($key in $fmPlayers.Keys) {
                    $fmLast = ($key -split '\s+')[-1]
                    if ($fmLast -eq $lastName) { $fotmobId = $fmPlayers[$key]; break }
                }
            }
        }

        # Partial / contains match
        if (-not $fotmobId -and $normP.Length -ge 4) {
            foreach ($key in $fmPlayers.Keys) {
                if ($key.Contains($normP) -or $normP.Contains($key)) {
                    $fotmobId = $fmPlayers[$key]; break
                }
            }
        }

        if ($fotmobId) {
            $player | Add-Member -NotePropertyName "fotMobId" -NotePropertyValue $fotmobId -Force
            $matched++
        } else {
            $unmatched += "$teamName > $pname"
        }
    }
}

Write-Host ""
Write-Host "Matched: $matched / $total players" -ForegroundColor Green
if ($unmatched.Count -gt 0) {
    Write-Host "Unmatched: $($unmatched.Count) players:" -ForegroundColor Yellow
    foreach ($u in $unmatched) { Write-Host "  - $u" -ForegroundColor Gray }
}

$jsonOut = $plantilla | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($plantillaPath, $jsonOut, (New-Object System.Text.UTF8Encoding $false))
Write-Host ""
Write-Host "Saved plantilla.json with fotMobId fields" -ForegroundColor Green
