# SPC Prayer Hall Booking — Deployment Guide

**Stack**: Next.js 16 on Vercel · Convex cloud backend · Clerk auth · OpenRouter AI
**URL**: `spc.surfbible.in` (subdomain on Cloudflare-managed domain)
**Last updated**: 2026-04-14

---

## Cost at a glance

All services have a free tier that covers this app at typical community-scale usage.

| Service | Free tier | When you'd pay |
| ------- | --------- | -------------- |
| **Vercel** (Hobby) | 100 GB bandwidth, unlimited deployments | Adding team members (Pro = $20/mo) |
| **Convex** (free) | 1 M function calls/mo, 1 GB storage, real-time | >1 M calls/mo or >1 GB storage |
| **Clerk** (free) | 10,000 MAU, unlimited sign-ins | >10,000 monthly active users |
| **OpenRouter** | Pay-per-token, no monthly fee | Each AI chat message (~$0.0001–$0.001) |

**Realistic monthly cost for a small prayer hall community: $0.**
Only OpenRouter has usage-based cost — at 100 chat messages/month, expect < $0.10.

---

## Steps overview

1. Run tests and push code to GitHub
2. Create Vercel project, set root directory and environment variables
3. Add `spc.surfbible.in` as a custom domain in Vercel
4. Add CNAME record in Cloudflare (proxy OFF)
5. Switch Clerk to Production, configure subdomain
6. Add Clerk DNS records in Cloudflare (proxy OFF)
7. Get Clerk production keys and update Vercel + Convex
8. Deploy Convex backend to production
9. Redeploy Vercel frontend
10. Bootstrap the first superadmin
11. Smoke test

---

## Step 1 — Run tests then push to GitHub

```bash
cd frontend
npm test
# All 33 tests must pass before proceeding
```

Then push:

```bash
cd /home/alex/aiprj/spc
git add -A
git commit -m "chore: pre-deployment — all tests passing"
git push origin main
```

---

## Step 2 — Create Vercel project and set environment variables

1. [vercel.com](https://vercel.com) → **Add New → Project**
2. Connect GitHub, select the `spc` repository
3. Under **Configure Project**:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Next.js (auto-detected)
   - **Build / Output**: leave as defaults

4. Add these environment variables before clicking Deploy:

| Variable | Value |
| -------- | ----- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` (dev key — updated in Step 7) |
| `CLERK_SECRET_KEY` | `sk_test_...` (dev key — updated in Step 7) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/login` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/register` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/dashboard` |
| `NEXT_PUBLIC_CONVEX_URL` | `https://acoustic-civet-581.eu-west-1.convex.cloud` |

5. Click **Deploy** and wait for the build to complete (~2 minutes). Vercel assigns a temporary URL like `https://spc-xyz.vercel.app`.

---

## Step 3 — Add the custom subdomain in Vercel

1. Vercel dashboard → your project → **Settings → Domains**
2. Type `spc.surfbible.in` → **Add**
3. Vercel will show you a CNAME record to configure — note it down:

| Type | Name | Value |
| ---- | ---- | ----- |
| `CNAME` | `spc` | `cname.vercel-dns.com` |

---

## Step 4 — Add the CNAME record in Cloudflare

> **Critical**: Cloudflare's proxy must be **OFF** (grey cloud) for this record. If the proxy is on, Cloudflare intercepts traffic and Vercel cannot provision its SSL certificate.

1. [dash.cloudflare.com](https://dash.cloudflare.com) → select `surfbible.in`
2. **DNS → Records → Add record**
3. Fill in:

| Field | Value |
| ----- | ----- |
| Type | `CNAME` |
| Name | `spc` |
| Target | `cname.vercel-dns.com` |
| Proxy status | **DNS only** (grey cloud) — click the orange cloud to toggle it off |
| TTL | Auto |

4. Click **Save**

Go back to Vercel → **Settings → Domains** — the green checkmark next to `spc.surfbible.in` appears within a few minutes once DNS propagates.

Verify:

```bash
nslookup spc.surfbible.in
# Should resolve to a Vercel IP
```

---

## Step 5 — Switch Clerk to Production

1. [clerk.com](https://clerk.com) → your application → top-left dropdown → switch to **Production**
2. Enter production domain: `spc.surfbible.in`
3. Clerk will show DNS records for domain verification and email delivery — note them all

---

## Step 6 — Add Clerk DNS records in Cloudflare

> **Same rule applies**: all Clerk records must have Cloudflare proxy **OFF** (grey cloud / DNS only).

For each record Clerk shows you:

1. Cloudflare → `surfbible.in` → **DNS → Records → Add record**
2. Set Type, Name, and Value exactly as Clerk shows
3. Set Proxy status to **DNS only** (grey cloud)
4. TTL: Auto → **Save**

Typical Clerk records look like:

| Type | Name | Proxy |
| ---- | ---- | ----- |
| `CNAME` | `clk._domainkey.spc` | DNS only |
| `TXT` | `clk.spc` | DNS only (TXT records are always DNS only) |

Once all records are added, go to Clerk → **Verify DNS Records**. All checkmarks should turn green within 5–30 minutes.

---

## Step 7 — Get Clerk production keys and configure everything

### 7a — Production API keys

Clerk → **Production → API Keys**:

- **Publishable key** → `pk_live_...`
- **Secret key** → `sk_live_...`

### 7b — JWT issuer URL

Clerk → **Production → Configure → JWT Templates → convex** → copy the **Issuer URL**.

It will be `https://spc.surfbible.in` (or a Clerk-assigned URL like `https://clerk.spc.surfbible.in`). Copy it exactly as shown.

### 7c — Register the Clerk webhook

Clerk → **Production → Configure → Webhooks → Add Endpoint**:

- **URL**: `https://acoustic-civet-581.eu-west-1.convex.site/clerk-webhook`
- **Events**: `user.created`, `user.updated`, `user.deleted`
- Click **Create** → copy the **Signing Secret** (`whsec_...`)

### 7d — Update Vercel with production Clerk keys

Vercel → your project → **Settings → Environment Variables**:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` → replace `pk_test_...` with `pk_live_...`
- `CLERK_SECRET_KEY` → replace `sk_test_...` with `sk_live_...`

### 7e — Set Convex production environment variables

[dashboard.convex.dev](https://dashboard.convex.dev) → project `spc` → **Production** tab → **Settings → Environment Variables**:

| Variable | Value | Source |
| -------- | ----- | ------ |
| `CLERK_JWT_ISSUER_DOMAIN` | Issuer URL from Step 7b | Clerk → JWT Templates |
| `CLERK_WEBHOOK_SECRET` | Signing secret from Step 7c | Clerk → Webhooks |
| `OPENROUTER_API_KEY` | Your OpenRouter key | [openrouter.ai/keys](https://openrouter.ai/keys) |

Remove any leftover keys from the old auth system if still present: `JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL`.

---

## Step 8 — Deploy Convex backend to production

```bash
cd frontend
npx convex deploy
```

Confirm in Convex dashboard → **Production → Functions** that all modules appear:
`admin`, `bookings`, `chat`, `http`, `users`

---

## Step 9 — Redeploy Vercel frontend

Vercel → your project → **Deployments** → latest → **Redeploy**.

This picks up the updated production Clerk keys from Step 7d.

---

## Step 10 — Bootstrap the first superadmin

> `seedSuperAdmin` is an internal-only function — it cannot be called from the browser. It must be run from the Convex dashboard.

1. Register your admin account at `https://spc.surfbible.in/register`
2. Convex dashboard → **Production → Functions → users → seedSuperAdmin → Run Function**:

```json
{ "email": "your@email.com", "role": "superadmin" }
```

3. Sign out and sign back in — you will be redirected to `/admin`

---

## Step 11 — Smoke test checklist

Open `https://spc.surfbible.in` and verify:

- [ ] Landing page loads with SPC logo and content
- [ ] `/dashboard` while logged out → redirected to `/login`
- [ ] `/admin` while logged out → redirected to `/login`
- [ ] Register a new account → email verification arrives from `spc.surfbible.in`
- [ ] After verification → redirected to `/dashboard`
- [ ] Make a booking → appears as **Pending**
- [ ] Sign out and sign back in → lands on `/dashboard`
- [ ] Superadmin account → lands on `/admin`, can approve/reject bookings
- [ ] Block a date → shows as blocked in booking calendar
- [ ] AI chat widget responds and can submit a booking via confirmation card
- [ ] Approved booking updates instantly in user dashboard (realtime)

---

## Ongoing deployments

### Frontend — automatic

Every `git push` to `main` triggers a Vercel rebuild. No action needed.

### Backend — after changes to `convex/`

```bash
cd frontend
npx convex deploy
```

### CI/CD via GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: cd frontend && npm ci

      - name: Run tests
        run: cd frontend && npm test

      - name: Deploy Convex (only if convex/ changed)
        if: contains(join(github.event.commits.*.modified, ','), 'frontend/convex/')
        run: cd frontend && npx convex deploy --prod
        env:
          CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY }}
```

Get your deploy key: Convex dashboard → **Settings → Deploy Keys → Generate**.
Add it as a GitHub secret: repo → **Settings → Secrets → Actions → New repository secret** → `CONVEX_DEPLOY_KEY`.

---

## Environment variable reference

### `frontend/.env.local` — local dev only, never commit

```env
CONVEX_DEPLOYMENT=dev:acoustic-civet-581
NEXT_PUBLIC_CONVEX_URL=https://acoustic-civet-581.eu-west-1.convex.cloud
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

### Vercel dashboard — production frontend

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
NEXT_PUBLIC_CONVEX_URL=https://acoustic-civet-581.eu-west-1.convex.cloud
```

### Convex dashboard — production backend

```env
CLERK_JWT_ISSUER_DOMAIN=https://spc.surfbible.in
CLERK_WEBHOOK_SECRET=whsec_...
OPENROUTER_API_KEY=sk-or-...
```

---

## Security checklist before going live

- [ ] `git grep "pk_live_\|sk_live_\|whsec_\|sk-or-"` returns nothing (no secrets in repo)
- [ ] Cloudflare proxy is **OFF** (grey cloud) on the `spc` CNAME record
- [ ] Cloudflare proxy is **OFF** on all Clerk DNS records
- [ ] Vercel shows green checkmark for `spc.surfbible.in`
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is `pk_live_...` in Vercel production
- [ ] `CLERK_SECRET_KEY` is `sk_live_...` in Vercel production
- [ ] `CLERK_JWT_ISSUER_DOMAIN` in Convex matches exactly what Clerk shows in JWT Templates
- [ ] Clerk webhook subscribed to `user.created`, `user.updated`, `user.deleted`
- [ ] Old Convex env vars removed: `JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL`

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| ------- | ------------ | --- |
| `spc.surfbible.in` not loading | DNS not propagated or wrong record | Run `nslookup spc.surfbible.in`; check CNAME in Cloudflare points to `cname.vercel-dns.com` |
| SSL error on `spc.surfbible.in` | Cloudflare proxy is ON | Toggle the CNAME record to **DNS only** (grey cloud) in Cloudflare |
| Vercel domain stuck on "pending" | Cloudflare proxy blocking verification | Same fix — turn proxy OFF on the `spc` CNAME record |
| Clerk error on login | Domain not verified | Check all Clerk DNS records are in Cloudflare with proxy OFF, then re-verify in Clerk |
| Login redirects back to `/login` | User not synced to Convex | Check Clerk → Webhooks → recent deliveries; verify `CLERK_WEBHOOK_SECRET` in Convex |
| Convex auth errors | `CLERK_JWT_ISSUER_DOMAIN` mismatch | Must exactly match the issuer URL from Clerk → JWT Templates |
| Dashboard blank after login | User record missing | Webhook not firing — check Clerk → Webhooks → recent deliveries |
| Build fails on Vercel | Missing env var | Confirm all 7 variables are set in Vercel → Settings → Environment Variables |
| AI chat not responding | `OPENROUTER_API_KEY` missing | Add it in Convex dashboard → Production → Environment Variables |
| `seedSuperAdmin` not in browser | Expected — it's internal only | Use Convex dashboard → Functions → users → seedSuperAdmin → Run Function |
