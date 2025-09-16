# Ordak v2 – Production Management System

Production management for **Bannos** & **Flourlane** cake stores — **React + Vite + TypeScript** frontend with **Supabase** (Postgres + Auth + RLS + Edge Functions) backend.

![Build Status](https://img.shields.io/badge/build-passing-green)
![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![License](https://img.shields.io/badge/license-private-red)

---

## 📚 Docs Index

- [Overview](docs/overview.md)
- [Schema & RLS](docs/schema-and-rls.md)
- [RPC Surface](docs/rpc-surface.md)
- [Data Flows](docs/data-flows.md)
- [UI Site Map](docs/ui-site-map.md)
- [Operations](docs/operations.md)
- [Runbook (Incidents)](docs/runbook.md)
- [Testing](docs/testing.md)
- [Migration Order](docs/migration-order.md)
- [Performance SLAs](docs/performance-slas.md)
- [Checklists](docs/checklists.md)
- [Onboarding](docs/onboarding.md)
- [Backup & Recovery](docs/backup-recovery.md)
- [References (Official Docs)](docs/references.md)
- Diagrams: [`docs/diagrams/`](docs/diagrams/)

---

## 📦 Project Status

- **Version:** 0.1.0  
- **Node:** >=18  
- **Framework:** React + Vite + TypeScript  
- **Backend:** Supabase (DB + RPC + Edge Functions)  
- **Docs:** `/docs` contains full specs & runbooks  
- **CI/CD:** GitHub Actions (tests + migrations must pass before merge)  
- **Hosting:** Vercel (frontend) + Supabase (backend + database)

---

## 🚀 Quick Start

```bash
# Clone and setup
git clone <repo-url>
cd ordak-v2
npm install
cp .env.example .env.local

# Start development
npm run dev
Local server: http://localhost:5173

⚙️ Environment Setup
Copy .env.example to .env.local and fill values.

Frontend (.env.local)

ini
Copy code
VITE_SUPABASE_URL=https://[PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
VITE_APP_URL=http://localhost:5173
Edge (Supabase secrets / local .env)

ini
Copy code
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_ROLE]
SHOPIFY_BANNOS_TOKEN=[ADMIN_API_TOKEN]
SHOPIFY_FLOURLANE_TOKEN=[ADMIN_API_TOKEN]
SHOPIFY_WEBHOOK_SECRET=[WEBHOOK_HMAC_SECRET]
SLACK_WEBHOOK_URL=[SLACK_WEBHOOK]
See docs/environment.md for details.

🚨 Emergency Procedures
Prod down → see docs/runbook.md

Rollback:

bash
Copy code
git revert HEAD
npm run deploy:prod
Contact: add your on-call / Slack

Backups: Daily PITR (7 days). See docs/backup-recovery.md.

🗄️ Database Management
bash
Copy code
# Run migrations
npx supabase migration up

# Create new migration
npx supabase migration new <name>

# Reset dev database (dev only)
npx supabase db reset
See docs/migration-order.md for sequence.

📜 Scripts
npm run dev — start development server

npm run build — production build

npm run test — run test suite

npm run lint — code quality check

npm run type-check — TypeScript validation

npm run migrate — run DB migrations

npm run deploy:staging — deploy to staging (placeholder)

npm run deploy:prod — deploy to production (placeholder)

🛠️ Development Workflow
We use Cursor as the IDE. Always add /docs as Context so development aligns with business rules.

Branch Strategy

main — Production only (protected)

dev — Integration branch (default)

feature/* — Short-lived, merged into dev via PR

mermaid
Copy code
gitGraph
  commit id: "init"
  branch dev
  commit id: "dev work"
  branch feature/xyz
  commit id: "feature"
  checkout dev
  merge feature/xyz
  commit id: "tested"
  checkout main
  merge dev
📖 Documentation
overview.md — High-level description

schema-and-rls.md — Database schema + RLS

rpc-surface.md — API (RPCs)

migration-order.md — Build sequence

ui-site-map.md — Route map

operations.md — Deployment & runbooks

testing.md — Testing levels & flows

backup-recovery.md — Disaster recovery

performance-slas.md — SLAs & metrics

onboarding.md — New developer guide

checklists.md — Release + QA + smoke

diagrams/ — PNG + Mermaid sources

🚢 Deployment
See docs/operations.md. Quick deploy:

bash
Copy code
npm run build
npm run deploy:prod
✅ Testing
bash
Copy code
npm test           # all tests
# (optional shortcuts if added)
# npm run test:unit
# npm run test:e2e
CI blocks merges if migrations or tests fail.

📋 Release Process
bash
Copy code
# Generate/append changelog, bump version, tag + push
npm run release:patch   # or release:minor | release:major
# — or —
./scripts/release.sh patch
Tag and release are handled via GitHub Actions (see .github/workflows/release.yml).

📊 Performance Targets
Queue load: p95 < 200ms

Order creation: p95 < 500ms

Inventory sync push: p95 < 2s

Uptime: 99.9%

🔧 Common Issues
Tailwind v4 → see docs/checklists.md

Supabase auth/connection → verify anon & service_role keys

Build fails → rm -rf node_modules && npm install

Webhooks not firing → confirm tokens + HMAC secret

👨‍💻 Onboarding Developers
Quick start:

bash
Copy code
git clone <repo-url>
cd ordak-v2
npm install
cp .env.example .env.local
npm run dev
🖼️ Diagrams
Static images + Mermaid sources live in docs/diagrams/:

Branch Flow — branch-flow.mmd/.png

System Overview — system-overview.mmd/.png + system-overview-detailed.mmd/.png

Table Site Map — table-site-map.mmd/.png

UI Site Map — ui-site-map.mmd/.png

Order Lifecycle — order-lifecycle.mmd/.png

Inventory Sync — inventory-sync-flow.mmd/.png

Error Monitoring — error-monitoring.mmd/.png

RLS Access Model — rls-access.mmd/.png

Stage State Machine — stage-state.mmd/.png

CI/CD Pipeline — ci-cd.mmd/.png

🔍 Monitoring & Alerts
Error Tracking: Sentry (DSN in .env)

Analytics: PostHog (key in .env)

Alerts: Slack via webhook

🧪 Quality & Security
Code Reviews: PRs required for main

Security: RLS everywhere, all writes via RPC

Linting: ESLint (enable when config is added)

Type Safety: TypeScript (pre-commit runs type-check)

📜 License
Private repository for the Ordak project. Not for external use.


