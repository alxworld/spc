# Local Testing Guide

## Prerequisites

- Node.js installed
- Convex env vars set in the Convex dashboard (`CLERK_JWT_ISSUER_DOMAIN`, `CLERK_WEBHOOK_SECRET`, `OPENROUTER_API_KEY`)
- `frontend/.env.local` has all Clerk and Convex keys

## Start the dev servers

Open two terminals:

**Terminal 1 — Convex (keep running)**
```bash
cd frontend
npx convex dev
```

Wait until you see `✓ Convex functions ready` before starting the frontend.

**Terminal 2 — Next.js**
```bash
cd frontend
npm run dev
```

Frontend is now at http://localhost:3000

## Test checklist

### 1. Landing page
- Open http://localhost:3000
- Verify the navbar shows **Login** and **Register** buttons
- Verify landing sections load (Who We Are, Our Team, etc.)

### 2. Register a new user
- Click **Register** (or go to http://localhost:3000/register)
- Fill in name, email, password and submit
- Clerk will send a verification email — click the link
- You should be redirected to `/dashboard` after verification

### 3. Verify user synced to Convex
- Go to https://dashboard.convex.dev → your project → **Data** → `users` table
- The new user should appear with their `clerkId`, `email`, `name`, and `role: "user"`
- If the row is missing, the webhook is not firing — check `CLERK_WEBHOOK_SECRET` in Convex

### 4. Dashboard
- After login you should land on `/dashboard`
- Verify your name appears in the welcome heading
- Verify the **My Bookings** list is empty initially

### 5. Book the prayer hall
- Click **Book Now**
- Pick a future date, set start/end time (between 06:00–20:00), add purpose and attendees
- Submit — booking should appear as **Pending** in your dashboard

### 6. Sign out and sign back in
- Click **Sign out** in the navbar
- Go to http://localhost:3000/login and sign in again
- Confirm you land back on `/dashboard`

### 7. Route protection
- Sign out
- Try to go to http://localhost:3000/dashboard directly
- You should be redirected to `/login` automatically

### 8. Promote to admin and test admin dashboard
- In Convex dashboard → **Functions** → run `users:seedSuperAdmin` with your email and `role: "superadmin"`
- Sign out and sign back in
- You should be redirected to `/admin` automatically
- Test approving/rejecting bookings, blocking dates, and viewing users

### 9. AI Chat widget
- Open the chat widget (bottom-right corner)
- Ask about availability or request a booking through conversation
- Confirm the booking confirmation card appears and submits correctly

## Common issues

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Stuck on login after register | Email not verified | Check inbox and click verification link |
| Dashboard shows blank / redirects to login | User not synced to Convex | Check webhook — see Step 3 above |
| Convex auth errors in console | `CLERK_JWT_ISSUER_DOMAIN` wrong | Re-check the issuer URL in Clerk → JWT Templates |
| Chat widget errors | `OPENROUTER_API_KEY` missing in Convex | Add it in Convex dashboard → Settings → Env vars |
