# Claude Code Instructions

## CRITICAL DATABASE RULES
1. NEVER use MCP to apply migrations or run CREATE/ALTER/DROP statements without explicit permission
2. NEVER use supabase db push without explicit permission
3. Create migration files ONLY in supabase/migrations/
4. Tell me when migration is ready - I will review and deploy
5. SELECT queries via MCP are OK for debugging
6. Deploy ONLY when I explicitly say "deploy" or "supabase db push"

---

## Supabase Project Metadata
**Project ID**: `iwavciibrspfjezujydc`
**Project Name**: ordak-dev
**Region**: ap-southeast-2

**Note**: These are non-secret project identifiers only. Never commit project URLs, anon keys, or service_role keys to the repository. Use environment variables or a secrets manager for credentials.

---

## Database Changes Workflow
- Always create feature branch first
- Create migration file in supabase/migrations/
- Never run `supabase db push` without approval
- Never commit directly to dev
- All database changes require PR review

---

## Development Workflow
1. Create feature branch from `dev`
2. One focused task per branch
3. Open PR for review
4. Squash and merge to `dev`
5. Never push directly to `dev` or `main`
