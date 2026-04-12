# get-db-schema.ps1 - Fetch MySQL schema over SSH safely
# Requires environment variables (no hardcoded secrets):
#   TPMS_SSH_USER, TPMS_SSH_HOST, TPMS_SSH_PORT, TPMS_SSH_KEY
#   TPMS_DB_USER, TPMS_DB_PASS, TPMS_DB_NAME

$ErrorActionPreference = "Stop"

$USER = $env:TPMS_SSH_USER
$HOST_NAME = $env:TPMS_SSH_HOST
$SSH_PORT = if ($env:TPMS_SSH_PORT) { $env:TPMS_SSH_PORT } else { "22" }
$SSH_KEY = $env:TPMS_SSH_KEY

$DB_USER = $env:TPMS_DB_USER
$DB_PASS = $env:TPMS_DB_PASS
$DB_NAME = $env:TPMS_DB_NAME

$required = @{
  TPMS_SSH_USER = $USER
  TPMS_SSH_HOST = $HOST_NAME
  TPMS_SSH_KEY  = $SSH_KEY
  TPMS_DB_USER  = $DB_USER
  TPMS_DB_PASS  = $DB_PASS
  TPMS_DB_NAME  = $DB_NAME
}

foreach ($kv in $required.GetEnumerator()) {
  if ([string]::IsNullOrWhiteSpace($kv.Value)) {
    throw "Missing required environment variable: $($kv.Key)"
  }
}

if (-not (Test-Path $SSH_KEY)) {
  throw "SSH key not found at: $SSH_KEY"
}

Write-Host "Fetching database schema from $DB_NAME ..."

$showTablesCmd = "mysql -u $DB_USER -p$DB_PASS $DB_NAME -e 'SHOW TABLES'"
$tablesRaw = ssh -i $SSH_KEY -p $SSH_PORT -o ConnectTimeout=12 -o StrictHostKeyChecking=no ${USER}@${HOST_NAME} $showTablesCmd

$tableList = $tablesRaw -split "`n" | Where-Object { $_ -and $_ -notmatch "^Tables_in_" } | ForEach-Object { $_.Trim() }

$schemaJson = @{
  database = $DB_NAME
  tables = @()
}

foreach ($table in $tableList) {
  if ([string]::IsNullOrWhiteSpace($table)) { continue }
  Write-Host "Reading table: $table"
  $describeCmd = "mysql -u $DB_USER -p$DB_PASS $DB_NAME -e 'DESCRIBE $table'"
  $descRaw = ssh -i $SSH_KEY -p $SSH_PORT -o ConnectTimeout=12 -o StrictHostKeyChecking=no ${USER}@${HOST_NAME} $describeCmd

  $columns = @()
  $lines = $descRaw -split "`n" | Select-Object -Skip 1
  foreach ($line in $lines) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $parts = $line -split "`t"
    if ($parts.Count -ge 4) {
      $columns += @{
        Field = $parts[0]
        Type = $parts[1]
        Null = $parts[2]
        Key = $parts[3]
        Default = if ($parts.Count -ge 5 -and $parts[4] -ne "NULL") { $parts[4] } else { $null }
        Extra = if ($parts.Count -ge 6) { $parts[5] } else { $null }
      }
    }
  }

  $schemaJson.tables += @{
    name = $table
    columns = $columns
  }
}

$projectRoot = Split-Path $PSScriptRoot -Parent
$jsonPath = Join-Path $projectRoot "docs\database_schema.json"
$schemaJson | ConvertTo-Json -Depth 12 | Out-File -FilePath $jsonPath -Encoding UTF8

Write-Host "Schema saved to: $jsonPath"
