param(
  [switch]$SkipNpmCi,
  [switch]$SkipDbReset,
  [switch]$SkipAppChecks,
  [switch]$RunRlsTests
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

function Add-PathIfExists {
  param([string]$PathToAdd)

  if ((Test-Path $PathToAdd) -and (($env:Path -split ";") -notcontains $PathToAdd)) {
    $env:Path = "$PathToAdd;$env:Path"
  }
}

$wingetNodeRoot = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages"
$nodeDir = Get-ChildItem $wingetNodeRoot -Directory -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like "OpenJS.NodeJS.LTS_*" } |
  ForEach-Object {
    Get-ChildItem $_.FullName -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -like "node-v*-win-x64" }
  } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if ($nodeDir) {
  Add-PathIfExists $nodeDir.FullName
}

Add-PathIfExists "C:\Program Files\Git\cmd"
Add-PathIfExists "C:\Program Files\Docker\Docker\resources\bin"

function Require-Command {
  param(
    [string]$CommandName,
    [string]$InstallHint
  )

  if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
    throw "$CommandName is niet gevonden. $InstallHint"
  }
}

function Invoke-CapturedNative {
  param(
    [string]$CommandName,
    [string[]]$Arguments
  )

  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $output = & $CommandName @Arguments 2>&1
  $exitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorActionPreference

  return [pscustomobject]@{
    ExitCode = $exitCode
    Text = ($output | Out-String).Trim()
  }
}

function Invoke-CheckedNative {
  param(
    [string]$CommandName,
    [string[]]$Arguments
  )

  $result = Invoke-CapturedNative $CommandName $Arguments
  if ($result.Text) {
    Write-Host $result.Text
  }
  if ($result.ExitCode -ne 0) {
    throw "$CommandName $($Arguments -join ' ') failed with exit code $($result.ExitCode)."
  }
}

Require-Command "node.exe" "Installeer Node.js LTS: winget install --id OpenJS.NodeJS.LTS -e --scope user"
Require-Command "npm.cmd" "Installeer Node.js LTS of start een nieuwe terminal."
Require-Command "docker.exe" "Installeer Docker Desktop: winget install --id Docker.DockerDesktop -e"

Write-Host "Node: $(node.exe --version)"
Write-Host "npm: $(npm.cmd --version)"
Write-Host "Docker: $(docker.exe --version)"

$dockerInfo = Invoke-CapturedNative "docker.exe" @("info", "--format", "Docker engine: {{.ServerVersion}}")

if (($dockerInfo.ExitCode -ne 0) -or ($dockerInfo.Text -notmatch "Docker engine:\s*\d")) {
  Write-Host ""
  Write-Host "Docker Desktop is geinstalleerd, maar de engine draait nog niet."
  Write-Host "Gerichte adminstap: open PowerShell als Administrator en run:"
  Write-Host "  wsl --install"
  Write-Host "Herstart Windows daarna, open Docker Desktop tot de status 'Running' is, en run dit script opnieuw."
  exit 1
}
else {
  $dockerInfo.Text | Write-Host
}

if (-not $SkipNpmCi) {
  Invoke-CheckedNative "npm.cmd" @("ci")
}

if (-not $SkipAppChecks) {
  Invoke-CheckedNative "npm.cmd" @("run", "typecheck")
  Invoke-CheckedNative "npm.cmd" @("run", "lint")
  Invoke-CheckedNative "npm.cmd" @("run", "test")
}

Invoke-CheckedNative "npx.cmd" @("supabase", "--version")
Invoke-CheckedNative "npx.cmd" @("supabase", "start")

if (-not $SkipDbReset) {
  Invoke-CheckedNative "npx.cmd" @("supabase", "db", "reset", "--local")
}

if ($RunRlsTests) {
  Invoke-CheckedNative "npm.cmd" @("run", "test:rls")
}

Write-Host ""
Write-Host "Lokale stack is klaar."
Write-Host "App: npm.cmd run dev"
Write-Host "Supabase API: http://127.0.0.1:54321"
Write-Host "Supabase Studio: http://127.0.0.1:54323"
