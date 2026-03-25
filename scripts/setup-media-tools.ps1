$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$toolsRoot = Join-Path $repoRoot "tools"
$tempRoot = Join-Path $toolsRoot "_tmp"
$ffmpegBinDir = Join-Path $toolsRoot "ffmpeg\\bin"
$ytDlpPath = Join-Path $toolsRoot "yt-dlp.exe"

$ytDlpUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
$ffmpegZipUrl = "https://github.com/BtbN/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-win64-gpl.zip"

New-Item -ItemType Directory -Force -Path $toolsRoot | Out-Null
New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
New-Item -ItemType Directory -Force -Path $ffmpegBinDir | Out-Null

$ffmpegZipPath = Join-Path $tempRoot "ffmpeg.zip"
$ffmpegExtractPath = Join-Path $tempRoot "ffmpeg-extract"

if (Test-Path $ffmpegExtractPath) {
  Remove-Item -Recurse -Force $ffmpegExtractPath
}

Write-Host "Downloading yt-dlp..."
Invoke-WebRequest -Uri $ytDlpUrl -OutFile $ytDlpPath

Write-Host "Downloading ffmpeg..."
Invoke-WebRequest -Uri $ffmpegZipUrl -OutFile $ffmpegZipPath

Write-Host "Extracting ffmpeg..."
Expand-Archive -Path $ffmpegZipPath -DestinationPath $ffmpegExtractPath -Force

$ffmpegExe = Get-ChildItem -Path $ffmpegExtractPath -Recurse -Filter "ffmpeg.exe" | Select-Object -First 1
$ffprobeExe = Get-ChildItem -Path $ffmpegExtractPath -Recurse -Filter "ffprobe.exe" | Select-Object -First 1

if (-not $ffmpegExe -or -not $ffprobeExe) {
  throw "Could not locate ffmpeg.exe or ffprobe.exe in the downloaded archive."
}

Copy-Item -Force $ffmpegExe.FullName (Join-Path $ffmpegBinDir "ffmpeg.exe")
Copy-Item -Force $ffprobeExe.FullName (Join-Path $ffmpegBinDir "ffprobe.exe")

Remove-Item -Force $ffmpegZipPath
Remove-Item -Recurse -Force $ffmpegExtractPath

Write-Host ""
Write-Host "Installed tools:"
Write-Host "  yt-dlp   -> $ytDlpPath"
Write-Host "  ffmpeg   -> $(Join-Path $ffmpegBinDir 'ffmpeg.exe')"
Write-Host "  ffprobe  -> $(Join-Path $ffmpegBinDir 'ffprobe.exe')"
