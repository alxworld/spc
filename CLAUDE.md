# SPC Prayer Hall Booking

## Overview

This is a SaaS application to allow users to book the Prayer Hall.
The registered users should be able to check Prayer Hall availability and request for a particular slot/day.
The admin user can check the requests from the registered users and approve the request.
The unregistered or all users should be able to see the prayer hall details, mission & vision, prayer timings, Announcements, location map and Contact information.
The landing page should be able to show App download link at the bottom of the page.
There will be AI assistant in the website, through which the user can interact to know the prayer hall details.
There will be 3 user types.

1. Normal User should be able to :
   - Register account
   - Login
   - View Prayer Hall availability
   - Book Prayer Hall
   - View booking status
   - Cancel pending booking
   - Modify pending booking

2. Admin User should be able to :
   - View all bookings
   - Approve booking
   - Reject booking
   - Block dates
   - Manage users

3. Super Admin User should be able to :
   - Add/remove admins
   - Full system control

## Development process

When instructed to build a feature:

1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

## AI design

When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-120b` model with Cerebras as the inference provider. The chat should be freeform — the AI greets the user and helps them query availability or make a booking through natural conversation.

There is an OPENROUTER_API_KEY in the Convex dashboard environment variables.

## Technical design

The frontend is in `frontend/` — Next.js 16 with Tailwind CSS 4.
The backend is **Convex** (cloud) — all data, auth, and business logic live in `frontend/convex/`.
Auth is handled by **Clerk** — no custom auth code, no JWT keys to manage.
No FastAPI or SQLite. No Docker required for development.

### Running locally

```bash
# Terminal 1 — keep Convex functions deployed (watches for changes)
cd frontend
npx convex dev

# Terminal 2 — Next.js dev server
cd frontend
npm run dev
```

Frontend available at http://localhost:3000
Convex dashboard: https://dashboard.convex.dev

### Convex deployment

- Project: `spc` — team: `alexander-s`
- Deployment: `acoustic-civet-581` (EU West region)
- URL: `https://acoustic-civet-581.eu-west-1.convex.cloud`
- HTTP actions URL: `https://acoustic-civet-581.eu-west-1.convex.site`

### Admin bootstrap

Promote a user to superadmin via the Convex dashboard by running `users:seedSuperAdmin` with `{ email, role: "superadmin" }`.

## Color Scheme

- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`

## Auth — Clerk

Auth is fully handled by Clerk. There is no `convex/auth.ts`.

- Login page: `src/app/login/[[...rest]]/page.tsx` — uses `<SignIn>` component
- Register page: `src/app/register/[[...rest]]/page.tsx` — uses `<SignUp>` component
- Route protection: `src/proxy.ts` — uses `clerkMiddleware` to protect `/dashboard` and `/admin`
- Provider: `src/components/ConvexClientProvider.tsx` — `ClerkProvider` wrapping `ConvexProviderWithClerk`

In frontend components, use Clerk hooks:

```typescript
import { useAuth, useClerk } from "@clerk/nextjs";
const { isSignedIn } = useAuth();
const { signOut } = useClerk();
```

Login/register routes must be catch-all (`[[...rest]]`) — Clerk requires this for its internal routing.

## Convex functions

All backend logic lives in `frontend/convex/`. Users are identified by their Clerk user ID (`clerkId`), looked up via the `by_clerk_id` index.

### Users (`convex/users.ts`)

- `users.getMe` — query: current user record (returns `null` if not authenticated)
- `users.listAll` — query: all users (admin only)
- `users.upsertFromClerk` — internal mutation: called by Clerk webhook to sync users
- `users.deleteByClerkId` — internal mutation: called by Clerk webhook on user deletion
- `users.seedSuperAdmin` — mutation: promote user to superadmin by email

User lookup pattern (used in all Convex functions):

```typescript
const identity = await ctx.auth.getUserIdentity();
const user = await ctx.db
  .query("users")
  .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
  .unique();
```

### Bookings (`convex/bookings.ts`)

- `bookings.getMyBookings` — query: current user's bookings (auth required)
- `bookings.getAvailability` — query: approved dates + blocked dates for calendar (auth required)
- `bookings.createBooking` — mutation: `{ date, startTime, endTime, purpose, attendees }` (auth required)
- `bookings.updateBooking` — mutation: `{ bookingId, date, startTime, endTime, purpose, attendees }` (owner, pending only)
- `bookings.cancelBooking` — mutation: `{ bookingId }` (owner, pending only)

#### Booking validation (enforced on create and update)

- Date must not be in the past
- Start time: 06:00–20:00; end time: ≤ 20:00; end must be after start
- Attendees: 1–50
- Date must not be blocked
- Hall-wide conflict: any approved booking from any user blocks the slot

### Admin (`convex/admin.ts`)

- `admin.getAllBookings` — query: all bookings with user details (admin only)
- `admin.updateBookingStatus` — mutation: `{ bookingId, status: "approved"|"rejected"|"pending" }` (admin only)
- `admin.getBlockedDates` — query: all blocked dates (admin only)
- `admin.blockDate` — mutation: `{ date, reason }` (admin only)
- `admin.unblockDate` — mutation: `{ date }` (admin only)
- `admin.listUsers` — query: all users (admin only)

### Chat (`convex/chat.ts`)

- `chat.getGreeting` — query: static greeting message
- `chat.sendMessage` — action: `{ message, history }` → `{ reply, bookingAction, updateAction, cancelAction }`

Chat response may include one of three action payloads (camelCase):

- `bookingAction` — new booking details (triggered by `BOOKING_ACTION:` marker in AI reply)
- `updateAction` — updated booking details incl. `bookingId` (triggered by `UPDATE_ACTION:`)
- `cancelAction` — `{ bookingId }` to cancel (triggered by `CANCEL_ACTION:`)

### Clerk webhook (`convex/http.ts`)

HTTP action at `/clerk-webhook` (POST) — receives Clerk `user.created`, `user.updated`, `user.deleted` events and syncs the Convex `users` table. Verified using `svix`.

## Environment variables

### `frontend/.env.local` (local dev — never commit)

| Variable | Notes |
| -------- | ----- |
| `CONVEX_DEPLOYMENT` | Auto-generated by `npx convex dev` |
| `NEXT_PUBLIC_CONVEX_URL` | Convex cloud URL used by the React client |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dev publishable key (`pk_test_...`) |
| `CLERK_SECRET_KEY` | Clerk dev secret key (`sk_test_...`) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/login` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/register` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/dashboard` |

### Convex dashboard environment variables

| Variable | Notes |
| -------- | ----- |
| `CLERK_JWT_ISSUER_DOMAIN` | Clerk JWT issuer URL (from Clerk → JWT Templates → convex) |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signing secret (`whsec_...`) |
| `OPENROUTER_API_KEY` | API key for OpenRouter/Cerebras AI |

## Implementation status

### KAN-1 — Frontend prototype (done)

Next.js landing page, login, register, user dashboard, booking calendar, admin dashboard, admin users page. All UI with SPC colour scheme.

### KAN-2 — Convex backend (done, merged to main)

Full migration from FastAPI/SQLite to Convex cloud:

- Schema: `bookings`, `blockedDates`, `users` tables with all indexes
- All booking, admin, chat, and user functions implemented
- Frontend wired to Convex hooks throughout

### KAN-3 — AI Chat (done, merged to main)

- `chat.sendMessage` action — LiteLLM via OpenRouter with Cerebras (`gpt-oss-120b`)
- System prompt includes live hall availability + user's bookings
- AI handles booking, update, and cancel flows via `BOOKING_ACTION`, `UPDATE_ACTION`, `CANCEL_ACTION` markers
- `ChatWidget.tsx` handles all three action types with confirmation cards

### KAN-4 — UI polish (done, merged to main)

- Professional Christian SaaS look across all screens
- SPC logo, team portraits, group photos from reference site
- Mobile-friendly layout with icons throughout

### Clerk auth migration (done, merged to main)

Replaced `@convex-dev/auth` Password provider with Clerk:

- `ClerkProvider` + `ConvexProviderWithClerk` in `ConvexClientProvider.tsx`
- Login/register pages use Clerk `<SignIn>` / `<SignUp>` components (catch-all routes)
- Route protection via `src/proxy.ts` using `clerkMiddleware`
- Clerk webhook syncs users to Convex `users` table via `convex/http.ts`
- All Convex functions look up users by `clerkId` via `by_clerk_id` index
- RSA keys (`JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL`) removed from Convex
