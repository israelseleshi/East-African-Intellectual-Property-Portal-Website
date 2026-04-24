# deploy.ps1 - TPMS deployment helper
# Examples:
#   ./scripts/deployment/deploy.ps1
#   ./scripts/deployment/deploy.ps1 -SkipBuild
#   ./scripts/deployment/deploy.ps1 -FrontendOnly -FastDeploy
#   ./scripts/deployment/deploy.ps1 -BackendOnly -Incremental

param(
  [switch]$SkipBuild,
  [switch]$FrontendOnly,
  [switch]$BackendOnly,
  [switch]$Incremental,
  [switch]$FastDeploy,
  [switch]$QuietRemote
)

$ErrorActionPreference = "Stop"
$NPM_CMD = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if (-not $NPM_CMD) { $NPM_CMD = "npm.cmd" }

if ($FrontendOnly -and $BackendOnly) {
  throw "Use either -FrontendOnly or -BackendOnly, not both."
}

if ($FastDeploy) {
  $Incremental = $true
  $QuietRemote = $true
}

$DeployFrontend = -not $BackendOnly
$DeployBackend = -not $FrontendOnly

$root = (Resolve-Path ".").Path
$deployTmp = Join-Path $root "deploy_tmp"
$manifestPath = Join-Path $root "scripts/deployment/.deploy-manifest.json"

$USER = if ($env:TPMS_SSH_USER) { $env:TPMS_SSH_USER } else { "falolega" }
$HOST_NAME = if ($env:TPMS_SSH_HOST) { $env:TPMS_SSH_HOST } else { "eastafricanip.com" }
$SSH_PORT = if ($env:TPMS_SSH_PORT) { $env:TPMS_SSH_PORT } else { "7822" }
$REMOTE_FRONTEND_DIR = if ($env:TPMS_REMOTE_FRONTEND_DIR) { $env:TPMS_REMOTE_FRONTEND_DIR } else { "eastafricanip.com" }
$REMOTE_BACKEND_DIR = if ($env:TPMS_REMOTE_BACKEND_DIR) { $env:TPMS_REMOTE_BACKEND_DIR } else { "eastafricanip.com/api" }

$defaultKey = Join-Path $env:USERPROFILE ".ssh\id_ed25519"
$fallbackKey = Join-Path $env:USERPROFILE ".ssh\id_tpms"
$SSH_KEY = if ($env:TPMS_SSH_KEY) {
  $env:TPMS_SSH_KEY
}
elseif (Test-Path $defaultKey) {
  $defaultKey
}
else {
  $fallbackKey
}

if (-not (Test-Path $SSH_KEY)) {
  throw "SSH key not found at '$SSH_KEY'. Set TPMS_SSH_KEY or place key in $defaultKey"
}

function Invoke-Npm {
  param([Parameter(Mandatory = $true)][string[]]$Args)
  & $NPM_CMD @Args
  if ($LASTEXITCODE -ne 0) {
    throw "npm command failed: npm $($Args -join ' ') (exit $LASTEXITCODE)"
  }
}

function New-DirIfMissing {
  param([Parameter(Mandatory = $true)][string]$Path)
  if (-not (Test-Path $Path)) {
    New-Item -ItemType Directory -Path $Path | Out-Null
  }
}

function Get-RelativePath {
  param(
    [Parameter(Mandatory = $true)][string]$BasePath,
    [Parameter(Mandatory = $true)][string]$FullPath
  )
  $base = [System.IO.Path]::GetFullPath($BasePath)
  $full = [System.IO.Path]::GetFullPath($FullPath)
  if (-not $base.EndsWith('\')) { $base += '\' }
  if ($full.StartsWith($base, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $full.Substring($base.Length).Replace('\', '/')
  }
  return $full.Replace('\', '/')
}

function Get-FileManifest {
  param([Parameter(Mandatory = $true)][string]$RootPath)
  $map = @{}
  if (-not (Test-Path $RootPath)) { return $map }

  $resolved = (Resolve-Path $RootPath).Path
  Get-ChildItem -Recurse -File $resolved | ForEach-Object {
    $rel = Get-RelativePath -BasePath $resolved -FullPath $_.FullName
    $hash = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
    $map[$rel] = $hash
  }
  return $map
}

function Load-DeployManifest {
  if (-not (Test-Path $manifestPath)) {
    return @{ frontend = @{}; backend = @{} }
  }

  try {
    $json = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    $frontend = @{}
    $backend = @{}
    if ($json.frontend) {
      foreach ($prop in $json.frontend.PSObject.Properties) {
        $frontend[$prop.Name] = [string]$prop.Value
      }
    }
    if ($json.backend) {
      foreach ($prop in $json.backend.PSObject.Properties) {
        $backend[$prop.Name] = [string]$prop.Value
      }
    }
    return @{ frontend = $frontend; backend = $backend }
  }
  catch {
    Write-Warning "Could not parse $manifestPath. Continuing with full artifact upload."
    return @{ frontend = @{}; backend = @{} }
  }
}

function Save-DeployManifest {
  param(
    [Parameter(Mandatory = $true)][hashtable]$FrontendManifest,
    [Parameter(Mandatory = $true)][hashtable]$BackendManifest
  )
  $obj = @{
    generated_at = (Get-Date).ToString("o")
    frontend = $FrontendManifest
    backend = $BackendManifest
  }
  $obj | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
}

function Get-ChangedFiles {
  param(
    [Parameter(Mandatory = $true)][hashtable]$Previous,
    [Parameter(Mandatory = $true)][hashtable]$Current
  )
  $changed = New-Object System.Collections.Generic.List[string]
  $deleted = New-Object System.Collections.Generic.List[string]

  foreach ($key in $Current.Keys) {
    if (-not $Previous.ContainsKey($key) -or $Previous[$key] -ne $Current[$key]) {
      $changed.Add($key)
    }
  }

  foreach ($key in $Previous.Keys) {
    if (-not $Current.ContainsKey($key)) {
      $deleted.Add($key)
    }
  }

  return @{ changed = $changed; deleted = $deleted }
}

function Copy-ChangedFiles {
  param(
    [Parameter(Mandatory = $true)][string]$SourceRoot,
    [Parameter(Mandatory = $true)][string[]]$ChangedFiles,
    [Parameter(Mandatory = $true)][string]$DestinationRoot
  )

  foreach ($relative in $ChangedFiles) {
    $src = Join-Path $SourceRoot ($relative.Replace('/', '\'))
    if (-not (Test-Path $src)) { continue }
    $target = Join-Path $DestinationRoot ($relative.Replace('/', '\'))
    $targetDir = Split-Path -Parent $target
    if ($targetDir) { New-DirIfMissing -Path $targetDir }
    Copy-Item -LiteralPath $src -Destination $target -Force
  }
}

function Assert-BuildArtifacts {
  param([switch]$RequireFrontend, [switch]$RequireBackend)

  if ($RequireFrontend) {
    if (-not (Test-Path "client/dist/index.html")) {
      throw "Missing frontend artifact: client/dist/index.html. Run build or remove -SkipBuild."
    }
  }

  if ($RequireBackend) {
    if (-not (Test-Path "server/dist")) {
      throw "Missing backend artifact: server/dist. Run build or remove -SkipBuild."
    }
  }
}

function Get-LatestWriteTime {
  param([Parameter(Mandatory = $true)][string]$Path)
  if (-not (Test-Path $Path)) { return $null }
  $latest = Get-ChildItem -Recurse -File $Path | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
  return $latest.LastWriteTimeUtc
}

function Test-ArtifactsFresh {
  param(
    [switch]$CheckFrontend,
    [switch]$CheckBackend
  )

  $frontendFresh = $true
  $backendFresh = $true

  if ($CheckFrontend) {
    $src = Get-LatestWriteTime -Path "client/src"
    $dist = Get-LatestWriteTime -Path "client/dist"
    $frontendFresh = $src -and $dist -and ($dist -ge $src)
  }

  if ($CheckBackend) {
    $src = Get-LatestWriteTime -Path "server/src"
    $dist = Get-LatestWriteTime -Path "server/dist"
    $backendFresh = $src -and $dist -and ($dist -ge $src)
  }

  return ($frontendFresh -and $backendFresh)
}

Write-Host "Starting TPMS deployment to $HOST_NAME"
Write-Host "Modes: Frontend=$DeployFrontend Backend=$DeployBackend SkipBuild=$SkipBuild Incremental=$Incremental FastDeploy=$FastDeploy"

$overall = [System.Diagnostics.Stopwatch]::StartNew()

if ($FastDeploy -and -not $SkipBuild) {
  if (Test-ArtifactsFresh -CheckFrontend:$DeployFrontend -CheckBackend:$DeployBackend) {
    $SkipBuild = $true
    Write-Host "FastDeploy: artifact freshness check passed, auto-enabling -SkipBuild."
  }
  else {
    Write-Host "FastDeploy: artifacts are stale, running build."
  }
}

if (-not $SkipBuild) {
  if ($DeployFrontend) {
    Write-Host "Building frontend..."
    $timer = [System.Diagnostics.Stopwatch]::StartNew()
    Push-Location client
    try { Invoke-Npm -Args @("run", "build") } finally { Pop-Location }
    $timer.Stop()
    Write-Host ("Frontend build finished in {0:n1}s" -f $timer.Elapsed.TotalSeconds)
  }

  if ($DeployBackend) {
    Write-Host "Building backend..."
    $timer = [System.Diagnostics.Stopwatch]::StartNew()
    Push-Location server
    try { Invoke-Npm -Args @("run", "build") } finally { Pop-Location }
    $timer.Stop()
    Write-Host ("Backend build finished in {0:n1}s" -f $timer.Elapsed.TotalSeconds)
  }
}
else {
  Write-Host "SkipBuild enabled."
}

Assert-BuildArtifacts -RequireFrontend:$DeployFrontend -RequireBackend:$DeployBackend

$previousManifest = Load-DeployManifest
$frontendManifest = if ($DeployFrontend) { Get-FileManifest -RootPath "client/dist" } else { $previousManifest.frontend }
$backendManifest = if ($DeployBackend) { Get-FileManifest -RootPath "server/dist" } else { $previousManifest.backend }

if ($DeployBackend -and (Test-Path "server/package.json")) {
  $backendManifest["package.json"] = (Get-FileHash -LiteralPath "server/package.json" -Algorithm SHA256).Hash
}
if ($DeployBackend -and (Test-Path "server.js.temp")) {
  $backendManifest["server.js"] = (Get-FileHash -LiteralPath "server.js.temp" -Algorithm SHA256).Hash
}

$frontendDiff = Get-ChangedFiles -Previous $previousManifest.frontend -Current $frontendManifest
$backendDiff = Get-ChangedFiles -Previous $previousManifest.backend -Current $backendManifest

$frontendChanged = $DeployFrontend -and ((-not $Incremental) -or $frontendDiff.changed.Count -gt 0 -or $frontendDiff.deleted.Count -gt 0)
$backendChanged = $DeployBackend -and ((-not $Incremental) -or $backendDiff.changed.Count -gt 0 -or $backendDiff.deleted.Count -gt 0)

if ($DeployFrontend -and $Incremental -and -not $frontendChanged) {
  Write-Host "Frontend unchanged; skipping upload."
}
if ($DeployBackend -and $Incremental -and -not $backendChanged) {
  Write-Host "Backend unchanged; skipping upload."
}

if (-not $frontendChanged -and -not $backendChanged) {
  Write-Host "No deployment changes detected."
  $overall.Stop()
  Write-Host ("Finished in {0:n1}s" -f $overall.Elapsed.TotalSeconds)
  exit 0
}

try {
  if (Test-Path $deployTmp) { Remove-Item -Recurse -Force $deployTmp }
  New-DirIfMissing -Path $deployTmp

  if ($frontendChanged) { New-DirIfMissing -Path (Join-Path $deployTmp "frontend") }
  if ($backendChanged) { New-DirIfMissing -Path (Join-Path $deployTmp "backend") }

  if ($frontendChanged) {
    Write-Host "Packaging frontend..."
    $frontendPkg = Join-Path $deployTmp "frontend"
    if ($Incremental) {
      Copy-ChangedFiles -SourceRoot "client/dist" -ChangedFiles ($frontendDiff.changed | ForEach-Object { [string]$_ }) -DestinationRoot $frontendPkg
    }
    else {
      Copy-Item -Recurse -Path "client/dist/*" -Destination $frontendPkg
    }
    if (Test-Path "client/public/.htaccess") {
      Copy-Item -Path "client/public/.htaccess" -Destination $frontendPkg -Force
    }
    
    $outZip = Join-Path $deployTmp "frontend.zip"
    if (Test-Path $outZip) { Remove-Item $outZip -Force }
    
    # Use native tar.exe for UNIX-compatible zip files (forward slash separator)
    Push-Location $frontendPkg
    tar.exe -a -c -f $outZip *
    Pop-Location
  }

  if ($backendChanged) {
    Write-Host "Packaging backend..."
    $backendPkg = Join-Path $deployTmp "backend"
    if ($Incremental) {
      Copy-ChangedFiles -SourceRoot "server/dist" -ChangedFiles ($backendDiff.changed | Where-Object { $_ -ne "package.json" -and $_ -ne "server.js" } | ForEach-Object { [string]$_ }) -DestinationRoot $backendPkg
    }
    else {
      Copy-Item -Recurse -Path "server/dist/*" -Destination $backendPkg
    }

    Copy-Item -Path "server/package.json" -Destination (Join-Path $backendPkg "package.json") -Force
    if (Test-Path "server.js.temp") {
      Copy-Item -Path "server.js.temp" -Destination (Join-Path $backendPkg "server.js") -Force
    }

    if (Test-Path (Join-Path $backendPkg "uploads")) { Remove-Item -Recurse -Force (Join-Path $backendPkg "uploads") }
    if (Test-Path (Join-Path $backendPkg "forms-upload")) { Remove-Item -Recurse -Force (Join-Path $backendPkg "forms-upload") }

    $outZipBackend = Join-Path $deployTmp "backend.zip"
    if (Test-Path $outZipBackend) { Remove-Item $outZipBackend -Force }

    # Use native tar.exe for UNIX-compatible zip files
    Push-Location $backendPkg
    tar.exe -a -c -f $outZipBackend *
    Pop-Location
  }

  Write-Host "Uploading artifacts..."
  if ($frontendChanged) {
    scp -i $SSH_KEY -P $SSH_PORT -o ConnectTimeout=12 -o StrictHostKeyChecking=no (Join-Path $deployTmp "frontend.zip") ${USER}@${HOST_NAME}:/home/${USER}/${REMOTE_FRONTEND_DIR}/
    if ($LASTEXITCODE -ne 0) { throw "Frontend upload failed (scp exit $LASTEXITCODE)." }
  }
  if ($backendChanged) {
    scp -i $SSH_KEY -P $SSH_PORT -o ConnectTimeout=12 -o StrictHostKeyChecking=no (Join-Path $deployTmp "backend.zip") ${USER}@${HOST_NAME}:/home/${USER}/${REMOTE_BACKEND_DIR}/
    if ($LASTEXITCODE -ne 0) { throw "Backend upload failed (scp exit $LASTEXITCODE)." }
  }

  Write-Host "Applying artifacts on remote..."
  $remoteCmds = New-Object System.Collections.Generic.List[string]

  if ($frontendChanged) {
    $frontendUnzip = if ($QuietRemote) { "unzip -oq frontend.zip" } else { "unzip -o frontend.zip" }
    $remoteCmds.Add("cd /home/$USER/$REMOTE_FRONTEND_DIR")
    if (-not $Incremental) {
      $remoteCmds.Add("if [ -d 'assets' ]; then find assets -maxdepth 1 -type f \( -name '*.js' -o -name '*.css' -o -name '*.map' \) -delete; fi")
    }
    $remoteCmds.Add($frontendUnzip)
    $remoteCmds.Add("rm -f frontend.zip")
  }

  if ($backendChanged) {
    $backendUnzip = if ($QuietRemote) { "unzip -oq backend.zip" } else { "unzip -o backend.zip" }
    $remoteCmds.Add("cd /home/$USER/$REMOTE_BACKEND_DIR")
    $remoteCmds.Add("if [ -d 'uploads' ]; then rm -rf ../uploads_backup && mv uploads ../uploads_backup; fi")
    $remoteCmds.Add("if [ -d 'forms-upload' ]; then rm -rf ../forms-upload_backup && mv forms-upload ../forms-upload_backup; fi")
    $remoteCmds.Add($backendUnzip)
    $remoteCmds.Add("if [ -d '../uploads_backup' ]; then rm -rf uploads && mv ../uploads_backup uploads; fi")
    $remoteCmds.Add("if [ -d '../forms-upload_backup' ]; then rm -rf forms-upload && mv ../forms-upload_backup forms-upload; fi")
    $remoteCmds.Add("mkdir -p uploads/marks forms-upload")
    $remoteCmds.Add("rm -f backend.zip")
    $remoteCmds.Add("mkdir -p tmp && touch tmp/restart.txt")
  }

  $remoteCommand = ($remoteCmds -join " && ")
  ssh -i $SSH_KEY -p $SSH_PORT -o ConnectTimeout=12 -o StrictHostKeyChecking=no ${USER}@${HOST_NAME} $remoteCommand
  if ($LASTEXITCODE -ne 0) { throw "Remote extract/restart failed (ssh exit $LASTEXITCODE)." }

  Save-DeployManifest -FrontendManifest $frontendManifest -BackendManifest $backendManifest

  if ($Incremental -and $frontendDiff.deleted.Count -gt 0) {
    Write-Warning "Frontend had deleted files locally. Incremental mode does not remotely delete unknown stale files."
  }
  if ($Incremental -and $backendDiff.deleted.Count -gt 0) {
    Write-Warning "Backend had deleted files locally. Incremental mode does not remotely delete unknown stale files."
  }

  $overall.Stop()
  Write-Host ("Deployment complete in {0:n1}s" -f $overall.Elapsed.TotalSeconds)
}
finally {
  if (Test-Path $deployTmp) {
    Remove-Item -Recurse -Force $deployTmp
  }
}
