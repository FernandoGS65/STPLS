<#
.SYNOPSIS
    Aplica los overrides de posiciones desde localStorage al plantilla.json.
.DESCRIPTION
    Lee un archivo JSON con los overrides exportados desde el navegador
    y los aplica al plantilla.json correspondiente.
.PARAMETER OverridesFile
    Ruta al archivo JSON con los overrides. Formato: {"Equipo:id": "NuevaPos", ...}
.EXAMPLE
    .\apply-overrides.ps1 -OverridesFile overrides.json
#>
param(
    [string]$OverridesFile
)

if (-not $OverridesFile) {
    Write-Host "Uso: .\apply-overrides.ps1 -OverridesFile overrides.json"
    Write-Host ""
    Write-Host "Para exportar los overrides desde el navegador, abre la consola (F12) y ejecuta:"
    Write-Host '  JSON.parse(localStorage.getItem("stpls_position_overrides") || "{}")'
    Write-Host "Copia la salida a un archivo overrides.json y ejecuta este script."
    exit 1
}

if (-not (Test-Path $OverridesFile)) {
    Write-Host "Error: No se encontro el archivo $OverridesFile"
    exit 1
}

$overrides = Get-Content -Path $OverridesFile -Raw -Encoding UTF8 | ConvertFrom-Json

if (-not $overrides) {
    Write-Host "El archivo de overrides esta vacio o no es valido."
    exit 0
}

$plantillaPath = Get-ChildItem -Path $PSScriptRoot -Filter 'plantilla.json' -Recurse | Select-Object -First 1
if (-not $plantillaPath) {
    Write-Host "Error: No se encontro plantilla.json"
    exit 1
}

$plantilla = Get-Content -Path $plantillaPath.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
$applied = 0

$overrides.PSObject.Properties | ForEach-Object {
    $key = $_.Name
    $newPos = $_.Value
    $parts = $key -split ':'
    $teamName = $parts[0]
    $playerId = [int]$parts[1]

    if (-not $plantilla.$teamName) {
        Write-Host "AVISO: Equipo no encontrado: $teamName"
        return
    }

    $player = $plantilla.$teamName.players | Where-Object { $_.id -eq $playerId }
    if (-not $player) {
        Write-Host "AVISO: Jugador no encontrado: $playerId en $teamName"
        return
    }

    $oldPos = $player.position
    $player.position = $newPos
    $applied++
    Write-Host "OK: $($player.name) ($teamName) - $oldPos -> $newPos"
}

if ($applied -gt 0) {
    $json = $plantilla | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($plantillaPath.FullName, $json, [System.Text.Encoding]::UTF8)
    Write-Host ""
    Write-Host "Se aplicaron $applied cambios a $($plantillaPath.FullName)"
} else {
    Write-Host "No se encontraron overrides para aplicar."
}
