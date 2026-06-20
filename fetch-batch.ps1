param([int]$StartIndex = 0, [int]$BatchSize = 20)
PowerShell -ExecutionPolicy Bypass -File "C:\Proyectos\STPLS\fetch-partidos.ps1" -StartIndex $StartIndex -BatchSize $BatchSize
