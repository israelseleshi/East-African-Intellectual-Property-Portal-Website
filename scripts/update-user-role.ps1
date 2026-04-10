# update-user-role.ps1
# Generates a safe SQL migration file for role enum updates.
# No credentials are embedded in this script.

$ErrorActionPreference = "Stop"

$sqlContent = @"
ALTER TABLE users MODIFY COLUMN role ENUM('SUPER_ADMIN', 'ADMIN') DEFAULT 'ADMIN';
SELECT role, COUNT(*) AS count FROM users GROUP BY role;
"@

$outputFile = "temp_update_role.sql"
$sqlContent | Out-File -FilePath $outputFile -Encoding UTF8

Write-Host "SQL file created: $outputFile"
Write-Host ""
Write-Host "Next steps (manual, secure):"
Write-Host "1) Copy file to your server with your own SSH settings and key"
Write-Host "2) Run mysql import using env vars or prompt-based password entry"
Write-Host ""
Write-Host "Example (adjust to your environment):"
Write-Host "scp -P `$env:TPMS_SSH_PORT -i `$env:TPMS_SSH_KEY $outputFile `$env:TPMS_SSH_USER@`$env:TPMS_SSH_HOST:/home/`$env:TPMS_SSH_USER/"
Write-Host "ssh -i `$env:TPMS_SSH_KEY -p `$env:TPMS_SSH_PORT `$env:TPMS_SSH_USER@`$env:TPMS_SSH_HOST \"mysql -u `$env:TPMS_DB_USER -p `$env:TPMS_DB_NAME < /home/`$env:TPMS_SSH_USER/$outputFile\""
