#!/usr/bin/env bash
set -euo pipefail

# ══════════════════════════════════════════════════════════════════════════════
# Intervista Platform — Health Check Script
# ══════════════════════════════════════════════════════════════════════════════
# Usage:
#   ./scripts/health-check.sh                 # Check localhost
#   ./scripts/health-check.sh http://1.2.3.4  # Check specific host
#
# Checks the Nginx /health endpoint and all backend health endpoints.
# Exit code 0 = all healthy, non-zero = number of failures.
# ══════════════════════════════════════════════════════════════════════════════

BASE_URL="${1:-http://localhost}"
FAILURES=0

check() {
    local name="$1"
    local url="$2"

    if curl -sf --max-time 5 "$url" >/dev/null 2>&1; then
        echo "  ✓  $name"
    else
        echo "  ✗  $name  ($url)"
        FAILURES=$((FAILURES + 1))
    fi
}

echo ""
echo "════════════════════════════════════════════════════════"
echo "  Intervista Platform — Health Check"
echo "════════════════════════════════════════════════════════"
echo ""

# ── Nginx entry point ─────────────────────────────────────────────────────
check "Nginx /health"              "$BASE_URL/health"

# ── Backend services through Nginx ────────────────────────────────────────
check "Coding Service"             "$BASE_URL/api/coding/health"
check "Interview Service"          "$BASE_URL/api/interview/health"

echo ""
echo "────────────────────────────────────────────────────────"
if [ "$FAILURES" -eq 0 ]; then
    echo "  Result: ALL CHECKS PASSED"
else
    echo "  Result: $FAILURES CHECK(S) FAILED"
fi
echo "────────────────────────────────────────────────────────"
echo ""

exit "$FAILURES"
