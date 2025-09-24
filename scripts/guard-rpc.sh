#!/usr/bin/env bash
set -euo pipefail
if [ -d src/mocks ]; then
  echo "❌ src/mocks/ must not exist." >&2
  exit 1
fi
if grep -R "from\s*['\"]@/mocks/rpc['\"]" src >/dev/null 2>&1; then
  echo "❌ Found direct '@/mocks/rpc' imports in src/." >&2
  grep -R "from\s*['\"]@/mocks/rpc['\"]" -n src
  exit 1
fi
echo "✅ Guard OK."