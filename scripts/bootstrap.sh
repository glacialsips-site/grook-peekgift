#!/usr/bin/env bash
# Keep the session build-ready. pnpm monorepo: apps/web (the Next app) + packages/core (the spine).
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"
if [ -f pnpm-workspace.yaml ] && [ ! -d node_modules ]; then
  echo "[bootstrap] pnpm install…"
  corepack enable >/dev/null 2>&1 || true
  pnpm install --frozen-lockfile || pnpm install || echo "[bootstrap] pnpm install failed (network policy?) — continuing"
fi
exit 0
