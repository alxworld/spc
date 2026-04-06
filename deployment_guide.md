# SPC Deployment Guide

Hosting: **Frontend → Vercel** | **Backend → Convex Cloud** | **Auth → Clerk**
Domain: **surfbible.in** (GoDaddy)

## Overview of steps

1. Push code to GitHub
2. Create Vercel project and deploy
3. Add custom domain in Vercel
4. Add DNS records in GoDaddy for Vercel
5. Switch Clerk to Production and configure domain
6. Add DNS records in GoDaddy for Clerk
7. Set all environment variables
8. Deploy Convex backend to production
9. Final redeploy and smoke test

---

## Step 1 — Push code to GitHub

Make sure your latest code is pushed:

```bash
cd /home/alex/aiprj/spc
git add .
git commit -m "feat: migrate auth to Clerk"
git push origin main
```

---

## Step 2 — Create a Vercel account and import the project

1. Go to [vercel.com](https://vercel.com) and sign up / sign in
2. Click **Add New → Project**
3. Click **Continue with GitHub** — authorise Vercel to access your repositories
4. Find and select your `spc` repository
5. Under **Configure Project**, set:
   - **Root Directory:** `frontend` ← click Edit and type `frontend`
   - **Framework Preset:** Next.js (auto-detected)
   - **Build Command:** `npm run build` (leave as default)
   - **Output Directory:** `.next` (leave as default)

**Do not click Deploy yet** — first add environment variables in the next step.

---

## Step 3 — Add environment variables in Vercel

Still on the Configure Project page, scroll down to **Environment Variables** and add each of these one by one:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` (your Clerk dev key for now — you'll update to `pk_live_...` later) |
| `CLERK_SECRET_KEY` | `sk_test_...` (your Clerk dev secret key for now) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/login` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/register` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/dashboard` |
| `NEXT_PUBLIC_CONVEX_URL` | `https://acoustic-civet-581.eu-west-1.convex.cloud` |

> Use your dev keys (`pk_test_...`, `sk_test_...`) for now. You will replace them with production keys in Step 8.

Click **Deploy**. Vercel will build the project and assign a URL like `https://spc-alxworld.vercel.app`. Wait for the build to complete (1–2 minutes).

---

## Step 4 — Add custom domain in Vercel

1. Vercel dashboard → your project → **Settings → Domains**
2. Type `surfbible.in` and click **Add**
3. Also add `www.surfbible.in` and click **Add**
4. Vercel will show you DNS records to configure. Note them down — they will look like:

| Type | Name | Value |
| --- | --- | --- |
| `A` | `@` | `76.76.21.21` |
| `CNAME` | `www` | `cname.vercel-dns.com` |

Keep this page open.

---

## Step 5 — Add DNS records in GoDaddy for Vercel

1. Go to [godaddy.com](https://godaddy.com) → sign in
2. Click your account name (top right) → **My Products**
3. Find `surfbible.in` → click **DNS** (or Manage DNS)
4. You will see existing DNS records

**Delete any existing A record for `@`** (GoDaddy adds a default parked-page A record — you must remove it first):

- Find the row with Type `A` and Name `@`
- Click the trash/delete icon → confirm delete

**Add the A record for Vercel:**

- Click **Add New Record**
- Type: `A`
- Name: `@`
- Value: `76.76.21.21` ← use the exact IP shown in Vercel
- TTL: `1 Hour`
- Click **Save**

**Add the CNAME record for www:**

- Click **Add New Record**
- Type: `CNAME`
- Name: `www`
- Value: `cname.vercel-dns.com`
- TTL: `1 Hour`
- Click **Save**

Go back to Vercel → **Settings → Domains** and wait for the green checkmark next to `surfbible.in`. This can take 5–30 minutes.

To check propagation, run in terminal:

```bash
nslookup surfbible.in
```

When it returns `76.76.21.21`, DNS is live.

---

## Step 6 — Switch Clerk to Production

1. Go to [clerk.com](https://clerk.com) → your application
2. In the top-left dropdown, switch from **Development** to **Production**
3. Clerk will ask for your **production domain** — enter `surfbible.in`
4. Clerk will display DNS records you need to add for domain verification and email delivery. They will look similar to:

| Type | Name | Value |
| --- | --- | --- |
| `CNAME` | `clk._domainkey` | `clk._domainkey.xxxx.clerk.accounts.dev` |
| `TXT` | `clk` | `some-verification-value` |

Note down all records Clerk shows you.

---

## Step 7 — Add DNS records in GoDaddy for Clerk

Go back to GoDaddy → `surfbible.in` → **DNS** → **Add New Record** for each record Clerk showed you.

For each record:

- Set **Type** exactly as shown (CNAME or TXT)
- Set **Name** exactly as shown (e.g. `clk._domainkey`)
- Set **Value** exactly as shown
- TTL: `1 Hour`
- Click **Save**

Once added, go back to Clerk and click **Verify DNS Records**. Wait for all records to show green checkmarks (5–30 minutes).

---

## Step 8 — Get Clerk production keys and configure everything

### 8a — Get production API keys

Clerk dashboard → **Production** → **API Keys**:

- Copy **Publishable key** → `pk_live_...`
- Copy **Secret key** → `sk_live_...`

### 8b — Get JWT issuer URL

Clerk dashboard → **Production** → **Configure → JWT Templates → convex**:

- Copy the **Issuer URL** (e.g. `https://surfbible.in`)

### 8c — Register the webhook

Clerk dashboard → **Production** → **Configure → Webhooks → Add Endpoint**:

- URL: `https://acoustic-civet-581.eu-west-1.convex.site/clerk-webhook`
- Subscribe to events: `user.created`, `user.updated`, `user.deleted`
- Click **Create**
- Copy the **Signing Secret** (`whsec_...`)

### 8d — Set Convex production environment variables

Go to [dashboard.convex.dev](https://dashboard.convex.dev) → project `spc` → switch to **Production** tab → **Settings → Environment Variables**:

| Variable | Value |
| --- | --- |
| `CLERK_JWT_ISSUER_DOMAIN` | Issuer URL from Step 8b |
| `CLERK_WEBHOOK_SECRET` | Signing secret from Step 8c |
| `OPENROUTER_API_KEY` | Your OpenRouter API key |

Remove these if still present:

- `JWT_PRIVATE_KEY`
- `JWKS`
- `SITE_URL`

### 8e — Update Vercel environment variables with production Clerk keys

Vercel dashboard → your project → **Settings → Environment Variables**:

- Update `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` → replace `pk_test_...` with `pk_live_...`
- Update `CLERK_SECRET_KEY` → replace `sk_test_...` with `sk_live_...`

---

## Step 9 — Deploy Convex backend to production

```bash
cd frontend
npx convex deploy
```

Confirm in Convex dashboard → Production → **Functions** that all functions appear.

---

## Step 10 — Redeploy Vercel frontend

Vercel dashboard → your project → **Deployments** → click the latest deployment → **Redeploy**.

This picks up the updated production Clerk keys.

---

## Step 11 — Promote your account to superadmin

After the site is live, register your admin account at `https://surfbible.in/register`.

Then promote it:

1. Convex dashboard → **Production** → **Functions** → `users:seedSuperAdmin`
2. Click **Run Function** and enter:

   ```json
   { "email": "your@email.com", "role": "superadmin" }
   ```

3. Sign out and sign back in at `https://surfbible.in` → you will be redirected to `/admin`

---

## Smoke test checklist

Open `https://surfbible.in` and verify:

- [ ] Landing page loads
- [ ] Register a new account → email verification arrives
- [ ] After email verification, redirected to `/dashboard`
- [ ] Make a booking → appears as Pending
- [ ] Sign out → redirected to home
- [ ] Sign in → lands on `/dashboard`
- [ ] Navigate to `/dashboard` while logged out → redirected to `/login`
- [ ] Admin account → lands on `/admin`, can approve/reject bookings
- [ ] AI chat widget responds and can initiate bookings

---

## Ongoing deploys

### Frontend (Vercel) — automatic

Every `git push` to `main` triggers a Vercel rebuild automatically. No action needed.

### Backend (Convex) — run manually after changes to `convex/`

```bash
cd frontend
npx convex deploy
```

### Optional — automate Convex deploy via GitHub Actions

Create `.github/workflows/deploy-convex.yml`:

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
      - run: cd frontend && npm ci
      - run: cd frontend && npx convex deploy
        env:
          CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY }}
```

Get your deploy key: Convex dashboard → **Settings → Deploy Keys → Generate Key**.
Add it as a GitHub secret: your repo → **Settings → Secrets and variables → Actions → New repository secret** → name it `CONVEX_DEPLOY_KEY`.

---

## Environment variable reference

### `frontend/.env.local` (local dev only — never commit to git)

```env
CONVEX_DEPLOYMENT=dev:acoustic-civet-581
NEXT_PUBLIC_CONVEX_URL=https://acoustic-civet-581.eu-west-1.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://acoustic-civet-581.eu-west-1.convex.site
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

### Vercel dashboard (production)

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
NEXT_PUBLIC_CONVEX_URL=https://acoustic-civet-581.eu-west-1.convex.cloud
```

### Convex dashboard (production)

```env
CLERK_JWT_ISSUER_DOMAIN=https://surfbible.in
CLERK_WEBHOOK_SECRET=whsec_...
OPENROUTER_API_KEY=...
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `surfbible.in` not loading | DNS not propagated yet | Wait up to 1 hour; run `nslookup surfbible.in` to check |
| Clerk error on login | Domain not verified in Clerk Production | Complete all DNS records in Step 7 |
| Login redirects back to `/login` | User not synced to Convex | Check Clerk → Webhooks for delivery errors; verify `CLERK_WEBHOOK_SECRET` |
| Convex auth errors | `CLERK_JWT_ISSUER_DOMAIN` wrong | Must match the issuer URL from Clerk → JWT Templates exactly |
| Dashboard blank after login | User record missing in `users` table | Webhook not firing — check Clerk → Webhooks → recent deliveries |
| Build fails on Vercel | Missing env vars | Confirm all 7 variables are set in Vercel → Settings → Environment Variables |
| AI chat not responding | `OPENROUTER_API_KEY` missing in Convex prod | Add it in Convex dashboard → Production → Environment Variables |
