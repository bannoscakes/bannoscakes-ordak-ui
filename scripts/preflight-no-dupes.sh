#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

echo "[preflight] repo root: $ROOT"

# 1) Only one supabase dir allowed (the canonical one at $ROOT/supabase)
mapfile -t SUPA_DIRS < <(find "$ROOT" -maxdepth 2 -type d -name supabase -print)
for d in "${SUPA_DIRS[@]}"; do
  if [[ "$d" != "$ROOT/supabase" ]]; then
    rel="${d#$ROOT/}"
    # Any tracked files under this duplicate?
    if [[ -n "$(git ls-files -- "$rel/*")" ]]; then
      echo "[preflight] ERROR: Tracked files under duplicate '$rel'. Remove them with 'git rm -r \"$rel\"'."
      exit 1
    else
      echo "[preflight] Removing untracked duplicate supabase dir: $rel"
      rm -rf "$d"
    fi
  fi
done

# 2) No duplicate SQL files outside canonical path
DUPS=$(git ls-files | grep -E '(001_initial_schema\.sql|002_rls_and_views\.sql)' | grep -v '^supabase/sql/' || true)
if [[ -n "$DUPS" ]]; then
  echo "[preflight] ERROR: Duplicate tracked SQL outside supabase/sql:"
  echo "$DUPS"
  exit 1
fi

# 3) No nested repos/submodules from accidental drags
if [[ -d "$ROOT/bannoscakes-ordak-ui/.git" ]] || [[ -f "$ROOT/.gitmodules" ]]; then
  echo "[preflight] ERROR: Nested repo or .gitmodules detected. Clean it (remove nested folder and .gitmodules) before proceeding."
  exit 1
fi

echo "[preflight] OK — no duplicates."
