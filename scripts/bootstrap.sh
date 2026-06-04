#!/usr/bin/env bash
# Keep every session build-ready AND oriented. Idempotent; safe locally or in cloud.
# This is a pnpm monorepo (apps/web + packages/core) — use pnpm, never npm.
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

if [ -f pnpm-workspace.yaml ] && [ ! -d node_modules ]; then
  echo "[bootstrap] installing workspace deps (pnpm)…"
  corepack enable >/dev/null 2>&1 || true
  pnpm install --frozen-lockfile || pnpm install || echo "[bootstrap] pnpm install failed (network policy?) — continuing"
fi

# Orient a fresh session so it does NOT re-mine the repo or rebuild from scratch.
cat <<'EOF'
[bootstrap] peek.gift — in-site chat buildout.
  READ FIRST, in order: WAKEUP.md -> BUILDOUT-STATUS.md -> IN-SITE-CHAT-MASTER-PLAN.md. Then move the next step.
  Work branch: claude/in-site-chat-buildout (push here). Deploy: fast-forward claude/studio-vnext onto it.
  Do NOT rebuild from scratch -- that is the project's #1 failure mode. Build on the green baseline.
  Gates: pnpm --filter @peek/core test | pnpm --filter @peek/web test | pnpm --filter @peek/web typecheck |
         APP_URL=https://vnext.peek.gift pnpm --filter @peek/web build
EOF
exit 0
