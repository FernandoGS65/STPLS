$port = 8000
$root = $PSScriptRoot

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "Servidor corriendo en http://localhost:$port/"
Write-Host "Presiona Ctrl+C para detenerlo"

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $path = $request.Url.AbsolutePath.TrimStart('/')
    if ([string]::IsNullOrEmpty($path)) { $path = "index.html" }

    if ($path -eq 'api/update-position' -and $request.HttpMethod -eq 'POST') {
        $response.ContentType = 'application/json'
        $response.Headers.Add('Access-Control-Allow-Origin', '*')
        try {
            $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
            $body = $reader.ReadToEnd()
            $reader.Close()
            $data = $body | ConvertFrom-Json

            $teamName = $data.team
            $playerId = [int]$data.playerId
            $newPos = $data.newPosition

            $validPositions = @('Goalkeeper','Defender','Midfielder','Forward')
            if ($newPos -notin $validPositions) {
                throw "Posicion invalida: $newPos"
            }

            $plantillaPath = Get-ChildItem -Path $root -Filter 'plantilla.json' -Recurse | Select-Object -First 1
            if (-not $plantillaPath) {
                throw "No se encontro plantilla.json"
            }

            $plantilla = Get-Content -Path $plantillaPath.FullName -Raw -Encoding UTF8 | ConvertFrom-Json

            if (-not $plantilla.$teamName) {
                throw "Equipo no encontrado: $teamName"
            }

            $player = $plantilla.$teamName.players | Where-Object { $_.id -eq $playerId }
            if (-not $player) {
                throw "Jugador no encontrado: $playerId en $teamName"
            }

            $oldPos = $player.position
            $player.position = $newPos

            $json = $plantilla | ConvertTo-Json -Depth 10
            [System.IO.File]::WriteAllText($plantillaPath.FullName, $json, [System.Text.Encoding]::UTF8)

            $result = @{ success = $true; oldPosition = $oldPos; newPosition = $newPos; player = $player.name }
            $resultJson = $result | ConvertTo-Json
            $resultBytes = [System.Text.Encoding]::UTF8.GetBytes($resultJson)
            $response.ContentLength64 = $resultBytes.Length
            $response.OutputStream.Write($resultBytes, 0, $resultBytes.Length)
            Write-Host "OK: $teamName - $($player.name) ($oldPos -> $newPos)"
        } catch {
            $errResult = @{ success = $false; error = $_.Exception.Message }
            $errJson = $errResult | ConvertTo-Json
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes($errJson)
            $response.StatusCode = 400
            $response.ContentLength64 = $errBytes.Length
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            Write-Host "ERROR: $($_.Exception.Message)"
        }
        $response.OutputStream.Close()
        continue
    }

    if ($path -eq 'api/noticias' -and $request.HttpMethod -eq 'GET') {
        $team = $request.QueryString['team']
        if ([string]::IsNullOrEmpty($team)) {
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":false,"error":"Parametro team requerido"}')
            $response.StatusCode = 400
            $response.ContentType = 'application/json'
            $response.ContentLength64 = $errBytes.Length
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            $response.OutputStream.Close()
            continue
        }

        $season = if ($request.QueryString['season']) { $request.QueryString['season'] } else { "2025-26" }
        $comp = if ($request.QueryString['comp']) { $request.QueryString['comp'] } else { "liga" }
        $noticiasDir = Join-Path $root "data/$season/$comp/noticias"
        $jsonPath = Join-Path $noticiasDir "$team.json"

        $fresco = $false
        if (Test-Path $jsonPath) {
            $ultimaMod = (Get-Item $jsonPath).LastWriteTime
            $fresco = ((Get-Date) - $ultimaMod).TotalHours -lt 1
        }

        if (-not $fresco) {
            Write-Host "API noticias: generando $team..." -ForegroundColor Yellow
            $fetchScript = Join-Path $root "fetch-noticias.ps1"
            if (Test-Path $fetchScript) {
                & PowerShell -ExecutionPolicy Bypass -File $fetchScript -Team $team -Season $season -Competition $comp
            }
        }

        if (Test-Path $jsonPath) {
            $response.ContentType = 'application/json'
            $response.Headers.Add('Access-Control-Allow-Origin', '*')
            $bytes = [System.IO.File]::ReadAllBytes($jsonPath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.ContentType = 'application/json'
            $response.StatusCode = 200
            $emptyBytes = [System.Text.Encoding]::UTF8.GetBytes('[]')
            $response.ContentLength64 = $emptyBytes.Length
            $response.OutputStream.Write($emptyBytes, 0, $emptyBytes.Length)
        }
        $response.OutputStream.Close()
        continue
    }

    $fullPath = Join-Path $root $path

    if (Test-Path $fullPath -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($fullPath)
        $mime = @{
            ".html" = "text/html"
            ".css"  = "text/css"
            ".js"   = "application/javascript"
            ".json" = "application/json"
            ".png"  = "image/png"
            ".jpg"  = "image/jpeg"
            ".jpeg" = "image/jpeg"
            ".webp" = "image/webp"
            ".mp4"  = "video/mp4"
            ".ico"  = "image/x-icon"
        }
        $contentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }

        $bytes = [System.IO.File]::ReadAllBytes($fullPath)
        $response.ContentType = $contentType
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $response.StatusCode = 404
        $msg = [System.Text.Encoding]::UTF8.GetBytes("404 - No encontrado")
        $response.OutputStream.Write($msg, 0, $msg.Length)
    }

    $response.OutputStream.Close()
}

$listener.Stop()
