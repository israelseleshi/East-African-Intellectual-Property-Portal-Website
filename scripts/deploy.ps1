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
npm install --legacy-peer-deps
npm run build
Set-Location ..

# 2. Build Server
Write-Host "Building Backend..."
Set-Location server
npm install --legacy-peer-deps
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
# dist/server.js is the canonical runtime entry. Keep a fallback for legacy wrapper if present.
if (Test-Path "server.js.temp") {
  Copy-Item -Path "server.js.temp" -Destination "deploy_tmp/backend/server.js"
}
# Ensure we don't package local uploads
if (Test-Path "deploy_tmp/backend/uploads") { Remove-Item -Recurse -Force "deploy_tmp/backend/uploads" }
Compress-Archive -Path "deploy_tmp/frontend/*" -DestinationPath "deploy_tmp/frontend.zip" -Force
Compress-Archive -Path "deploy_tmp/backend/*" -DestinationPath "deploy_tmp/backend.zip" -Force

# 4. Upload to Server
Write-Host "Uploading to server using SSH key..."
$SSH_KEY = "C:\Users\El-Hadar-06\.ssh\id_ed25519_pavillion"
scp -i $SSH_KEY -P $SSH_PORT -o StrictHostKeyChecking=no deploy_tmp/frontend.zip ${USER}@${HOST_NAME}:/home/${USER}/${REMOTE_FRONTEND_DIR}/
scp -i $SSH_KEY -P $SSH_PORT -o StrictHostKeyChecking=no deploy_tmp/backend.zip ${USER}@${HOST_NAME}:/home/${USER}/${REMOTE_BACKEND_DIR}/

# 5. Extract and Restart on Server
Write-Host "Extracting files and restarting application on server..."
$REMOTE_COMMAND = "cd /home/$USER/$REMOTE_FRONTEND_DIR && echo '--- Extracting Frontend ---' && unzip -o frontend.zip; echo 'Frontend extracted.'; rm frontend.zip && cd /home/$USER/$REMOTE_BACKEND_DIR && echo '--- Extracting Backend ---' && if [ -d 'uploads' ]; then rm -rf ../uploads_backup && mv uploads ../uploads_backup; fi && if [ -d 'forms-upload' ]; then rm -rf ../forms-upload_backup && mv forms-upload ../forms-upload_backup; fi && echo 'Extracting backend.zip...' && unzip -o backend.zip; echo 'Backend extracted.' && if [ -d '../uploads_backup' ]; then rm -rf uploads && mv ../uploads_backup uploads; fi && if [ -d '../forms-upload_backup' ]; then rm -rf forms-upload && mv ../forms-upload_backup forms-upload; fi && rm -f backend.zip && echo '--- Restarting Node.js ---' && mkdir -p tmp && touch tmp/restart.txt && echo '--- Server Tasks Done ---'"
ssh -i $SSH_KEY -p $SSH_PORT -o StrictHostKeyChecking=no ${USER}@${HOST_NAME} $REMOTE_COMMAND

Write-Host "Deployment Complete! Please clear your browser cache and refresh."

# Cleanup local temp
Remove-Item -Recurse -Force deploy_tmp
