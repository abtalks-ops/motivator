#!/usr/bin/env bash
# Stop hook: before Claude reports a task as done, make sure types, lint and unit tests pass.
# Skips when nothing under src/, e2e/ or config files changed, to keep chat-only turns fast.
# Exit code 2 sends the failure back to Claude so it fixes it instead of stopping.
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}" || exit 0

input="$(cat)"
# Avoid loops: if this stop was already triggered by a previous hook failure, let it through.
if printf '%s' "$input" | grep -q '"stop_hook_active": *true'; then exit 0; fi

[ -d node_modules ] || exit 0
changed="$(git status --porcelain -- src e2e '*.config.ts' 'tsconfig*.json' package.json 2>/dev/null)"
[ -n "$changed" ] || exit 0

if ! out="$(npm run --silent typecheck 2>&1 && npm run --silent lint 2>&1 && npm run --silent test 2>&1)"; then
  printf 'Checks failed. Fix these before finishing:\n%s\n' "$(printf '%s' "$out" | tail -40)" >&2
  exit 2
fi
exit 0
