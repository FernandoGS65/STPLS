param(
    [string]$ApiKey = "",
    [string]$ConfigPath = "config.json",
    [string]$TeamIdsPath = "data/team-ids.json",
    [string]$OutputPath = "data/fichajes.json",
    [datetime]$From = "2026-05-01",
    [int]$DelayMs = 7000,
    [int]$MaxRetries = 3
)

$ErrorActionPreference = "Stop"

if (-not $ApiKey -or $ApiKey -eq "") {
    if (Test-Path $ConfigPath) {
        $config = Get-Content -Raw $ConfigPath -Encoding UTF8 | ConvertFrom-Json
        $ApiKey = $config.footballApiKey
    }
}

if (-not $ApiKey -or $ApiKey -eq "" -or $ApiKey -eq "TU_API_KEY_AQUI") {
    Write-Host "ERROR: API key no proporcionada." -ForegroundColor Red
    Write-Host "Usa: .\fetch-fichajes.ps1 -ApiKey 'TU_KEY'" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $TeamIdsPath)) {
    Write-Host "ERROR: No existe $TeamIdsPath" -ForegroundColor Red
    exit 1
}

$teamIds = Get-Content -Raw $TeamIdsPath -Encoding UTF8 | ConvertFrom-Json
$baseUrl = "https://v3.football.api-sports.io"
$headers = @{ "x-apisports-key" = $ApiKey }

Write-Host "=== Fetching fichajes desde $($From.ToString('yyyy-MM-dd')) ===" -ForegroundColor Cyan
Write-Host "Equipos: $($teamIds.PSObject.Properties.Name.Count) | Delay: ${DelayMs}ms | MaxRetries: $MaxRetries" -ForegroundColor Yellow
Write-Host ""

function Invoke-TransfersApi {
    param([int]$TeamId, [int]$Retries, [int]$Delay)
    for ($attempt = 1; $attempt -le $Retries; $attempt++) {
        try {
            $r = Invoke-RestMethod -Uri "$baseUrl/transfers?team=$TeamId" -Headers $headers -Method Get -ErrorAction Stop
            if ($r.errors -and $r.errors.rateLimit) {
                if ($attempt -lt $Retries) {
                    Write-Host "rate limit, esperando 65s... " -NoNewline -ForegroundColor Yellow
                    Start-Sleep -Seconds 65
                    continue
                }
                throw $r.errors.rateLimit
            }
            return $r
        } catch {
            if ($attempt -lt $Retries) {
                Write-Host "reintento $attempt/$Retries... " -NoNewline -ForegroundColor Yellow
                Start-Sleep -Seconds 65
                continue
            }
            throw
        }
    }
}

$result = [ordered]@{}
$ok = 0; $fail = 0; $totalTransfers = 0

$slugs = $teamIds.PSObject.Properties.Name | Sort-Object

foreach ($slug in $slugs) {
    $teamId = $teamIds.$slug

    Write-Host "[$slug] (ID $teamId)... " -NoNewline

    try {
        $resp = Invoke-TransfersApi -TeamId $teamId -Retries $MaxRetries -Delay $DelayMs
        Start-Sleep -Milliseconds $DelayMs

        $transfers = @()

        foreach ($entry in $resp.response) {
            $playerName = $entry.player.name

            foreach ($t in $entry.transfers) {
                $dateStr = $t.date
                if (-not $dateStr) { continue }

                try {
                    $date = [datetime]::Parse($dateStr)
                } catch { continue }

                if ($date -lt $From) { continue }

                $inTeamId = $t.teams.in.id
                $inTeamName = $t.teams.in.name
                $outTeamId = $t.teams.out.id
                $outTeamName = $t.teams.out.name

                if ($inTeamId -eq $teamId) {
                    $tipo = "llegada"
                    $club = $outTeamName
                } elseif ($outTeamId -eq $teamId) {
                    $tipo = "salida"
                    $club = $inTeamName
                } else { continue }

                $precio = $t.type
                if ($precio -eq "N/A" -or -not $precio) { $precio = "" }

                $transfers += [PSCustomObject]@{
                    jugador = $playerName
                    fecha = $dateStr
                    tipo = $tipo
                    club = $club
                    precio = $precio
                    posicion = ""
                    foto = ""
                }
            }
        }

        $transfers = @($transfers | Sort-Object { $_.fecha })
        $count = $transfers.Count
        $result[$slug] = $transfers
        $totalTransfers += $count
        Write-Host "$count transfers" -ForegroundColor Green
        $ok++
    }
    catch {
        Write-Host "FAIL: $_" -ForegroundColor Red
        $result[$slug] = @()
        $fail++
    }
}

Write-Host ""
Write-Host "=== Escribiendo $OutputPath ===" -ForegroundColor Cyan

$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine("{")
$keys = @($result.Keys)
for ($k = 0; $k -lt $keys.Count; $k++) {
    $key = $keys[$k]
    $arr = $result[$key]
    $comma = if ($k -lt $keys.Count - 1) { "," } else { "" }
    if ($arr.Count -eq 0) {
        [void]$sb.AppendLine("  `"$key`": []$comma")
    } else {
        [void]$sb.AppendLine("  `"$key`": [")
        for ($i = 0; $i -lt $arr.Count; $i++) {
            $item = $arr[$i]
            $itemComma = if ($i -lt $arr.Count - 1) { "," } else { "" }
            [void]$sb.AppendLine("    {`"jugador`": `"$($item.jugador)`", `"fecha`": `"$($item.fecha)`", `"tipo`": `"$($item.tipo)`", `"club`": `"$($item.club)`", `"precio`": `"$($item.precio)`", `"posicion`": `"$($item.posicion)`", `"foto`": `"$($item.foto)`"}$itemComma")
        }
        [void]$sb.AppendLine("  ]$comma")
    }
}
[void]$sb.AppendLine("}")
[System.IO.File]::WriteAllText($OutputPath, $sb.ToString(), [System.Text.Encoding]::UTF8)

Write-Host "OK: $ok | Fail: $fail | Total transfers: $totalTransfers" -ForegroundColor Green
Write-Host "Hecho!" -ForegroundColor Cyan
