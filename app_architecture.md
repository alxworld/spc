# SPC Prayer Hall Booking — Application Architecture

**Date**: 2026-04-14

---

## Overview

SPC Prayer Hall Booking is a multi-tenant SaaS application for booking a shared prayer hall. It is built on a fully serverless, cloud-native stack with no self-managed infrastructure.

| Layer       | Technology                                      |
| ----------- | ----------------------------------------------- |
| Frontend    | Next.js 16 (App Router), Tailwind CSS 4, React 19 |
| Backend     | Convex cloud (EU West — `acoustic-civet-581`)   |
| Auth        | Clerk                                           |
| AI Chat     | OpenRouter → Cerebras (`gpt-oss-120b`)          |
| Hosting     | Vercel (frontend), Convex cloud (backend)       |
| Realtime    | Convex reactive subscriptions (WebSocket)       |

---

## High-Level Topology

```
┌─────────────────────────────────────────────────────────────────┐
│  User Browser                                                   │
│                                                                 │
│  ┌──────────────────┐   HTTPS/WebSocket   ┌─────────────────┐  │
│  │  Next.js App     │ ─────────────────── │  Convex Cloud   │  │
│  │  (Vercel)        │                     │  EU West        │  │
│  │                  │   Clerk JWT (auth)  │                 │  │
│  │  App Router SSR  │                     │  queries/       │  │
│  │  + Client Comps  │                     │  mutations/     │  │
│  └──────────────────┘                     │  actions/       │  │
│                                           │  http routes    │  │
└────────────────────────────────────────── └────────┬────────┘  │
                                                     │           │
                        ┌────────────────────────────┼──────┐    │
                        │                            │      │    │
                   ┌────┴────┐              ┌────────┴───┐  │    │
                   │  Clerk  │              │ OpenRouter  │  │    │
                   │  (Auth) │              │ / Cerebras  │  │    │
                   │  Webhook│              │  (AI Chat)  │  │    │
                   └─────────┘              └────────────┘  │    │
                                                            │    │
                                                            │    │
```

---

## Frontend — Next.js 16 on Vercel

**Location**: `frontend/`

### App Router structure

```
src/app/
  page.tsx                    — Public landing page (SSR)
  layout.tsx                  — Root layout: ConvexClientProvider + ChatWidget
  login/[[...rest]]/page.tsx  — Clerk <SignIn> (catch-all for Clerk routing)
  register/[[...rest]]/page.tsx — Clerk <SignUp>
  dashboard/
    page.tsx                  — User dashboard (client component)
    book/page.tsx             — Booking calendar + form (client component)
  admin/
    page.tsx                  — Admin bookings dashboard (client component)
    users/page.tsx            — Admin user list (client component)
```

### Key components

| Component                    | Purpose                                                            |
| ---------------------------- | ------------------------------------------------------------------ |
| `ConvexClientProvider.tsx`   | Wraps app in `ClerkProvider` + `ConvexProviderWithClerk`          |
| `Navbar.tsx`                 | Auth-aware nav; shows Admin link for admin/superadmin roles        |
| `ChatWidget.tsx`             | Floating AI assistant; handles booking/update/cancel action cards |
| `landing/HeroSection.tsx`    | Public landing hero                                                |
| `landing/TeamSection.tsx`    | Team portraits grid                                                |

### Route protection

`src/proxy.ts` runs as Next.js Middleware (Vercel Routing Middleware layer). It uses `clerkMiddleware` to gate `/dashboard/*` and `/admin/*`. Unauthenticated requests to these paths are redirected to `/login` before any page code runs.

```typescript
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/admin(.*)"]);
export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();
});
```

**Note**: Middleware only enforces authentication (is signed in). Role-based access (`admin` vs `user`) is enforced in two places: client-side via `useEffect` redirect, and server-side in every Convex query/mutation via `requireAdmin`.

---

## Backend — Convex Cloud

**Project**: `spc` / team `alexander-s`
**Deployment**: `acoustic-civet-581` (EU West)
**Cloud URL**: `https://acoustic-civet-581.eu-west-1.convex.cloud`
**HTTP URL**: `https://acoustic-civet-581.eu-west-1.convex.site`

Convex is the entire backend: database, business logic, and real-time subscriptions. There is no separate API server, no Docker, and no SQL database.

### Convex function types

| Type               | Description                                                   |
| ------------------ | ------------------------------------------------------------- |
| `query`            | Read-only, reactive — subscribed by client via WebSocket      |
| `mutation`         | Transactional write — ACID, OCC-based                         |
| `action`           | Side-effects (external HTTP calls, e.g., OpenRouter AI)       |
| `internalQuery`    | Server-only query, not callable from browser                  |
| `internalMutation` | Server-only mutation (e.g., Clerk webhook handlers)           |
| `httpAction`       | Raw HTTP endpoint (e.g., `/clerk-webhook`)                    |

### Schema (`convex/schema.ts`)

```
users
  clerkId: string          (indexed: by_clerk_id)
  name?: string
  email?: string           (indexed: email)
  role?: "user"|"admin"|"superadmin"

bookings
  userId: Id<"users">      (indexed: by_userId, by_userId_and_date)
  date: string             (YYYY-MM-DD)
  startTime: string        (HH:MM)
  endTime: string          (HH:MM)
  purpose: string
  attendees: number
  status: "pending"|"approved"|"rejected"
                           (indexed: by_date_and_status, by_status)

blockedDates
  date: string             (indexed: by_date)
  reason: string
```

### Function catalogue

#### `convex/users.ts`
| Function           | Type             | Access  | Description                            |
| ------------------ | ---------------- | ------- | -------------------------------------- |
| `getMe`            | query            | public  | Current user record (null if not authed) |
| `listAll`          | query            | admin   | All users                              |
| `getByClerkId`     | internalQuery    | internal| Lookup for chat action                 |
| `upsertFromClerk`  | internalMutation | internal| Clerk webhook: create/update user      |
| `deleteByClerkId`  | internalMutation | internal| Clerk webhook: delete user             |
| `seedSuperAdmin`   | mutation         | public* | Bootstrap: promote user to superadmin  |

*`seedSuperAdmin` should be `internalMutation` — see C1 in code_review.md.

#### `convex/bookings.ts`
| Function                 | Type          | Access    | Description                              |
| ------------------------ | ------------- | --------- | ---------------------------------------- |
| `getMyBookings`          | query         | auth      | Current user's bookings, newest first    |
| `getAvailability`        | query         | auth      | Approved dates + blocked dates for calendar |
| `createBooking`          | mutation      | auth      | Create new pending booking               |
| `updateBooking`          | mutation      | auth+owner| Update own pending booking               |
| `cancelBooking`          | mutation      | auth+owner| Delete own pending booking               |
| `getAvailabilityContext` | internalQuery | internal  | Availability string for AI system prompt |
| `getUserBookingsContext` | internalQuery | internal  | User bookings string for AI system prompt |

#### `convex/admin.ts`
| Function              | Type     | Access | Description                         |
| --------------------- | -------- | ------ | ----------------------------------- |
| `getAllBookings`       | query    | admin  | All bookings with user details       |
| `updateBookingStatus` | mutation | admin  | Approve / reject / re-pending        |
| `getBlockedDates`     | query    | admin  | All blocked dates                    |
| `blockDate`           | mutation | admin  | Add a blocked date                   |
| `unblockDate`         | mutation | admin  | Remove a blocked date                |
| `listUsers`           | query    | admin  | All registered users                 |

#### `convex/chat.ts`
| Function      | Type   | Access | Description                                |
| ------------- | ------ | ------ | ------------------------------------------ |
| `getGreeting` | query  | public | Static welcome message                     |
| `sendMessage` | action | public | Calls OpenRouter; parses action markers    |

#### `convex/http.ts`
| Route            | Method | Handler                                          |
| ---------------- | ------ | ------------------------------------------------ |
| `/clerk-webhook` | POST   | Verifies svix signature; dispatches user events  |

### Booking validation (enforced server-side in every create/update)

- Date must not be in the past
- Start time: 06:00–20:00; end time ≤ 20:00; end > start
- Attendees: 1–50
- Date must not be blocked
- No overlapping approved booking for the hall (hall-wide conflict check)
- No overlapping pending/approved booking for the same user

---

## Authentication — Clerk

Clerk manages all identity: registration, login, sessions, password resets, and OAuth. No custom auth code exists in the application.

### Flow

```
Browser
  └─ ClerkProvider (frontend)
       └─ ConvexProviderWithClerk
            └─ Convex client attaches Clerk JWT to every request

Convex function
  └─ ctx.auth.getUserIdentity()
       └─ verifies Clerk JWT against CLERK_JWT_ISSUER_DOMAIN
       └─ returns { subject: clerkId, ... }
  └─ db.query("users").withIndex("by_clerk_id", ...)
       └─ resolves to internal user record + role
```

### Clerk webhook sync

When a user registers, updates their profile, or is deleted in Clerk, Clerk sends a signed webhook to `https://acoustic-civet-581.eu-west-1.convex.site/clerk-webhook`. The handler:

1. Verifies the `svix-signature` header using `CLERK_WEBHOOK_SECRET`
2. On `user.created` / `user.updated`: upserts the `users` table row (name, email, clerkId)
3. On `user.deleted`: deletes the `users` table row

New users are always assigned `role: "user"`. Role promotion to admin/superadmin requires manual intervention (Convex dashboard).

### Environment variables

**Vercel (frontend)**:
- `NEXT_PUBLIC_CONVEX_URL` — Convex React client
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk browser key
- `CLERK_SECRET_KEY` — Clerk server key (used by middleware)
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard`

**Convex dashboard**:
- `CLERK_JWT_ISSUER_DOMAIN` — Clerk JWT issuer URL
- `CLERK_WEBHOOK_SECRET` — svix webhook signing secret
- `OPENROUTER_API_KEY` — OpenRouter API key for AI chat

---

## AI Chat — OpenRouter / Cerebras

**File**: `frontend/convex/chat.ts`

The chat feature runs as a Convex `action` (which can make external HTTP calls). The flow on each message:

```
ChatWidget (browser)
  └─ useAction(api.chat.sendMessage)
       └─ Convex action: sendMessage
            ├─ ctx.auth.getUserIdentity()  — check login status
            ├─ ctx.runQuery(getAvailabilityContext)  — hall availability
            ├─ ctx.runQuery(getUserBookingsContext)  — user's bookings
            ├─ Build system prompt (availability + bookings + today)
            ├─ POST https://openrouter.ai/api/v1/chat/completions
            │    model: openai/gpt-4o-mini (Note: MODEL const says gpt-oss-120b — see H1)
            │    provider hint: Cerebras
            └─ Parse response for BOOKING_ACTION / UPDATE_ACTION / CANCEL_ACTION markers
                 └─ Return { reply, bookingAction, updateAction, cancelAction }

ChatWidget
  └─ Displays reply text
  └─ If action present: renders confirmation card
       └─ On user confirm: calls Convex mutation (createBooking / updateBooking / cancelBooking)
```

### Action markers

The AI is prompted to append one of these markers at the end of a reply when a booking action is ready:

```
BOOKING_ACTION:{"date":"...","startTime":"...","endTime":"...","purpose":"...","attendees":N}
UPDATE_ACTION:{"bookingId":"...","date":"...","startTime":"...","endTime":"...","purpose":"...","attendees":N}
CANCEL_ACTION:{"bookingId":"..."}
```

The `sendMessage` action parses these markers and strips them from the visible reply. `ChatWidget` renders a confirmation card; the actual mutation is only called when the user clicks "Confirm".

---

## User Roles

| Role         | Capabilities                                                               |
| ------------ | -------------------------------------------------------------------------- |
| `user`       | Register, login, view/create/edit/cancel own pending bookings, use AI chat |
| `admin`      | All user capabilities + view all bookings, approve/reject, block dates, view users |
| `superadmin` | All admin capabilities + access to user management; intended for system owner |

Role is stored in the Convex `users` table. Role checks run in every Convex function via `requireAdmin` / `getAuthUser` helpers. The Clerk middleware only enforces authentication (signed in); role enforcement is Convex-side.

---

## Data Flow: Booking Lifecycle

```
User selects date/time in /dashboard/book
  └─ bookings.createBooking (mutation)
       ├─ validateFields: date, time range, attendees
       ├─ check blockedDates
       ├─ checkHallConflict: no approved booking overlaps
       ├─ checkUserConflict: user has no overlapping booking
       └─ insert bookings row (status: "pending")

Admin visits /admin
  └─ admin.getAllBookings (reactive query — live updates)
  └─ admin.updateBookingStatus (mutation)
       └─ patch bookings row: status → "approved" | "rejected"

User's /dashboard (reactive query)
  └─ bookings.getMyBookings — updates automatically when status changes
```

---

## Realtime Subscriptions

Convex queries are reactive by default. When data changes, all subscribed clients receive updates automatically over WebSocket. This means:

- The admin dashboard updates instantly when a new booking is submitted
- The user dashboard updates instantly when an admin approves or rejects a booking
- The availability calendar updates without polling

No additional pub/sub infrastructure is required.

---

## Deployment

### Frontend — Vercel

The Next.js app is deployed to Vercel. `next.config.ts` is minimal (no static export — dynamic rendering is enabled, which supports image optimisation and SSR).

### Backend — Convex cloud

Convex functions are deployed via `npx convex deploy` (or `npx convex dev` for local development, which watches for changes and hot-deploys). The Convex deployment is always live in the cloud; there is no separate backend server to manage, scale, or restart.

### Local development

```bash
# Terminal 1 — deploy Convex functions (watches for changes)
cd frontend
npx convex dev

# Terminal 2 — Next.js dev server
cd frontend
npm run dev
# http://localhost:3000
```

---

## Technology Decisions

| Decision                                | Rationale                                                             |
| --------------------------------------- | --------------------------------------------------------------------- |
| Convex instead of REST API + DB         | Real-time subscriptions, no server management, ACID transactions      |
| Clerk instead of custom auth            | Eliminates JWT key management, session handling, password reset flows |
| Convex cloud (EU West)                  | Data residency in Europe; low latency for EU users                   |
| OpenRouter for AI                       | Model-agnostic; can swap models without code changes                  |
| Next.js App Router                      | Server Components reduce client bundle; `proxy.ts` for auth gating   |
| Tailwind CSS 4                          | Utility-first, no CSS-in-JS runtime overhead                          |
