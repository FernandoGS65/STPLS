param(
    [string]$ConfigPath = "config.json",
    [int]$Limit = 100,
    [int]$LeagueId = 33973,
    [int]$Season = 2026
)

if (-not (Test-Path $ConfigPath)) {
    Write-Host "ERROR: No existe config.json" -ForegroundColor Red
    exit 1
}

$config = Get-Content -Raw $ConfigPath | ConvertFrom-Json
$baseUrl = $config.baseUrl

if ($config.apiKeys -and $config.apiKeys.Count -gt 0) {
    $apiKeys = @($config.apiKeys)
} elseif ($config.apiKey) {
    $apiKeys = @($config.apiKey)
} else {
    Write-Host "ERROR: No hay API keys." -ForegroundColor Red
    exit 1
}

$script:keyIndex = 0
function Get-NextHeader {
    $key = $apiKeys[$script:keyIndex % $apiKeys.Count]
    $script:keyIndex++
    return @{ "x-rapidapi-key" = $key }
}

$outDir = "data/2026-27/premier"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force }

$allMatches = @()
$offset = 0

Write-Host "=== Fetching calendario Premier League (2026-27) ===" -ForegroundColor Cyan
Write-Host "LeagueId: $LeagueId, Season: $Season" -ForegroundColor Yellow

do {
    $url = "$baseUrl/matches?leagueId=$LeagueId&season=$Season&limit=$Limit&offset=$offset"
    Write-Host "  offset=$offset..." -NoNewline

    try {
        $resp = Invoke-RestMethod -Uri $url -Headers (Get-NextHeader) -Method Get
        $count = $resp.data.Count
        $allMatches += $resp.data
        $total = $resp.pagination.totalCount
        Write-Host " OK ($count matches, total: $total)" -ForegroundColor Green
    } catch {
        Write-Host " FAIL: $_" -ForegroundColor Red
        break
    }

    $offset += $Limit
} while ($offset -lt $total)

Write-Host ""
Write-Host "Total obtenidos: $($allMatches.Count)" -ForegroundColor Cyan

# Build calendario.json in same format as La Liga
$calendario = @{ data = $allMatches }
$calPath = "$outDir/calendario.json"
$calendario | ConvertTo-Json -Depth 10 -Compress | ForEach-Object {
    [System.IO.File]::WriteAllText($calPath, $_, [System.Text.Encoding]::UTF8)
}
Write-Host "Guardado: $calPath" -ForegroundColor Green

# Show teams found
$teams = $allMatches | ForEach-Object { $_.homeTeam.name; $_.awayTeam.name } | Sort-Object -Unique
Write-Host "`nEquipos en el calendario:" -ForegroundColor Cyan
$teams | ForEach-Object { Write-Host "  - $_" }
Write-Host "Total equipos: $($teams.Count)" -ForegroundColor Yellow

Write-Host "`nHecho." -ForegroundColor Cyan