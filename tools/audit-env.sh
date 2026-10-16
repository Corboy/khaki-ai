#!/usr/bin/env bash
#
# audit-env.sh — prepared or refuse.
#
# The audit suite silently needs three things that were written down nowhere:
#
#   1. a production build in `.next`        — audit:classes, audit:css
#   2. Chrome with CDP on :9222             — audit:a11y, audit:layout
#   3. a server on :3100                    — audit:answers, simulate:clients
#
# Run without them, six of the twelve audits die with `ECONNREFUSED` or
# "Hakuna CSS iliyojengwa". That reads like a broken suite, and the natural
# response — skip it, run it "later" — is how a gate stops being a gate.
#
# This script brings up whatever is missing, runs all twelve, and prints one
# table. A missing prerequisite is named; it is never surfaced as a stack trace.
#
# Two rules it enforces rather than documents:
#
#   · NEVER build while `next dev` is running. A build replaces `.next` under
#     the dev server and the app appears to lose its composer entirely. The
#     symptoms look nothing like a build race.
#   · Verify against `next start`, never `next dev`. React 19's dev hydration
#     drops `metadata`-export tags, so the dev server fails an SEO audit that
#     production passes. Auditing dev produces false findings.

set -uo pipefail

cd "$(dirname "$0")/.." || exit 1

PROD_PORT="${PROD_PORT:-3100}"
CDP_PORT="${CDP_PORT:-9222}"
CHROME_PROFILE="${TMPDIR:-/tmp}/khaki-audit-chrome"
CHROME_BIN="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

PROD_PID=""
CHROME_PID=""
STARTED_PROD=0
STARTED_CHROME=0

cleanup() {
  [ "$STARTED_PROD" = "1" ] && [ -n "$PROD_PID" ] && kill "$PROD_PID" 2>/dev/null
  [ "$STARTED_CHROME" = "1" ] && [ -n "$CHROME_PID" ] && kill "$CHROME_PID" 2>/dev/null
  return 0
}
trap cleanup EXIT INT TERM

say() { printf '%s\n' "$*"; }
rule() { printf '─%.0s' $(seq 1 68); printf '\n'; }

port_open() { lsof -iTCP:"$1" -sTCP:LISTEN -n -P >/dev/null 2>&1; }

wait_for() { # port, seconds, label
  local port="$1" limit="$2" label="$3" waited=0
  while [ "$waited" -lt "$limit" ]; do
    curl -s -o /dev/null --max-time 3 "http://127.0.0.1:${port}/" && return 0
    sleep 2
    waited=$((waited + 2))
  done
  say "  ✗ ${label} did not answer on :${port} after ${limit}s"
  return 1
}

say ""
say "Khaki AI — audit gate"
rule

# ---------------------------------------------------------------------------
# 1. A dev server must not be running.
# ---------------------------------------------------------------------------
if port_open 3000; then
  say "  ✗ :3000 has a dev server running."
  say "    Stop it first — a production build replaces .next underneath it."
  say "      pkill -f 'next dev'"
  exit 1
fi
say "  ✓ no dev server on :3000"

# ---------------------------------------------------------------------------
# 2. Production build. Stale means a stale audit, so BUILD_ID age is checked.
# ---------------------------------------------------------------------------
NEEDS_BUILD=0
if [ ! -f .next/BUILD_ID ]; then
  NEEDS_BUILD=1
else
  # Any source file newer than the build means the build no longer describes it.
  if [ -n "$(find src tailwind.config.ts -newer .next/BUILD_ID -type f -print -quit 2>/dev/null)" ]; then
    say "  ! source is newer than the last build — rebuilding"
    NEEDS_BUILD=1
  fi
fi

if [ "$NEEDS_BUILD" = "1" ]; then
  say "  · building…"
  if ! pnpm build >/tmp/khaki-audit-build.log 2>&1; then
    say "  ✗ build failed — see /tmp/khaki-audit-build.log"
    tail -20 /tmp/khaki-audit-build.log
    exit 1
  fi
  say "  ✓ build fresh  ($(stat -f '%Sm' -t '%H:%M:%S' .next/BUILD_ID 2>/dev/null || echo '?'))"
else
  say "  ✓ build is newer than every source file"
fi

# ---------------------------------------------------------------------------
# 3. Production server on :3100.
# ---------------------------------------------------------------------------
if port_open "$PROD_PORT"; then
  say "  ✓ server already on :${PROD_PORT}"
else
  say "  · starting production server on :${PROD_PORT}…"
  PORT="$PROD_PORT" pnpm start >/tmp/khaki-audit-prod.log 2>&1 &
  PROD_PID=$!
  STARTED_PROD=1
  wait_for "$PROD_PORT" 60 "production server" || exit 1
  say "  ✓ server on :${PROD_PORT}  (pid ${PROD_PID})"
fi

# ---------------------------------------------------------------------------
# 4. Chrome with CDP, on an isolated profile.
# ---------------------------------------------------------------------------
# A throwaway profile, never the user's: this must not disturb a browser they
# are working in, and cleanup kills only the instance it started.
if curl -s --max-time 3 "http://127.0.0.1:${CDP_PORT}/json/version" >/dev/null 2>&1; then
  say "  ✓ CDP already on :${CDP_PORT}"
else
  if [ ! -x "$CHROME_BIN" ]; then
    say "  ✗ Chrome not found at ${CHROME_BIN}"
    exit 1
  fi
  say "  · starting headless Chrome with CDP on :${CDP_PORT}…"
  rm -rf "$CHROME_PROFILE"
  mkdir -p "$CHROME_PROFILE"
  "$CHROME_BIN" \
    --remote-debugging-port="$CDP_PORT" \
    --user-data-dir="$CHROME_PROFILE" \
    --no-first-run --no-default-browser-check \
    --headless=new --window-size=1440,900 \
    about:blank >/tmp/khaki-audit-chrome.log 2>&1 &
  CHROME_PID=$!
  STARTED_CHROME=1
  for _ in $(seq 1 15); do
    curl -s --max-time 3 "http://127.0.0.1:${CDP_PORT}/json/version" >/dev/null 2>&1 && break
    sleep 1
  done
  if ! curl -s --max-time 3 "http://127.0.0.1:${CDP_PORT}/json/version" >/dev/null 2>&1; then
    say "  ✗ Chrome did not expose CDP on :${CDP_PORT}"
    exit 1
  fi
  say "  ✓ CDP on :${CDP_PORT}  (pid ${CHROME_PID})"
fi

rule
say "  running audits"
rule

# ---------------------------------------------------------------------------
# 5. Every audit, judged by its EXIT CODE.
# ---------------------------------------------------------------------------
# Not by grepping the output for "PASS".
#
# That was the first version, and it was wrong in both directions: three audits
# that print a tick but never the word "PASS" (audit:classes, audit:css,
# audit:studio) were reported as failures, while simulate:clients exited 1 and
# was reported as a pass because its output happened to contain a ✓. A gate
# that mis-reports in both directions is worse than no gate.
#
# Exit code is the contract these tools already honour.
AUDITS=(
  audit:classes audit:css audit:a11y audit:layout audit:studio
  audit:readme audit:deps audit:assets audit:env audit:dead
  audit:encoding audit:answers simulate:clients
)

PASSED=0
FAILED=0
FAILED_NAMES=()

for audit in "${AUDITS[@]}"; do
  out="$(pnpm "$audit" 2>&1)"
  code=$?

  if [ "$code" -eq 0 ]; then
    printf '  ✓ %-18s\n' "$audit"
    PASSED=$((PASSED + 1))
  else
    printf '  ✗ %-18s  (exit %s)\n' "$audit" "$code"
    # Enough context to act on, not the whole transcript.
    printf '%s\n' "$out" | grep -vE '^\s*$' | tail -10 | sed 's/^/      /'
    FAILED=$((FAILED + 1))
    FAILED_NAMES+=("$audit")
  fi
done

rule
if [ "$FAILED" -eq 0 ]; then
  say "  PASS — ${PASSED} audits, no failures"
  say ""
  exit 0
fi

say "  FAIL — ${PASSED} passed, ${FAILED} failed"
for name in "${FAILED_NAMES[@]}"; do say "    · ${name}"; done
say ""
exit 1
