<#
.SYNOPSIS
    Creates arbitros.json for Premier League 2026-27 and downloads referee photos.
#>
param(
    [string]$Season = "2026-27",
    [string]$Competition = "premier"
)

$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$referees = @(
    @{ id = 1;  Nombre = "Michael OLIVER";        Colegio = "Northumberland FA";          Internacional = 1; FechaNacim = "1985-02-20"; FechaPrimera = "2010" }
    @{ id = 2;  Nombre = "Anthony TAYLOR";         Colegio = "Cheshire FA";               Internacional = 1; FechaNacim = "1978-10-20"; FechaPrimera = "2010" }
    @{ id = 3;  Nombre = "Chris KAVANAGH";         Colegio = "Manchester FA";             Internacional = 1; FechaNacim = "1985-09-04"; FechaPrimera = "2017" }
    @{ id = 4;  Nombre = "Sam BARROTT";            Colegio = "West Riding FA";            Internacional = 1; FechaNacim = "1994-01-01"; FechaPrimera = "2023" }
    @{ id = 5;  Nombre = "Darren ENGLAND";         Colegio = "Sheffield & Hallamshire FA";Internacional = 1; FechaNacim = "1985-12-23"; FechaPrimera = "2020" }
    @{ id = 6;  Nombre = "Jarred GILLETT";         Colegio = "Football Australia";        Internacional = 1; FechaNacim = "1986-11-01"; FechaPrimera = "2021" }
    @{ id = 7;  Nombre = "Stuart ATTWELL";         Colegio = "Warwickshire FA";           Internacional = 1; FechaNacim = "1982-10-06"; FechaPrimera = "2008" }
    @{ id = 8;  Nombre = "Craig PAWSON";           Colegio = "South Yorkshire FA";        Internacional = 0; FechaNacim = "1979-03-02"; FechaPrimera = "2013" }
    @{ id = 9;  Nombre = "Tom BRAMALL";            Colegio = "Sheffield & Hallamshire FA";Internacional = 0; FechaNacim = "1990-06-01"; FechaPrimera = "2022" }
    @{ id = 10; Nombre = "Andy MADLEY";            Colegio = "West Yorkshire FA";         Internacional = 1; FechaNacim = "1983-09-05"; FechaPrimera = "2018" }
    @{ id = 11; Nombre = "Simon HOOPER";           Colegio = "Wiltshire FA";              Internacional = 0; FechaNacim = "1982-05-03"; FechaPrimera = "2015" }
    @{ id = 12; Nombre = "Paul TIERNEY";           Colegio = "Lancashire FA";             Internacional = 0; FechaNacim = "1980-12-25"; FechaPrimera = "2014" }
    @{ id = 13; Nombre = "Peter BANKES";           Colegio = "Liverpool FA";              Internacional = 1; FechaNacim = "1982-05-18"; FechaPrimera = "2019" }
    @{ id = 14; Nombre = "John BROOKS";            Colegio = "Leicestershire FA";         Internacional = 1; FechaNacim = "1989-11-22"; FechaPrimera = "2021" }
    @{ id = 15; Nombre = "Tony HARRINGTON";        Colegio = "Durham FA";                 Internacional = 0; FechaNacim = "1985-08-11"; FechaPrimera = "2021" }
    @{ id = 16; Nombre = "Tim ROBINSON";           Colegio = "West Sussex FA";            Internacional = 0; FechaNacim = "1984-01-01"; FechaPrimera = "2019" }
    @{ id = 17; Nombre = "Michael SALISBURY";      Colegio = "Lancashire FA";             Internacional = 0; FechaNacim = "1985-04-14"; FechaPrimera = "2021" }
    @{ id = 18; Nombre = "Robert JONES";           Colegio = "Merseyside FA";             Internacional = 1; FechaNacim = "1987-04-04"; FechaPrimera = "2019" }
    @{ id = 19; Nombre = "Farai HALLAM";           Colegio = "FA";                        Internacional = 0; FechaNacim = "1995-06-01"; FechaPrimera = "2026" }
    @{ id = 20; Nombre = "Lewis SMITH";            Colegio = "FA";                        Internacional = 0; FechaNacim = "1990-06-01"; FechaPrimera = "2024" }
)

function Normalize-FotoName([string]$name) {
    $norm = $name.ToLower()
    $norm = $norm.Replace([char]0x00E1,'a').Replace([char]0x00E9,'e').Replace([char]0x00ED,'i')
    $norm = $norm.Replace([char]0x00F3,'o').Replace([char]0x00FA,'u').Replace([char]0x00F1,'n')
    $norm = $norm.Replace([char]0x00FC,'u')
    $norm = ($norm -replace '[^a-z]','') -replace '\s+',''
    return $norm
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
    return $sb.ToString()
}

# Create output
$output = @()
$fotoDir = Join-Path $PSScriptRoot "imagenes\arbitros"

foreach ($r in $referees) {
    $fotoName = (Normalize-FotoName $r.Nombre) + ".jpg"
    $r.Foto = "imagenes/arbitros/$fotoName"
    $output += [PSCustomObject]@{
        id = $r.id
        Nombre = $r.Nombre
        Colegio = $r.Colegio
        Internacional = $r.Internacional
        FechaNacim = $r.FechaNacim
        FechaPrimera = $r.FechaPrimera
        Foto = $r.Foto
    }
}

# Save arbitros.json
$arbitrosPath = Join-Path $PSScriptRoot "data\$Season\$Competition\arbitros.json"
$jsonOut = $output | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($arbitrosPath, $jsonOut, (New-Object System.Text.UTF8Encoding $false))
Write-Host "Saved $($output.Count) referees to $arbitrosPath" -ForegroundColor Green

# Download photos from Wikipedia
Write-Host ""
Write-Host "Downloading referee photos from Wikipedia..." -ForegroundColor Cyan

$downloaded = 0
$failed = @()

function Get-WikiImageUrl([string]$name) {
    $query = [System.Uri]::EscapeDataString("$name (referee)")
    $url = "https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&pithumbsize=300&titles=$query"
    try {
        $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10 -Headers @{"User-Agent"="STPLS/1.0"}
        $data = $resp.Content | ConvertFrom-Json
        $pages = $data.query.pages.PSObject.Properties
        foreach ($p in $pages) {
            if ($p.Value.thumbnail -and $p.Value.thumbnail.source) {
                return $p.Value.thumbnail.source
            }
        }
    } catch {}
    return $null
}

foreach ($r in $output) {
    $fotoName = (Normalize-FotoName $r.Nombre) + ".jpg"
    $fotoPath = Join-Path $fotoDir $fotoName

    if (Test-Path $fotoPath) {
        Write-Host "  $($r.Nombre) - already exists" -ForegroundColor Gray
        $downloaded++
        continue
    }

    Write-Host "  $($r.Nombre)..." -NoNewline -ForegroundColor Yellow
    $imgUrl = Get-WikiImageUrl $r.Nombre

    if ($imgUrl) {
        try {
            Invoke-WebRequest -Uri $imgUrl -UseBasicParsing -TimeoutSec 15 -OutFile $fotoPath
            Write-Host " OK" -ForegroundColor Green
            $downloaded++
        } catch {
            Write-Host " FAILED download" -ForegroundColor Red
            $failed += $r.Nombre
        }
    } else {
        Write-Host " no image found" -ForegroundColor DarkGray
        $failed += $r.Nombre
    }

    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "Photos downloaded: $downloaded / $($output.Count)" -ForegroundColor Green
if ($failed.Count -gt 0) {
    Write-Host "Missing photos for: $($failed -join ', ')" -ForegroundColor Yellow
}
