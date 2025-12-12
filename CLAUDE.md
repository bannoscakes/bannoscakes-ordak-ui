# Claude Code Instructions

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
