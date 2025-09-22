# Staging Deployment — Ordak v2

## Prereqs
- GitHub repo: `bannoscakes-ordak-ui` (branch: `dev`)
- Node 18+ locally
- Supabase project (URL + anon key)
- Vercel account (frontend)
- Railway account (Edge functions — optional for now)

## 1) Frontend on Vercel
1. Vercel → **New Project** → Import GitHub → `bannoscakes-ordak-ui`.
2. Framework: **Vite**  
   Build: `npm run build`  
   Output: `dist`
3. **Environment Variables (staging)**  
   - `VITE_SUPABASE_URL` = your Supabase URL  
   - `VITE_SUPABASE_ANON_KEY` = your anon key  
   - `VITE_APP_URL` = (fill after first deploy)  
   - `VITE_USE_MOCKS` = `true` (keeps UI on mocks while wiring RPCs)
4. **Deploy from branch**: `dev`
5. After deploy, copy the Vercel URL and set it back into Project Settings → Env → `VITE_APP_URL`.

### Post-deploy checks
- Open the URL → app loads
- Console: no 404 on main assets
- UI works with mock data (scanner, dashboard counts)

## 2) Edge Functions on Railway (optional now)
You can skip for the first staging; when ready:
- New Project → From GitHub (Edge functions repo or this repo subdir)
- Env:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SHOPIFY_BANNOS_TOKEN`
  - `SHOPIFY_FLOURLANE_TOKEN`
  - `SHOPIFY_WEBHOOK_SECRET`
  - `SLACK_WEBHOOK_URL`
- Deploy → hit `/health` (200 OK)

## 3) CI/Guards
- GitHub Actions → check "Guard RPC imports" step is green.
- Local: `npm run guard:rpc` → ✅ No direct mocks imports found.

## 4) Rollback
- Vercel: Promote previous deployment or Redeploy last green.
- GitHub: Revert PR → CI runs → Vercel auto-rebuild.

---

## Quick Commands
Local sanity before pushing:
```bash
npm run build
npm run guard:rpc
