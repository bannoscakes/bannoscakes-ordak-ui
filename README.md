# Ordak v2 - Production Management System

Production management system for **Bannos** & **Flourlane** cake stores, built with **React + Vite + TypeScript** frontend and **Supabase** backend.

![Build Status](https://img.shields.io/badge/build-passing-green)
![Version](https://img.shields.io/badge/version-0.1.0--alpha-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![License](https://img.shields.io/badge/license-private-red)

---

## 📋 Project Documentation

- **[Implementation Plan](./docs/IMPLEMENTATION_PLAN.md)** - Complete development roadmap and setup guide
- **[Architecture](./docs/architecture.md)** - System design and data flows  
- **[Dev Kickoff](./DEV_KICKOFF.md)** - Quick start guide for developers

**Current Version:** v0.1.0-alpha (mock implementation)

---

## 📦 Project Status

- **Version:** 0.1.0-alpha  
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

# Configure .env.local with Supabase credentials

# Start development
npm run dev
Local server runs at: http://localhost:5173
⚙️ Environment Setup
Copy .env.example to .env.local and set values.
Required variables:

VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_APP_URL

Server-only (Edge Functions):

SUPABASE_SERVICE_ROLE_KEY
SHOPIFY_BANNOS_TOKEN
SHOPIFY_FLOURLANE_TOKEN
SHOPIFY_WEBHOOK_SECRET
SLACK_WEBHOOK_URL

See environment.md for details.
🚨 Emergency Procedures

Production down: Check /docs/runbook.md
Rollback: git revert HEAD && npm run deploy:prod
Contact: [Your emergency contact]
Backups: Daily PITR snapshots (7 days). See /docs/backup-recovery.md

🗄️ Database Management
bash# Run migrations
npx supabase migration up

# Create new migration
npx supabase migration new <name>

# Reset dev database
npx supabase db reset
See migration-order.md for sequence.
📜 Scripts

npm run dev – Start development server
npm run build – Production build
npm run test – Run test suite
npm run lint – Code quality check
npm run type-check – TypeScript validation
npm run migrate – Run database migrations
npm run deploy:staging – Deploy to staging
npm run deploy:prod – Deploy to production

🛠️ Development Workflow
We use Cursor as the IDE.
Always add /docs as Context so development aligns with business rules.
Branch Strategy:

main – Production only (protected)
dev – Integration branch (default for Cursor)
feature/* – Short-lived, merged into dev via PR

mermaidgitGraph
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
Complete specs live in /docs/:

overview.md – High-level description
schema-and-rls.md – Database schema + RLS
rpc-surface.md – API functions
migration-order.md – Build sequence
ui-site-map.md – Route map
operations.md – Deployment & runbooks
testing.md – Testing levels & flows
backup-recovery.md – Disaster recovery
performance-slas.md – SLAs & metrics
onboarding.md – New developer guide
checklists.md – QA, release, and Tailwind upgrade guides
diagrams/ – PNG + Mermaid diagrams

🚢 Deployment
See deployment.md for full process.
Quick deploy:
bashnpm run build
npm run deploy:prod
✅ Testing
bashnpm test          # All tests
npm run test:unit # Unit only
npm run test:e2e  # End-to-end
CI blocks merges if migrations or tests fail.
📋 Release Process

Update version in package.json
Tag release: git tag v0.1.0 && git push origin v0.1.0
Generate changelog: npm run changelog
Deploy to staging first
After 24h stable, deploy to production

📊 Performance Targets

Queue load: <200ms
Order creation: <500ms
Inventory sync: <2s
Uptime: 99.9%

🔧 Common Issues

Tailwind v4 issues → See /docs/checklists.md
Supabase connection fails → Verify anon and service_role keys
Build fails → Clear node_modules and reinstall
Webhooks not firing → Confirm Shopify tokens + webhook secret match

👨‍💻 Onboarding Developers
See onboarding.md.
Quick start:
bashgit clone <repo-url>
cd ordak-v2
npm install
cp .env.example .env.local
npm run dev
🖼️ Screenshots & Diagrams
For visual reference, static diagrams are included in /docs/diagrams/:

Branch Flow
System Overview
Table Site Map

See diagrams/README.md for details on updating diagrams.
🔍 Monitoring & Alerts

Error Tracking: Sentry (DSN in .env)
Analytics: PostHog (key in .env)
Alerts: Slack via webhook

🧪 Quality & Security

Code Reviews: All PRs must be approved before merging to main
Security: RLS enforced on all tables, all writes via RPC only
Linting: ESLint + Prettier enforced on commit
Type Safety: TypeScript strict mode enabled

## Staging

- URL: <STAGING_URL>
- Deploy guide: See [`docs/DEPLOY_STAGING.md`](docs/DEPLOY_STAGING.md)
- Env (Preview on Vercel): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_USE_MOCKS=true`, `VITE_APP_URL=<STAGING_URL>`

📜 License
Private repository for Ordak project.
Not for external use.