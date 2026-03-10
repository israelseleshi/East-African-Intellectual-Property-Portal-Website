#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-}"
if [ -z "$TARGET_DIR" ]; then
  echo "Usage: rollback.sh <deploy_pkg_dir>"
  exit 1
fi

if [ ! -d "$TARGET_DIR" ]; then
  echo "Package directory not found: $TARGET_DIR"
  exit 1
fi

echo "Rolling back to package $TARGET_DIR"
cp -r "$TARGET_DIR/server" ./server/dist
cp -r "$TARGET_DIR/frontend" ./client/dist
echo "Rollback complete. Restart your process manager to serve restored build."
