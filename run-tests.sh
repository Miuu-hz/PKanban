#!/usr/bin/env bash
# Run all tests across all subprojects
# Usage: bash run-tests.sh [--coverage]

set -euo pipefail

COVERAGE=${1:-}
PASS=0
FAIL=0

run_tests() {
  local dir=$1
  local name=$2
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  🧪 $name"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  cd "$dir"
  if npm install --silent 2>/dev/null && npm run test${COVERAGE:+:coverage} 2>&1; then
    PASS=$((PASS + 1))
    echo "  ✅ $name — PASSED"
  else
    FAIL=$((FAIL + 1))
    echo "  ❌ $name — FAILED"
  fi
  cd -
}

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

run_tests "$SCRIPT_DIR/bff"          "BFF Service Tests"
run_tests "$SCRIPT_DIR/liff-app"     "LIFF App Tests"
run_tests "$SCRIPT_DIR/mcp-kanban"   "MCP Server Tests"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Results: $PASS passed, $FAIL failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
[ "$FAIL" -eq 0 ]
