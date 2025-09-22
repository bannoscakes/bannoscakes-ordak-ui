#!/usr/bin/env bash
set -euo pipefail
if grep -R "@/mocks/rpc" src; then
  echo "❌ Found forbidden direct mocks imports. Use '@/lib/rpc' instead." >&2
  exit 1
fi
echo "✅ No direct mocks imports found."
