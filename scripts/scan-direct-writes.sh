#!/usr/bin/env bash
set -euo pipefail
# allowlist any data loader files if needed by adding `--invert-match -e 'allowed-path'`
if git grep -nE "\.from\(['\"][a-zA-Z0-9_]+['\"]\)\.(insert|update|delete)\(" -- 'src/**.ts' 'src/**.tsx' >/dev/null; then
  echo "❌ Direct table writes found in src/. Use RPCs only."
  git grep -nE "\.from\(['\"][a-zA-Z0-9_]+['\"]\)\.(insert|update|delete)\(" -- 'src/**.ts' 'src/**.tsx'
  exit 1
fi
echo "✅ No direct writes detected."

