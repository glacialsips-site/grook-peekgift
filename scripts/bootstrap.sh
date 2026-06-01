#!/usr/bin/env bash
# Keep every session build-ready. Idempotent; safe to run locally or in cloud.
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

if [ -f package.json ] && [ ! -d node_modules ]; then
  echo "[bootstrap] installing dependencies"
  npm install || echo "[bootstrap] npm install failed (network policy?) — continuing"
fi

exit 0
