# deploy.ps1 - One-Click Deployment for TPMS
# Usage:
#   ./scripts/deploy.ps1
#   ./scripts/deploy.ps1 -SkipBuild

param(
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$USER = if ($env:TPMS_SSH_USER) { $env:TPMS_SSH_USER } else { "falolega" }
$HOST_NAME = if ($env:TPMS_SSH_HOST) { $env:TPMS_SSH_HOST } else { "eastafricanip.com" }
$SSH_PORT = if ($env:TPMS_SSH_PORT) { $env:TPMS_SSH_PORT } else { "7822" }
$REMOTE_FRONTEND_DIR = if ($env:TPMS_REMOTE_FRONTEND_DIR) { $env:TPMS_REMOTE_FRONTEND_DIR } else { "eastafricanip.com" }
$REMOTE_BACKEND_DIR = if ($env:TPMS_REMOTE_BACKEND_DIR) { $env:TPMS_REMOTE_BACKEND_DIR } else { "eastafricanip.com/api" }

$defaultKey = Join-Path $env:USERPROFILE ".ssh\\id_ed25519"
$fallbackKey = Join-Path $env:USERPROFILE ".ssh\\id_tpms"
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

Write-Host "Starting TPMS Deployment to $HOST_NAME..."

# 1. Build Client + Server
if (-not $SkipBuild) {
  Write-Host "Building Frontend..."
  Set-Location client
  npm run build
  Set-Location ..

  Write-Host "Building Backend..."
  Set-Location server
  npm run build
  Set-Location ..
}
else {
  Write-Host "SkipBuild enabled: using existing client/dist and server/dist"
}

try {
  # 3. Create Update Packages
  Write-Host "Creating deployment packages..."
  if (Test-Path "deploy_tmp") { Remove-Item -Recurse -Force deploy_tmp }
  New-Item -ItemType Directory -Path "deploy_tmp/frontend"
  New-Item -ItemType Directory -Path "deploy_tmp/backend"

  # Copy frontend dist
  Copy-Item -Recurse -Path "client/dist/*" -Destination "deploy_tmp/frontend"
  Copy-Item -Path "client/public/.htaccess" -Destination "deploy_tmp/frontend"

  # Copy backend dist + essentials
  Copy-Item -Recurse -Path "server/dist/*" -Destination "deploy_tmp/backend"
  Copy-Item -Path "server/package.json" -Destination "deploy_tmp/backend"
  # dist/server.js is the canonical runtime entry. Keep a fallback for legacy wrapper if present.
  if (Test-Path "server.js.temp") {
    Copy-Item -Path "server.js.temp" -Destination "deploy_tmp/backend/server.js"
  }
  # Ensure we don't package local uploads
  if (Test-Path "deploy_tmp/backend/uploads") { Remove-Item -Recurse -Force "deploy_tmp/backend/uploads" }
  if (Test-Path "deploy_tmp/backend/forms-upload") { Remove-Item -Recurse -Force "deploy_tmp/backend/forms-upload" }
  Compress-Archive -Path "deploy_tmp/frontend/*" -DestinationPath "deploy_tmp/frontend.zip" -Force
  Compress-Archive -Path "deploy_tmp/backend/*" -DestinationPath "deploy_tmp/backend.zip" -Force

  # 4. Upload to Server
  Write-Host "Uploading to server using SSH key: $SSH_KEY"
  scp -i $SSH_KEY -P $SSH_PORT -o ConnectTimeout=12 -o StrictHostKeyChecking=no deploy_tmp/frontend.zip ${USER}@${HOST_NAME}:/home/${USER}/${REMOTE_FRONTEND_DIR}/
  if ($LASTEXITCODE -ne 0) { throw "Frontend upload failed (scp exit $LASTEXITCODE)." }

  scp -i $SSH_KEY -P $SSH_PORT -o ConnectTimeout=12 -o StrictHostKeyChecking=no deploy_tmp/backend.zip ${USER}@${HOST_NAME}:/home/${USER}/${REMOTE_BACKEND_DIR}/
  if ($LASTEXITCODE -ne 0) { throw "Backend upload failed (scp exit $LASTEXITCODE)." }

  # 5. Extract and Restart on Server
  Write-Host "Extracting files and restarting application on server..."
  $REMOTE_COMMAND = "cd /home/$USER/$REMOTE_FRONTEND_DIR && echo '--- Extracting Frontend ---' && unzip -o frontend.zip; echo 'Frontend extracted.'; rm frontend.zip && cd /home/$USER/$REMOTE_BACKEND_DIR && echo '--- Extracting Backend ---' && if [ -d 'uploads' ]; then rm -rf ../uploads_backup && mv uploads ../uploads_backup; fi && if [ -d 'forms-upload' ]; then rm -rf ../forms-upload_backup && mv forms-upload ../forms-upload_backup; fi && echo 'Extracting backend.zip...' && unzip -o backend.zip; echo 'Backend extracted.' && if [ -d '../uploads_backup' ]; then rm -rf uploads && mv ../uploads_backup uploads; fi && if [ -d '../forms-upload_backup' ]; then rm -rf forms-upload && mv ../forms-upload_backup forms-upload; fi && mkdir -p uploads/marks forms-upload && rm -f backend.zip && echo '--- Restarting Node.js ---' && mkdir -p tmp && touch tmp/restart.txt && echo '--- Server Tasks Done ---'"
  ssh -i $SSH_KEY -p $SSH_PORT -o ConnectTimeout=12 -o StrictHostKeyChecking=no ${USER}@${HOST_NAME} $REMOTE_COMMAND
  if ($LASTEXITCODE -ne 0) { throw "Remote extract/restart failed (ssh exit $LASTEXITCODE)." }

  Write-Host "Deployment Complete! Please clear your browser cache and refresh."
}
finally {
  if (Test-Path "deploy_tmp") {
    Remove-Item -Recurse -Force deploy_tmp
  }
}
