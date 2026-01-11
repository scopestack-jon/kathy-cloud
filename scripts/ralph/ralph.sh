#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAX_ITERATIONS="${1:-10}"

echo "🤖 Starting Ralph..."
echo "   Script directory: $SCRIPT_DIR"
echo "   Max iterations: $MAX_ITERATIONS"

cd "$SCRIPT_DIR/../.."
npx tsx "$SCRIPT_DIR/ralph.ts" "$MAX_ITERATIONS"
