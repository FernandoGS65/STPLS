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
