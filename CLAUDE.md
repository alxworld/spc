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
   • Register account
   • Login
   • View Prayer Hall availability
   • Book Prayer Hall
   • View booking status
   • Cancel pending booking
   • Modify pending booking

2. Admin User should be able to :
   • View all bookings
   • Approve booking
   • Reject booking
   • Block dates
   • Manage users

3. Super Admin User should be able to :
   • Add/remove admins
   • Full system control

## Development process

When instructed to build a feature:

1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

## AI design

When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-120b` model with Cerebras as the inference provider. The chat should be freeform — the AI greets the user and helps them query availability or make a booking through natural conversation.

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical design

The frontend is in `frontend/` — Next.js 16 with Tailwind CSS 4, statically exported (`output: 'export'`).
The backend is **Convex** (cloud) — all data, auth, and business logic live in `frontend/convex/`.
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

### Admin bootstrap

Promote a user to superadmin via the Convex dashboard by calling `users.seedSuperAdmin` with the user's email, or run it from the Convex CLI.

## Color Scheme

- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`

## Convex functions

All backend logic lives in `frontend/convex/`. Auth uses `@convex-dev/auth` with the Password provider.

### Auth (`convex/auth.ts`)
- `signIn("password", { email, password, flow: "signIn" })` — sign in via `useAuthActions()`
- `signIn("password", { email, password, name, flow: "signUp" })` — register
- `signOut()` — sign out

### Users (`convex/users.ts`)
- `users.getMe` — query: current user record (returns `null` if not authenticated)
- `users.listAll` — query: all users (admin only)
- `users.seedSuperAdmin` — mutation: promote user to superadmin by email

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
- Per-user conflict: user cannot have two pending/approved bookings overlapping the same slot

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

## Implementation status

### KAN-1 — Frontend prototype (done)
- Next.js landing page, login, register, user dashboard, booking calendar, admin dashboard, admin users page
- All UI with SPC colour scheme
- Mock auth (localStorage) and in-memory store — since replaced

### KAN-2 — V1 foundation (done, merged to main)
- FastAPI backend with SQLite (users, bookings, blocked_dates tables)
- JWT auth via httponly cookie
- All booking and admin API endpoints implemented
- Superadmin seed via `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars on startup
- Next.js static build served by FastAPI (single container)
- Docker + docker-compose setup; `env_file: .env` passes secrets into container
- start/stop scripts for Linux, Mac, Windows
- All frontend pages wired to real API — mock auth and store removed
- CORS middleware for local dev (`CORS_ORIGINS` env var, default `localhost:3000`)
- Group photo added to "Who We Are" landing section
- SPA routing fix: explicit catch-all route in FastAPI so direct navigation and refresh work on all pages

### KAN-3 — AI Chat (done, merged to main)
- Backend `/api/chat/greeting` and `/api/chat/message` endpoints
- LiteLLM via OpenRouter with Cerebras (`gpt-oss-120b`) inference provider
- System prompt includes live hall availability + current user's personal bookings (with booking IDs) from DB
- Auth-aware: JWT cookie read server-side — unauthenticated users directed to /login before booking
- AI collects booking details via freeform conversation; emits `BOOKING_ACTION` when confirmed
- AI can also modify pending bookings (`UPDATE_ACTION`) and cancel pending bookings (`CANCEL_ACTION`)
- `ChatWidget` handles all three action types with confirmation cards and inline error messages
- Auth re-checked on every route change (`usePathname`) so confirm button updates after login
- Input box auto-focuses when widget opens and after each AI response

### Booking cancel/update (done, merged to main)
- `DELETE /api/bookings/{id}` — cancel own pending booking
- `PUT /api/bookings/{id}` — update own pending booking
- Full validation on create and update: date not in past, hours 06:00–20:00, attendees 1–50, no overlapping slots, date not blocked
- `api.ts`: `cancelBooking`, `updateBooking` helpers; `UpdateAction`, `CancelAction` types added

### KAN-4 — Final polish (done, merged to main)

- UI polish across all screens to look like a professional Christian SaaS application
- Icons added across all pages; mobile-friendly layout

### Code review & security hardening (done)

Full code review (`code_review.md` in repo root) with all issues fixed:

- `COOKIE_SECURE` env var added — set to `true` in production to enable secure flag on JWT cookie
- `SECRET_KEY` default removed; startup raises `RuntimeError` if missing or < 32 chars
- Path traversal guard added to catch-all static file handler (`_within_frontend()`)
- `require_admin` refactored to proper FastAPI `Depends(get_current_user)` chain; `_admin_user` wrapper removed from `admin.py`
- `python-dotenv` added as explicit dependency in `pyproject.toml`
- Dead KAN-1 mock files deleted (`auth.ts`, `store.ts`, `mockData.ts`, `types/index.ts`); `teamMembers` data inlined into `TeamSection.tsx`
- `api.ts`: fixed `res.json()` being called on 204 No Content (broke `cancelBooking`)
- Admin page: error state with dismissible banner added to all three admin action handlers
- Calendar: past dates now blocked client-side in `getDateStatus()`
- Chat: `purpose` field truncated to 200 chars before embedding in LLM system prompt; dead `logged_in` field removed from `ChatRequest`
- SQLite WAL pragma moved from `get_conn()` to `init_db()` (set once, not on every connection)
- Hall-wide booking conflict check added (`_check_hall_slot_conflict`) — approved bookings from any user block the slot; applies to both booking form and AI chat

### Convex migration (done, merged to main)

Full migration from FastAPI/SQLite to Convex cloud database:

- **Schema** (`convex/schema.ts`): `bookings`, `blockedDates`, `users` (extends authTables) with all indexes
- **Auth** (`convex/auth.ts`): `@convex-dev/auth` with Password provider; RSA `JWT_PRIVATE_KEY` + `JWKS` set in Convex dashboard
- **Convex functions**: `bookings.ts`, `admin.ts`, `chat.ts`, `users.ts`, `http.ts`
- **Frontend wiring** — all pages replaced fetch-based `api.ts` calls with Convex hooks:
  - `login/page.tsx`: `useAuthActions().signIn("password", { flow: "signIn" })`
  - `register/page.tsx`: `useAuthActions().signIn("password", { flow: "signUp" })`
  - `Navbar.tsx`: `useConvexAuth()` + `useQuery(api.users.getMe)` + `useAuthActions().signOut()`
  - `dashboard/page.tsx`: reactive `useQuery(api.bookings.getMyBookings)`; auto-redirects admins to `/admin`
  - `dashboard/book/page.tsx`: `useQuery(api.bookings.getAvailability)` + `useMutation(api.bookings.createBooking)`
  - `admin/page.tsx`: reactive queries + mutations; UI auto-refreshes without manual state updates
  - `admin/users/page.tsx`: `useQuery(api.admin.listUsers)`
  - `ChatWidget.tsx`: `useAction(api.chat.sendMessage)` + booking mutations; action fields use camelCase
- All IDs are Convex string IDs (no longer numeric)
- `"skip"` string used for conditional query execution (Convex 1.34.x, no `skipToken`)
- Build passes cleanly — all 10 pages compile and are statically exported

### Environment variables

Convex env vars are set in the Convex dashboard (not in a local `.env`):

| Variable | Where | Notes |
| -------- | ----- | ----- |
| `OPENROUTER_API_KEY` | Convex dashboard | API key for OpenRouter/Cerebras AI |
| `JWT_PRIVATE_KEY` | Convex dashboard | RSA private key for `@convex-dev/auth` |
| `JWKS` | Convex dashboard | Corresponding public key set |
| `SITE_URL` | Convex dashboard | Frontend URL (e.g. `http://localhost:3000`) |

Local frontend env (auto-generated by `npx convex dev` into `frontend/.env.local`):

| Variable | Notes |
| -------- | ----- |
| `CONVEX_DEPLOYMENT` | Convex deployment ID |
| `NEXT_PUBLIC_CONVEX_URL` | Convex cloud URL used by the React client |
