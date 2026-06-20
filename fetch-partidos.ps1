param(
    [int]$StartIndex = 0,
    [int]$BatchSize = 20,
    [string]$ConfigPath = "config.json",
    [ValidateSet("detail","lineups","boxscore")]
    [string]$Mode = "detail"
)

if (-not (Test-Path $ConfigPath)) {
    Write-Host "ERROR: No existe config.json. Copia config.example.json a config.json y pon tu API key." -ForegroundColor Red
    exit 1
}

$config = Get-Content -Raw $ConfigPath | ConvertFrom-Json
$headers = @{ "x-rapidapi-key" = $config.apiKey }
$baseUrl = $config.baseUrl

if ($config.apiKey -eq "TU_API_KEY_AQUI") {
    Write-Host "ERROR: Edita config.json con tu API key real." -ForegroundColor Red
    exit 1
}

$liga = Get-Content -Raw "data\laliga2025.json" | ConvertFrom-Json
$matches = $liga.data | Sort-Object round, date
$total = $matches.Count
$endIndex = [Math]::Min($StartIndex + $BatchSize, $total)

$modeLabel = @{ "detail" = "Detalle del partido"; "lineups" = "Alineaciones"; "boxscore" = "Box score" }
$endpoint = @{ "detail" = "matches/"; "lineups" = "lineups/"; "boxscore" = "box-score/" }

Write-Host "=== Fetching $( $modeLabel[$Mode] ) ($StartIndex a $( $endIndex - 1 )) ===" -ForegroundColor Cyan
Write-Host "Limite diario: 100 calls | Este lote: $( $BatchSize ) calls" -ForegroundColor Yellow
Write-Host ""

$ok = 0; $skip = 0; $fail = 0

for ($i = $StartIndex; $i -lt $endIndex; $i++) {
    $m = $matches[$i]
    $matchId = $m.id
    $outPath = "data/partidos/$matchId.json"

    if ($Mode -eq "detail" -and (Test-Path $outPath)) {
        Write-Host "[$i/$total] $matchId ya existe, saltando" -ForegroundColor DarkGray
        $skip++
        continue
    }

    $label = "$( $m.homeTeam.name ) vs $( $m.awayTeam.name ) ($( $m.round ))"

    try {
        Write-Host "[$i/$total] $label... " -NoNewline

        if ($Mode -eq "detail") {
            $resp = Invoke-RestMethod -Uri "$baseUrl/$($endpoint[$Mode])$matchId" -Headers $headers -Method Get
            $resp | ConvertTo-Json -Depth 10 -Compress | Set-Content $outPath -Encoding UTF8
        }
        else {
            $endpointUrl = "$baseUrl/$($endpoint[$Mode])$matchId"
            $adicional = Invoke-RestMethod -Uri $endpointUrl -Headers $headers -Method Get

            if (Test-Path $outPath) {
                $existente = Get-Content -Raw $outPath | ConvertFrom-Json
            } else {
                $existente = @{}
            }

            $campo = if ($Mode -eq "lineups") { "lineups" } else { "boxScore" }
            $existente | Add-Member -MemberType NoteProperty -Name $campo -Value $adicional -Force
            $existente | ConvertTo-Json -Depth 10 -Compress | Set-Content $outPath -Encoding UTF8
        }

        Write-Host "OK" -ForegroundColor Green
        $ok++
    }
    catch {
        Write-Host "FAIL: $_" -ForegroundColor Red
        $fail++
    }

    Start-Sleep -Milliseconds 200
}

Write-Host ""
Write-Host "=== Resumen ===" -ForegroundColor Cyan
Write-Host "OK: $ok | Skip: $skip | Fail: $fail"
Write-Host ""

if ($endIndex -lt $total) {
    Write-Host "Próximo lote:" -ForegroundColor Yellow
    Write-Host "  .\fetch-partidos.ps1 -StartIndex $endIndex -BatchSize $BatchSize -Mode $Mode"
}
else {
    Write-Host "¡Todos los partidos completados en modo $Mode!" -ForegroundColor Green
    if ($Mode -eq "detail") {
        Write-Host "`nSiguiente paso:" -ForegroundColor Yellow
        Write-Host "  .\fetch-partidos.ps1 -Mode lineups -StartIndex 0 -BatchSize 20"
        Write-Host "  .\fetch-partidos.ps1 -Mode boxscore -StartIndex 0 -BatchSize 20"
    }
}
