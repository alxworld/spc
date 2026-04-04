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
   • Cancel booking (optional future)

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
- `GET /api/bookings/availability` - Approved dates + blocked dates for calendar

### Admin
- `GET /api/admin/bookings` - All bookings (admin required)
- `PUT /api/admin/bookings/{id}` - Approve / reject booking (admin required)
- `GET /api/admin/blocked-dates` - List blocked dates (admin required)
- `POST /api/admin/blocked-dates` - Block a date (admin required)
- `DELETE /api/admin/blocked-dates/{date}` - Unblock a date (admin required)
- `GET /api/admin/users` - List all users (admin required)

### Chat (not yet implemented — KAN-3)
- `GET /api/chat/greeting` - Get AI greeting
- `POST /api/chat/message` - Send message, get AI response

### Health
- `GET /api/health` - Health check

## Implementation status

### KAN-1 — Frontend prototype (done)
- Next.js landing page, login, register, user dashboard, booking calendar, admin dashboard, admin users page
- All UI with SPC colour scheme
- Mock auth (localStorage) and in-memory store — since replaced

### KAN-2 — V1 foundation (done, PR #5)
- FastAPI backend with SQLite (users, bookings, blocked_dates tables)
- JWT auth via httponly cookie
- All booking and admin API endpoints implemented
- Next.js static build served by FastAPI (single container)
- Docker + docker-compose setup
- start/stop scripts for Linux, Mac, Windows
- All frontend pages wired to real API — mock auth and store removed
- CORS middleware for local dev
- Group photo added to "Who We Are" landing section

### KAN-3 — AI Chat (next)
- Freeform chat widget on the frontend
- Backend `/api/chat/*` endpoints using LiteLLM + OpenRouter (Cerebras)
- User can query availability and request bookings via chat

### KAN-4 — Final polish (pending)
- UI polish across all screens
- Note: multi-user auth and booking persistence are already done in KAN-2
