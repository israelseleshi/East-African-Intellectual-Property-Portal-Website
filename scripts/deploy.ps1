# deploy.ps1 - One-Click Deployment for TPMS
# Usage: ./scripts/deploy.ps1

$USER = "falolega"
$HOST_NAME = "eastafricanip.com"
$SSH_PORT = "7822"
$REMOTE_FRONTEND_DIR = "eastafricanip.com"
$REMOTE_BACKEND_DIR = "eastafricanip.com/api"

Write-Host "Starting TPMS Deployment to $HOST_NAME..."

# 1. Build Client
Write-Host "Building Frontend..."
Set-Location client
npm install
npm run build
Set-Location ..

# 2. Build Server
Write-Host "Building Backend..."
Set-Location server
npm install
npm run build
Set-Location ..

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
Copy-Item -Path "server/.htaccess" -Destination "deploy_tmp/backend"
Copy-Item -Path "server/.env" -Destination "deploy_tmp/backend" -ErrorAction SilentlyContinue

# Zip them up
Compress-Archive -Path "deploy_tmp/frontend/*" -DestinationPath "deploy_tmp/frontend.zip" -Force
Compress-Archive -Path "deploy_tmp/backend/*" -DestinationPath "deploy_tmp/backend.zip" -Force

# 4. Upload to Server
Write-Host "Uploading to server..."
scp -P $SSH_PORT deploy_tmp/frontend.zip ${USER}@${HOST_NAME}:/home/${USER}/${REMOTE_FRONTEND_DIR}/
scp -P $SSH_PORT deploy_tmp/backend.zip ${USER}@${HOST_NAME}:/home/${USER}/${REMOTE_BACKEND_DIR}/

# 5. Extract on Server
Write-Host "Extracting on server..."
ssh -p $SSH_PORT ${USER}@${HOST_NAME} "cd /home/${USER}/${REMOTE_FRONTEND_DIR} ; unzip -o frontend.zip ; rm frontend.zip"
ssh -p $SSH_PORT ${USER}@${HOST_NAME} "cd /home/${USER}/${REMOTE_BACKEND_DIR} ; unzip -o backend.zip ; rm backend.zip"

# 6. Restart Node.js App
Write-Host "Restarting Node.js application..."
ssh -p $SSH_PORT ${USER}@${HOST_NAME} "mkdir -p /home/${USER}/${REMOTE_BACKEND_DIR}/tmp ; touch /home/${USER}/${REMOTE_BACKEND_DIR}/tmp/restart.txt"

Write-Host "Deployment Complete! Refresh your browser."

# Cleanup local temp
Remove-Item -Recurse -Force deploy_tmp
