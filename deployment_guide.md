# SPC Deployment Guide

Hosting: **Frontend → Vercel** | **Backend → Convex Cloud**

## Prerequisites

- GitHub repository: `alxworld/spc` (already pushed)
- Convex project: `spc` on team `alexander-s`, deployment `acoustic-civet-581` (EU West)
- Node.js 20+ installed locally

---

## Part A — Convex Production Backend

### Step 1 — Deploy Convex functions to production

From your local machine:

```bash
cd frontend
npx convex deploy
```

This promotes all functions from the dev deployment to the **production** deployment. The production URL is the same cloud instance:
```
https://acoustic-civet-581.eu-west-1.convex.cloud
```

### Step 2 — Set environment variables on the production deployment

Go to [dashboard.convex.dev](https://dashboard.convex.dev) → project `spc` → switch to the **Production** tab → **Settings → Environment Variables**.

Set the following (copy from the dev deployment if already configured there):

| Variable | Value | Notes |
|---|---|---|
| `JWT_PRIVATE_KEY` | RSA private key (PEM format) | Required by `@convex-dev/auth` |
| `JWKS` | Public key JSON | Must match the private key above |
| `OPENROUTER_API_KEY` | `sk-or-v1-...` | AI chat via OpenRouter/Cerebras |
| `SITE_URL` | Your Vercel URL | Set this **after** Step 6 below |

> **Note:** `SITE_URL` must match the exact origin of the deployed frontend (e.g. `https://spc.vercel.app`). `@convex-dev/auth` uses it to validate the auth session origin. Update it once you have the Vercel URL.

---

## Part B — Vercel Frontend

### Step 3 — Create a Vercel account

Sign up at [vercel.com](https://vercel.com) if you don't have one. The free Hobby plan is sufficient.

### Step 4 — Import the GitHub repository

1. Vercel dashboard → **Add New → Project**
2. Click **Continue with GitHub** and authorise Vercel to access your repositories
3. Find and select `alxworld/spc`
4. Under **Configure Project**, set:
   - **Root Directory:** `frontend`  ← important; the Next.js app lives inside this subfolder
   - **Framework Preset:** Next.js (auto-detected)
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)

### Step 5 — Set environment variables in Vercel

Before clicking Deploy, scroll to **Environment Variables** and add:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | `https://acoustic-civet-581.eu-west-1.convex.cloud` |

This is the only environment variable the frontend needs. All secrets (JWT keys, API keys) stay in Convex.

### Step 6 — Deploy

Click **Deploy**. Vercel will:
1. Clone the repo
2. Run `npm run build` inside `frontend/`
3. Assign a URL such as `https://spc-alxworld.vercel.app`

The deployment takes about 1–2 minutes. You will see the build log in real time.

### Step 7 — (Optional) Add a custom domain

Vercel dashboard → your project → **Domains** → **Add** your domain (e.g. `spc.yourdomain.com`).

Follow the DNS instructions Vercel provides (usually a CNAME or A record).

### Step 8 — Update `SITE_URL` in Convex

Once you have the final Vercel URL, go back to:

Convex dashboard → Production → Settings → Environment Variables → update `SITE_URL`:

```
https://spc-alxworld.vercel.app
```

or your custom domain if you set one. Then redeploy Convex functions to pick up the change:

```bash
cd frontend
npx convex deploy
```

---

## Part C — Ongoing: Automatic Deploys

### Frontend (Vercel) — fully automatic

Every `git push` to `main` triggers a Vercel rebuild and redeploy automatically. No action needed.

### Backend (Convex) — manual or via CI

Run this whenever you change files under `frontend/convex/`:

```bash
cd frontend
npx convex deploy
```

#### Optional — automate Convex deploy via GitHub Actions

Create `.github/workflows/deploy-convex.yml` in the repo root:

```yaml
name: Deploy Convex

on:
  push:
    branches: [main]
    paths:
      - 'frontend/convex/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: cd frontend && npm ci

      - name: Deploy to Convex production
        run: cd frontend && npx convex deploy
        env:
          CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY }}
```

Get your deploy key from Convex dashboard → **Settings → Deploy Keys → Generate Key**, then add it as a GitHub repository secret named `CONVEX_DEPLOY_KEY` (GitHub repo → Settings → Secrets and variables → Actions).

---

## Summary

| Layer | Hosting | Deploy method |
|---|---|---|
| Backend — functions, DB, auth | Convex Cloud | `npx convex deploy` |
| Frontend — Next.js UI | Vercel | Auto on `git push main` |
| Frontend env vars | Vercel dashboard | `NEXT_PUBLIC_CONVEX_URL` only |
| Backend env vars | Convex dashboard | `JWT_PRIVATE_KEY`, `JWKS`, `OPENROUTER_API_KEY`, `SITE_URL` |

## Environment variable reference

### Convex dashboard (production)

| Variable | Description |
|---|---|
| `JWT_PRIVATE_KEY` | RSA private key for `@convex-dev/auth` token signing |
| `JWKS` | Matching RSA public key set (JSON) |
| `OPENROUTER_API_KEY` | API key for OpenRouter — used by the AI chat action |
| `SITE_URL` | Exact origin URL of the deployed frontend — must match Vercel URL |

### Vercel (frontend build)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | Convex cloud URL consumed by the React client at runtime |

> `CONVEX_DEPLOYMENT` is auto-generated locally by `npx convex dev` into `.env.local`. For Vercel, only `NEXT_PUBLIC_CONVEX_URL` is needed — Vercel does not need the deployment name.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Login redirects back to `/login` | `SITE_URL` mismatch in Convex | Update `SITE_URL` to match the exact Vercel origin |
| Auth error: `Could not verify OIDC token` | `JWT_PRIVATE_KEY` / `JWKS` mismatch | Regenerate a matched RSA key pair and set both in Convex prod |
| Build fails on Vercel: image errors | `output: 'export'` left in `next.config.ts` | Remove it — Vercel runs Next.js natively |
| Convex queries return nothing | `NEXT_PUBLIC_CONVEX_URL` not set in Vercel | Add it in Vercel → Project → Settings → Environment Variables |
| AI chat not responding | `OPENROUTER_API_KEY` missing in prod | Add it in Convex dashboard → Production → Environment Variables |
