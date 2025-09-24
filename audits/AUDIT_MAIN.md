# Main Audit Report — 2025-09-24T11:40:07Z

## HEAD
c425fe8

## Recent commits (last 30)
c425fe8 chore: remove src/mocks; real-only facade; harden guard; add guard test
1b5b32b Merge pull request #22 from bannoscakes/fix/queue-source-fallback
8c3b38f fix(rpc): robust fallback for QUEUE_SOURCE (empty → 'queue_view')
31bb002 chore(rpc): get_queue reads source from VITE_QUEUE_SOURCE (default 'queue_view')
29a6723 Merge pull request #19 from bannoscakes/feat/real-get_queue-supabase
8281a73 feat(rpc): real get_queue uses Supabase (safe fallback to []); chore(supabase): add minimal client
36139a5 Merge pull request #18 from bannoscakes/chore/real-get_queue-safe
5b153e5 chore(rpc): real get_queue returns [] placeholder (prevents crash on preview flip)
f719fc5 Merge pull request #17 from bannoscakes/chore/rpc-real-scaffold
14767c2 chore(rpc): scaffold real module with matching signatures; facade imports real (behavior unchanged while VITE_USE_MOCKS=true)
dd9bc9f Merge pull request #15 from bannoscakes/chore/dashboard-use-makeEmptyCounts
177763c chore(types): Dashboard uses makeEmptyCounts() for zeroed stage counters (no behavior change)
90b30b7 Merge pull request #14 from bannoscakes/chore/stage-helpers
3e34697 chore(types): add STAGES, STAGE_ORDER, makeEmptyCounts to shared stage helpers (no behavior change)
0e8015f Merge pull request #13 from bannoscakes/chore/dashboard-use-statsbystore
3f3b673 chore(types): Dashboard uses shared StatsByStore helper (no behavior change)
4ac5868 Merge pull request #12 from bannoscakes/chore/dashboardcontent-stats-type
ca58e4f chore(types): DashboardContent stats = StatsByStore (Record<Stage, number> per store)
9ec5372 Merge pull request #11 from bannoscakes/chore/flourlane-page-stage-type
613e022 chore(types): FlourlaneProductionPage stats = Record<Stage, number> (no behavior change)
63aa430 Merge pull request #10 from bannoscakes/chore/bannos-page-stage-type
ac891dc chore(types): BannosProductionPage stats = Record<Stage, number> (no behavior change)
443c4ef Merge pull request #8 from bannoscakes/test/no-mock-imports
7b2c81a test(guard): add vitest to block direct '@/mocks/rpc' imports (regex + self-exclude)
993e05b Merge pull request #7 from bannoscakes/chore/flourlane-monitor-stage-type
c4df000 chore(types): FlourlaneMonitorPage stats = Record<Stage, number>
949d50e chore(types): BannosMonitorPage stats = Record<Stage, number>
183556e chore(types): Dashboard uses shared Stage/StoreKey types (no behavior change)
753a027 Merge pull request #6 from bannoscakes/chore/shared-stage-type
f92c3ff chore(types): add shared Stage/StoreKey in src/types/stage.ts

## Mocks directory
NOT PRESENT

## References to '@/mocks/rpc' in src/
src/tests/no-mocks-guard.test.ts:9:  it("no '@/mocks/rpc' imports in src/", () => {
src/tests/no-mocks-guard.test.ts:11:      execSync(`grep -R "@/mocks/rpc" -n src`, { stdio: "pipe" });
src/tests/no-mocks-guard.test.ts:12:      throw new Error("Found '@/mocks/rpc' import");

## RPC facade files (recent changes)
c425fe8 chore: remove src/mocks; real-only facade; harden guard; add guard test
8c3b38f fix(rpc): robust fallback for QUEUE_SOURCE (empty → 'queue_view')
31bb002 chore(rpc): get_queue reads source from VITE_QUEUE_SOURCE (default 'queue_view')
8281a73 feat(rpc): real get_queue uses Supabase (safe fallback to []); chore(supabase): add minimal client
5b153e5 chore(rpc): real get_queue returns [] placeholder (prevents crash on preview flip)
14767c2 chore(rpc): scaffold real module with matching signatures; facade imports real (behavior unchanged while VITE_USE_MOCKS=true)
c94a6de chore(ts): restore nocheck on Dashboard; refactor(rpc): type forwarders with Parameters<>
e9bb79c refactor(rpc): switchable facade via config.useMocks; docs(changelog): dedupe sanity-test entry
03ab00e refactor(rpc): gate facade by config.useMocks (no behavior change)
091101e refactor(components): route StaffWorkspacePage to neutral RPC facade; docs(changelog): note change
2d9d5fa feat(rpc): add neutral RPC facade delegating to mocks; docs(changelog): add entry
1ac6a28 feat(rpc): add neutral RPC facade delegating to mocks

## Supabase files
-rw-r--r--@ 1 panospanayi  staff  421 Sep 24 08:19 src/lib/supabase.ts

### Supabase SQL
total 8
drwxr-xr-x@ 3 panospanayi  staff   96 Sep 24 20:02 .
drwxr-xr-x@ 4 panospanayi  staff  128 Sep 24 20:02 ..
-rw-r--r--@ 1 panospanayi  staff   77 Sep 24 20:29 001_initial_schema.sql

## Guard scripts & tests
-rwxr-xr-x@ 1 panospanayi  staff  329 Sep 24 20:29 scripts/guard-rpc.sh
 - total 8
 - drwxr-xr-x@  3 panospanayi  staff   96 Sep 24 20:05 .
 - drwxr-xr-x@ 17 panospanayi  staff  544 Sep 24 20:05 ..
 - -rw-r--r--@  1 panospanayi  staff  609 Sep 24 20:29 no-mocks-guard.test.ts

## Vercel config
vercel.json: missing

## Docs changed in last 30 commits
  M	CHANGELOG.md
  A	audits/AUDIT_MAIN.md
  A	docs/FLIP_TO_REAL_RPC.md
  M	scripts/guard-rpc.sh
  M	src/lib/rpc.real.ts
  M	src/lib/rpc.ts
  D	src/mocks/mock-data.ts
  D	src/mocks/rpc.ts
  D	src/tests/no-mock-imports.test.ts
  A	src/tests/no-mocks-guard.test.ts
  A	supabase/README.md
  A	supabase/sql/001_initial_schema.sql
  M	CHANGELOG.md
  M	src/lib/rpc.real.ts
  M	CHANGELOG.md
  M	src/lib/rpc.real.ts
  M	CHANGELOG.md
  M	package-lock.json
  M	package.json
  M	src/lib/rpc.real.ts
  A	src/lib/supabase.ts
  M	CHANGELOG.md
  M	src/lib/rpc.real.ts
  M	CHANGELOG.md
  A	src/lib/rpc.real.ts
  M	src/lib/rpc.ts
  M	CHANGELOG.md
  M	src/components/Dashboard.tsx
  M	CHANGELOG.md
  M	src/types/stage.ts
  M	CHANGELOG.md
  M	src/components/Dashboard.tsx
  M	CHANGELOG.md
  M	src/components/DashboardContent.tsx
  M	src/types/stage.ts
  M	CHANGELOG.md
  M	src/components/FlourlaneProductionPage.tsx
  M	CHANGELOG.md
  M	src/components/BannosProductionPage.tsx
  M	CHANGELOG.md
  A	src/tests/no-mock-imports.test.ts
  M	CHANGELOG.md
  M	src/components/FlourlaneMonitorPage.tsx
  M	CHANGELOG.md
  M	src/components/BannosMonitorPage.tsx
  M	CHANGELOG.md
  M	src/components/Dashboard.tsx
  M	CHANGELOG.md
  A	src/types/stage.ts
