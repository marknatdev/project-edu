# GitHub Actions CI/CD Deployment Guide

Workflow file: `.github/workflows/deploy.yml`

This pipeline automates:
1. **Quality Gate (`verify`)**: Runs on every `push` to `main`, `pull_request`, and `workflow_dispatch`.
   - `npm run lint`
   - `npm run typecheck`
   - `npm test` (unit and integration tests)
   - `npm run build`
2. **Database Migrations (`deploy-supabase`)**: Runs on `main` push or manual dispatch.
   - Applies migrations via Supabase CLI (`supabase db push`)
3. **App Deployment (`deploy-vercel`)**:
   - Production deployment to Vercel after tests and DB migrations succeed.
   - Preview deployment on Pull Requests.

---

## Required GitHub Secrets

Set these in your GitHub repository under **Settings → Secrets and variables → Actions**:

| Secret Name | Description | Example / Default |
|---|---|---|
| `VERCEL_TOKEN` | Vercel Personal Access Token | [Generate here](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Vercel Team / Account ID | `team_glmawLQlxzaWRFiNoQ16yY9G` (built-in default) |
| `VERCEL_PROJECT_ID` | Vercel Project ID | `prj_a4MuPE3N1J68C3eoQOtBssOkxkFd` (built-in default) |
| `SUPABASE_ACCESS_TOKEN` | Supabase Personal Access Token | [Generate here](https://app.supabase.com/account/tokens) |
| `SUPABASE_DB_PASSWORD` | Postgres Database Password | Password for project `ppctndzkerwiokjfaklw` |
| `SUPABASE_PROJECT_ID` | Supabase Project Ref | `ppctndzkerwiokjfaklw` (built-in default) |

---

## Triggering Manually

You can manually trigger the workflow via the **Actions** tab on GitHub:
1. Go to **Actions** → **Deploy (Vercel & Supabase)**
2. Click **Run workflow**
3. Choose target: `production` or `preview`
