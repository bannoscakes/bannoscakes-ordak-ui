# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),  
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]
### Added
- docs: `docs/DEPLOY_STAGING.md` — staging deployment checklist for Vercel + Railway
- chore(husky): add pre-commit guard to prevent direct `@/mocks/rpc` imports
- chore(ci): enforce `guard:rpc` in PR checks
- chore(guard): add `guard:rpc` script to block direct `@/mocks/rpc` imports
- Initial CHANGELOG.md file  
- Release process documented in [README.md](README.md)  
- Placeholder for upcoming features and fixes  
- docs: `docs/CURSOR_RULES.md` — Cursor project guardrails for safe, incremental changes.
- docs: `docs/RULES_SANITY_TEST.md` — sanity test confirming rules are active (no code changes).
- feat: `src/lib/config.ts` — central VITE_* env config helper.
- feat: `src/lib/rpc.ts` — neutral RPC facade delegating to mocks.
- chore(env): add `VITE_USE_MOCKS=true` to `.env.local` (toggle for RPC facade; default on).
- docs(env): add `.env.example` (commit-safe template for local setup).

### Changed
- chore(types): re-enable TS on Dashboard (remove nocheck; begin incremental fixes)
- chore(types): type Dashboard stage counters (guarded string index; no behavior change)
- chore(types): add optional `onRefresh` to Header props (no behavior change)
- chore(types): add optional `stats`/`onRefresh` to DashboardContent props (no behavior change)
- chore(types): allow optional `stats` on FlourlaneMonitorPage props (no behavior change)
- chore(types): allow optional `stats` on BannosMonitorPage props (no behavior change)
- chore(types): allow stats/initialFilter/onRefresh on FlourlaneProductionPage props (no behavior change)
- chore(types): add optional `stats` (and `initialFilter`/`onRefresh`) to BannosProductionPage props (no behavior change)
- chore(types): type Dashboard stage counters (fix string-index error; no behavior change)
- refactor(scanner): route one scanner file to `src/lib/rpc` (neutral facade, no behavior change).
- refactor(orders): route `UnassignedStations` to `src/lib/rpc` (neutral facade, no behavior change).
- refactor(components): route `StaffWorkspacePage` to `src/lib/rpc` (neutral facade, no behavior change).
- refactor(components): route `Dashboard` to `src/lib/rpc` (neutral facade, no behavior change).

---

## [0.1.0] - 2025-09-14
### Added
- chore(guard): add `guard:rpc` script to block direct `@/mocks/rpc` imports
- Complete production-ready `README.md` with:
  - Quick Start, Environment Setup, Emergency Procedures
  - Database management and migration steps
  - Scripts section with dev/build/test commands
  - Development workflow (Cursor + Git branches)
  - Documentation index linking `/docs/*`
  - Deployment process and testing levels
  - Release process (versioning, tagging, changelog)
  - Performance targets and monitoring setup
  - Troubleshooting section
  - Screenshots & diagrams references
  - Quality & security practices
- Core diagrams generated:
  - `branch-flow.png`
  - `system-overview.png`
  - `table-site-map.png`
- Documentation suite under `/docs/` completed

---

## [0.0.1] - 2025-09-01
### Added
- chore(guard): add `guard:rpc` script to block direct `@/mocks/rpc` imports
- Repository initialized  
- Basic project scaffolding  
- `.env.example` created  
- Initial Supabase + Vite integration  

---

[Unreleased]: https://github.com/<your-org>/<your-repo>/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/<your-org>/<your-repo>/releases/tag/v0.1.0
[0.0.1]: https://github.com/<your-org>/<your-repo>/releases/tag/v0.0.1
