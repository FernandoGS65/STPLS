param(
    [int]$StartIndex = 0,
    [int]$BatchSize = 20,
    [string]$ConfigPath = "config.json"
)

if (-not (Test-Path $ConfigPath)) {
    Write-Host "ERROR: No existe config.json. Copia config.example.json a config.json y pon tu API key." -ForegroundColor Red
    exit 1
}

$config = Get-Content -Raw $ConfigPath | ConvertFrom-Json
$apiKey = $config.apiKey
$baseUrl = $config.baseUrl

if ($apiKey -eq "TU_API_KEY_AQUI") {
    Write-Host "ERROR: Edita config.json con tu API key real." -ForegroundColor Red
    exit 1
}

$headers = @{ "x-rapidapi-key" = $apiKey }
$liga = Get-Content -Raw "data\laliga2025.json" | ConvertFrom-Json
$matches = $liga.data | Sort-Object round, date
$total = $matches.Count
$endIndex = [Math]::Min($StartIndex + $BatchSize, $total)

Write-Host "=== Fetching match details ($StartIndex a $( $endIndex - 1 )) ===" -ForegroundColor Cyan
Write-Host "Limite diario: 100 calls | Este lote: $( $BatchSize ) calls" -ForegroundColor Yellow
Write-Host ""

$ok = 0; $skip = 0; $fail = 0

for ($i = $StartIndex; $i -lt $endIndex; $i++) {
    $m = $matches[$i]
    $matchId = $m.id
    $outPath = "data/partidos/$matchId.json"

    if (Test-Path $outPath) {
        Write-Host "[$i/$total] $matchId ya existe, saltando" -ForegroundColor DarkGray
        $skip++
        continue
    }

    $label = "$( $m.homeTeam.name ) vs $( $m.awayTeam.name ) ($( $m.round ))"

    try {
        Write-Host "[$i/$total] $label... " -NoNewline
        $resp = Invoke-RestMethod -Uri "$baseUrl/matches/$matchId" -Headers $headers -Method Get
        $resp | ConvertTo-Json -Depth 10 -Compress | Set-Content $outPath -Encoding UTF8
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
    Write-Host "  .\fetch-partidos.ps1 -StartIndex $endIndex -BatchSize $BatchSize"
}
else {
    Write-Host "¡Todos los partidos completados!" -ForegroundColor Green
}
