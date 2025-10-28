#!/usr/bin/env bash
set -euo pipefail

# search only frontend code; ignore tests and supabase code
if git grep -nI \
  -E "\.from\s*\(\s*['\"][A-Za-z0-9_]+['\"]\s*\)\s*\.\s*(insert|update|delete)\s*\(" \
  -- 'src/**/*.ts' 'src/**/*.tsx' ':!src/**/__tests__/**' ':!supabase/**' >/dev/null
then
  echo "❌ Direct table writes found (use SECURITY DEFINER RPCs only):"
  git grep -nI -E "\.from\s*\(\s*['\"][A-Za-z0-9_]+['\"]\s*\)\s*\.\s*(insert|update|delete)\s*\(" \
    -- 'src/**/*.ts' 'src/**/*.tsx' ':!src/**/__tests__/**' ':!supabase/**'
  exit 1
fi

echo "✅ No direct writes detected."