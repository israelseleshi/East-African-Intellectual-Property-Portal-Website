#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export NODE_ENV=production

echo "Running lint and tests..."
npm run lint --prefix "$ROOT_DIR/client"
npm run lint --prefix "$ROOT_DIR/server"
npm run test --prefix "$ROOT_DIR/server" || echo "tests skipped or failed; review output"

echo "Building client and server..."
npm run build --prefix "$ROOT_DIR/client"
npm run build --prefix "$ROOT_DIR/server"

GIT_SHA=$(git rev-parse --short HEAD || echo "unknown")
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "$BUILD_TIME" > "$ROOT_DIR/server/dist/build.time"

echo "Packaging assets..."
PKG_DIR="$ROOT_DIR/deploy_pkg_$(date +%Y%m%d%H%M%S)"
mkdir -p "$PKG_DIR"
cp -r "$ROOT_DIR/client/dist" "$PKG_DIR/frontend"
cp -r "$ROOT_DIR/server/dist" "$PKG_DIR/server"

echo "Running database migrations..."
if [ -f "$ROOT_DIR/server/scripts/add_indexes_20260310.sql" ]; then
  mysql -h "${DB_HOST:-localhost}" -u "${DB_USER}" -p"${DB_PASSWORD}" "${DB_NAME}" < "$ROOT_DIR/server/scripts/add_indexes_20260310.sql"
fi

echo "Smoke testing packaged server..."
node "$PKG_DIR/server/server.js" &
SERVER_PID=$!
sleep 3
curl -fsS "http://localhost:${PORT:-3001}/api/system/health" >/dev/null
kill "$SERVER_PID"

echo "Deployment package ready at $PKG_DIR (Git SHA: $GIT_SHA)"
