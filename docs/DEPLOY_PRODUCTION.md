# Production Deployment — Ordak v2

## Strategy
- Branch strategy: dev → PR → main (protected).
- Vercel **Production** deploys from **main**.
- Keep `VITE_USE_MOCKS=true` until real RPCs are ready; switch to false when backend is wired.

## Prereqs
- Supabase Production project (URL + anon key).
- Vercel project created (staging already working).
- GitHub branch protections on `main`.

## 1) Vercel — Production env (Environment = Production)
- Add env vars:
  - `VITE_SUPABASE_URL` = <prod URL>
  - `VITE_SUPABASE_ANON_KEY` = <prod anon key>
  - `VITE_APP_URL` = https://your-domain-or-vercel.app
  - `VITE_USE_MOCKS` = true  # flip to false when real RPCs are live
- Build settings:
  - Build command: `npm run build`
  - Output dir: `build` (or `dist` if you changed Vite outDir)
- Connect Production to branch: `main`.

## 2) Promote to Production
- Create PR dev → main, ensure checks are green.
- Merge to main → Vercel auto-deploys Production.

## 3) Post-deploy checks
- Open Production URL → app loads, no asset 404.
- Mocks: dashboard + scanner render.

## 4) Rollback
- Vercel: Promote previous deploy or Redeploy last green.
- GitHub: Revert the PR, CI runs, Vercel rebuilds.
