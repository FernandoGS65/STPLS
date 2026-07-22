<#
.SYNOPSIS
    Fetches full squad data from FotMob for all 20 Premier League teams
    and builds data/2026-27/premier/plantilla.json with player info.
#>
param(
    [int]$DelayMs = 1500,
    [string]$Season = "2026-27",
    [string]$Competition = "premier"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$teamMap = @{
    "Arsenal"          = 9825
    "Aston Villa"      = 10252
    "Bournemouth"      = 8678
    "Brentford"        = 9937
    "Brighton"         = 10204
    "Chelsea"          = 8455
    "Coventry"         = 8669
    "Crystal Palace"   = 9826
    "Everton"          = 8668
    "Fulham"           = 9879
    "Hull City"        = 8667
    "Ipswich"          = 9902
    "Leeds"            = 8463
    "Liverpool"        = 8650
    "Manchester City"  = 8456
    "Manchester United"= 10260
    "Newcastle United" = 10261
    "Nottingham Forest"= 10203
    "Sunderland"       = 8472
    "Tottenham"        = 8586
}

$positionMap = @{
    "keeper_long"     = "Goalkeeper"
    "defender_long"   = "Defender"
    "midfielder_long" = "Midfielder"
    "attacker_long"   = "Forward"
}

function Remove-Accents([string]$s) {
    if (-not $s) { return '' }
    $norm = $s.Normalize([System.Text.NormalizationForm]::FormD)
    $sb = New-Object System.Text.StringBuilder
    for ($i = 0; $i -lt $norm.Length; $i++) {
        $c = $norm[$i]
        if ([System.Globalization.CharUnicodeInfo]::GetUnicodeCategory($c) -ne [System.Globalization.UnicodeCategory]::NonSpacingMark) {
            $null = $sb.Append($c)
        }
    }
    return ($sb.ToString()).ToLower().Trim()
}

Write-Host "Fetching FotMob squad data for $($teamMap.Count) Premier League teams..." -ForegroundColor Cyan

$plantillaPath = Join-Path $PSScriptRoot "data\$Season\$Competition\plantilla.json"
if (Test-Path $plantillaPath) {
    $rawJson = [System.IO.File]::ReadAllText($plantillaPath, [System.Text.Encoding]::UTF8)
    $plantilla = $rawJson | ConvertFrom-Json
    Write-Host "Loaded existing plantilla.json" -ForegroundColor Gray
} else {
    Write-Host "ERROR: plantilla.json not found at $plantillaPath" -ForegroundColor Red
    exit 1
}

$idx = 0
$totalPlayers = 0

foreach ($teamName in ($teamMap.Keys | Sort-Object)) {
    $fotmobTeamId = $teamMap[$teamName]
    $idx++
    Write-Host "[$idx/$($teamMap.Count)] $teamName (FotMob: $fotmobTeamId)..." -ForegroundColor Yellow -NoNewline

    try {
        $resp = Invoke-WebRequest -Uri "https://www.fotmob.com/teams/$fotmobTeamId/squad" -UseBasicParsing -TimeoutSec 30
        $stream = $resp.RawContentStream
        $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::UTF8)
        $html = $reader.ReadToEnd()
        $reader.Close()

        $ndMatch = [regex]::Match($html, '<script id="__NEXT_DATA__" type="application/json">(.+?)</script>')
        if (-not $ndMatch.Success) { Write-Host " NO DATA" -ForegroundColor Red; continue }

        $nd = $ndMatch.Groups[1].Value | ConvertFrom-Json
        $teamData = $nd.props.pageProps.fallback."team-$fotmobTeamId"
        if (-not $teamData.overview.squad) { Write-Host " NO SQUAD" -ForegroundColor Red; continue }

        $players = @()
        foreach ($group in $teamData.overview.squad) {
            foreach ($member in $group.members) {
                if ($member.role.key -eq "coach") { continue }

                $position = $positionMap[$member.role.key]
                if (-not $position) { $position = $member.role.fallback }

                $player = @{
                    fotMobId = [int]$member.id
                    name = $member.name
                    position = $position
                    number = if ($member.shirtNumber -ne $null) { [int]$member.shirtNumber } else { $null }
                    nationality = $member.cname
                    countryCode = $member.ccode
                    id = $null
                    appearances = 0
                    starts = 0
                    subs = 0
                    goals = 0
                    yellowCards = 0
                    redCards = 0
                    avgRating = $null
                }

                $players += [PSCustomObject]$player
            }
        }

        $teamProp = $plantilla.PSObject.Properties | Where-Object { $_.Name -eq $teamName }
        if ($teamProp) {
            $teamProp.Value.players = @($players | Sort-Object -Property name)
        } else {
            Write-Host " (SKIP - not in plantilla)" -ForegroundColor DarkGray
            continue
        }

        Write-Host " $($players.Count) players" -ForegroundColor Green
        $totalPlayers += $players.Count
    } catch {
        Write-Host " ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }

    if ($idx -lt $teamMap.Count) { Start-Sleep -Milliseconds $DelayMs }
}

$jsonOut = $plantilla | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($plantillaPath, $jsonOut, (New-Object System.Text.UTF8Encoding $false))

Write-Host ""
Write-Host "Done! $totalPlayers players across $($teamMap.Count) teams saved to plantilla.json" -ForegroundColor Green
