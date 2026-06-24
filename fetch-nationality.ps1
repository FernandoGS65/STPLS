param(
    [string]$Season = "2025-26",
    [string]$Competition = "liga"
)

$dataDir = "data/$Season/$Competition"
$plantillaPath = "$dataDir/plantilla.json"

if (-not (Test-Path $plantillaPath)) {
    Write-Host "ERROR: No existe $plantillaPath" -ForegroundColor Red
    exit 1
}

$plantilla = Get-Content -Raw $plantillaPath -Encoding UTF8 | ConvertFrom-Json
$delay = 600

$totalPlayers = 0
$fetched = 0
$skipped = 0
$failed = 0

function Save-Plantilla {
    param($data, $path)
    $jsonOut = $data | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText((Resolve-Path $path).Path, $jsonOut, [System.Text.Encoding]::UTF8)
}

foreach ($teamName in $plantilla.PSObject.Properties.Name) {
    $team = $plantilla.$teamName
    if (-not $team.players) { continue }

    Write-Host "`n=== $teamName ===" -ForegroundColor Cyan

    foreach ($player in $team.players) {
        if (-not $player.fotMobId) {
            $skipped++
            continue
        }

        if ($player.countryCode) {
            $skipped++
            continue
        }

        $totalPlayers++
        $slug = ($player.name.ToLower() -replace '[áàäâã]','a' -replace '[éèëê]','e' -replace '[íìïî]','i' -replace '[óòöôõ]','o' -replace '[úùüû]','u' -replace 'ñ','n' -replace '[^a-z0-9]','' -replace '\s+','-')
        $url = "https://www.fotmob.com/players/$($player.fotMobId)/$slug"
        Write-Host "  [$($player.name)] " -NoNewline

        try {
            $resp = Invoke-WebRequest -Uri $url -Headers @{"User-Agent"="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"} -UseBasicParsing -TimeoutSec 10
            $jsonMatch = [regex]::Match($resp.Content, '__NEXT_DATA__[^>]*>(.*?)</script>')

            if ($jsonMatch.Success) {
                $json = $jsonMatch.Groups[1].Value | ConvertFrom-Json
                $infoList = $json.props.pageProps.data.playerInformation
                $countryEntry = $infoList | Where-Object { $_.title -eq "Country" } | Select-Object -First 1

                if ($countryEntry) {
                    $nationality = $countryEntry.value.fallback
                    $cc = $countryEntry.countryCode
                    $player | Add-Member -MemberType NoteProperty -Name "nationality" -Value $nationality -Force
                    $player | Add-Member -MemberType NoteProperty -Name "countryCode" -Value $cc -Force
                    Write-Host "OK: $cc" -ForegroundColor Green
                    $fetched++
                } else {
                    Write-Host "SKIP: no country" -ForegroundColor Yellow
                    $failed++
                }
            } else {
                Write-Host "SKIP: no data" -ForegroundColor Yellow
                $failed++
            }
        } catch {
            Write-Host "FAIL" -ForegroundColor Red
            $failed++
        }

        Start-Sleep -Milliseconds $delay
    }

    Save-Plantilla $plantilla $plantillaPath
    Write-Host "  [Guardado $teamName]" -ForegroundColor DarkCyan
}

Write-Host "`n=== Resumen ===" -ForegroundColor Cyan
Write-Host "Nuevos: $fetched | Ya existían: $skipped | Fallidos: $failed"
