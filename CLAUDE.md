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

The entire project is packaged into a single Docker container.
The backend is in `backend/` — a uv project using FastAPI.
The frontend is in `frontend/` — Next.js 16 with Tailwind CSS 4, statically exported (`output: 'export'`) and served by FastAPI from `backend/frontend_dist/`.
The database uses SQLite at `/tmp/spc.db` (reset each time the container starts).
CORS middleware is enabled for `localhost:3000` during local development.

```bash
# Mac
scripts/start-mac.sh    # Start
scripts/stop-mac.sh     # Stop

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
```

Backend available at http://localhost:8000

### Running locally (outside Docker)

```bash
# Terminal 1 — backend
cd backend
ADMIN_EMAIL=admin@spc.com ADMIN_PASSWORD=admin123 uv run uvicorn app.main:app --reload

# Terminal 2 — frontend
cd frontend
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

### Admin bootstrap

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars. On startup the backend creates a superadmin with those credentials if one does not already exist.

## Color Scheme

- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`

## API Endpoints

### Auth
- `POST /api/auth/signup` - Create new user account, sets JWT cookie
- `POST /api/auth/signin` - Sign in, sets JWT cookie
- `POST /api/auth/signout` - Clear auth cookie
- `GET /api/auth/me` - Get current user info (auth required)

### Bookings (user)
- `GET /api/bookings` - List current user's bookings (auth required)
- `POST /api/bookings` - Create booking request (auth required)
- `PUT /api/bookings/{id}` - Update a pending booking (auth required, owner only)
- `DELETE /api/bookings/{id}` - Cancel a pending booking (auth required, owner only)
- `GET /api/bookings/availability` - Approved dates + blocked dates for calendar

#### Booking validation (enforced on POST and PUT)
- Date must not be in the past
- Start time: 06:00–20:00; end time: ≤ 20:00; end must be after start
- Attendees: 1–50
- Date must not be blocked
- User cannot have two pending/approved bookings overlapping the same slot (409)

### Admin
- `GET /api/admin/bookings` - All bookings (admin required)
- `PUT /api/admin/bookings/{id}` - Approve / reject booking (admin required)
- `GET /api/admin/blocked-dates` - List blocked dates (admin required)
- `POST /api/admin/blocked-dates` - Block a date (admin required)
- `DELETE /api/admin/blocked-dates/{date}` - Unblock a date (admin required)
- `GET /api/admin/users` - List all users (admin required)

### Chat
- `GET /api/chat/greeting` - Get AI greeting
- `POST /api/chat/message` - Send message, get AI response

Chat response may include one of three action payloads:
- `booking_action` — new booking details (triggered by `BOOKING_ACTION:` marker)
- `update_action` — modified booking details incl. `booking_id` (triggered by `UPDATE_ACTION:` marker)
- `cancel_action` — booking id to cancel (triggered by `CANCEL_ACTION:` marker)

### Health
- `GET /api/health` - Health check

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

### KAN-4 — Final polish (next)
- UI polish across all screens to look like a professional Christian SaaS application
- Note: multi-user auth, booking persistence, and AI chat are already done in KAN-2/KAN-3
