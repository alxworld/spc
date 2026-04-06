# SPC Prayer Hall Booking — Code Review Report

**Scope**: Full codebase review of `/home/alex/aiprj/spc` including backend (FastAPI/Python), frontend (Next.js/TypeScript), Docker configuration, and deployment scripts.

**Review date**: 2026-04-06

---

## Executive Summary

The codebase is well-structured and functional for its scope. Authentication via httponly cookies is correctly implemented, SQL queries use parameterized statements throughout (no injection vulnerabilities), and the AI chat action workflow is coherent. However, there are several issues ranging in severity from a production-breaking bug in the API client to meaningful security gaps and dead code that should be addressed before a production launch.

**Issue count**: 3 Critical, 4 High, 4 Medium, 2 Low

---

## Critical

### C1 — `cancelBooking` always throws in production due to 204 + `res.json()` call

**File**: `frontend/src/lib/api.ts`, line 25

The shared `request<T>` function unconditionally calls `res.json()` on every successful response. The `DELETE /api/bookings/{id}` endpoint returns HTTP 204 No Content, which carries no response body. Calling `.json()` on a 204 response throws a `SyntaxError: Unexpected end of JSON input`, meaning every cancellation — whether initiated from `ChatWidget.tsx` or any future UI — silently fails with an uncaught error that will be surfaced as "Cancellation failed."

The backend at `backend/app/routers/bookings.py` line 97 explicitly declares `status_code=status.HTTP_204_NO_CONTENT`.

**Fix**: Check for 204 before attempting to parse JSON:

```typescript
if (res.status === 204) return undefined as T;
return res.json() as Promise<T>;
```

---

### C2 — Live API key committed to `.env` which is tracked or left in the repository root

**File**: `.env`, line 1

The `.env` file contains a live `OPENROUTER_API_KEY`. While `.env` is listed in `.gitignore`, the file physically exists at the repository root and the `docker-compose.yml` passes it directly into the container via `env_file: .env`. Anyone with filesystem access to the host, or if `.gitignore` is ever misconfigured during a push, this key will leak.

**Fix**: Remove the key from `.env`, add `.env.example` with a placeholder, and inject the real key via Docker secrets or a secrets manager at deploy time.

---

### C3 — JWT cookie is missing `secure=True` flag — token transmitted in plaintext over HTTP

**File**: `backend/app/routers/auth.py`, lines 28–35

The `_set_cookie` function sets `httponly=True` and `samesite="lax"` but omits `secure=True`. Without `secure=True`, the browser will transmit the session cookie over unencrypted HTTP connections, making it trivially interceptable via network sniffing. The `samesite="lax"` attribute does not protect against passive network interception.

For production (behind HTTPS), this is a **blocking** security defect. The fix should be conditional on environment:

```python
response.set_cookie(
    key=COOKIE_NAME,
    value=token,
    max_age=COOKIE_MAX_AGE,
    httponly=True,
    samesite="lax",
    secure=os.getenv("COOKIE_SECURE", "false").lower() == "true",
)
```

---

## High

### H1 — Default `SECRET_KEY` is a hardcoded, publicly visible string

**File**: `backend/app/auth.py`, line 8

```python
SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production-32chars!!")
```

The fallback value is committed to the public repository. If `SECRET_KEY` is not set in the environment (e.g., during local dev, in CI, or if env var injection silently fails in Docker), any party who knows this codebase can forge valid JWT tokens and impersonate any user including superadmins.

**Fix**: Remove the default value entirely and raise a startup error if `SECRET_KEY` is missing or shorter than 32 characters.

---

### H2 — Path traversal vulnerability in the static file server

**File**: `backend/app/main.py`, lines 52–77

The catch-all route handler takes `full_path` from the URL and constructs filesystem paths by doing `FRONTEND_DIR / clean` where `clean = full_path.strip("/")`. There is no check that the resolved path remains under `FRONTEND_DIR`. A request like `GET /../../etc/passwd` or URL-encoded equivalents could resolve to arbitrary filesystem paths and return their content.

**Fix**: Add a boundary check after resolving the path:

```python
resolved = (FRONTEND_DIR / clean).resolve()
if not resolved.is_relative_to(FRONTEND_DIR.resolve()):
    return Response(status_code=400)
```

---

### H3 — `require_admin` is not a proper FastAPI dependency and can be bypassed

**File**: `backend/app/deps.py`, lines 25–29

```python
def require_admin(user: dict = None) -> dict:
    if user["role"] not in ("admin", "superadmin"):
        ...
```

`require_admin` has a default parameter `user: dict = None`. If used directly as `Depends(require_admin)` without the wrapping chain, it would receive `None` and raise an unhandled `TypeError` rather than a 403. The signature is misleading and fragile — a future developer could easily misuse it.

**Fix**: Remove the default and make it a proper chained dependency:

```python
def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user["role"] not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
```

---

### H4 — `python-dotenv` is used but not declared as a project dependency

**File**: `backend/pyproject.toml` and `backend/app/main.py`, line 5

`main.py` imports `from dotenv import load_dotenv`, but `python-dotenv` is not listed in `pyproject.toml`'s `[project.dependencies]`. It appears in `uv.lock` only as a transitive dependency of `litellm`. If `litellm` drops that dependency in a future version, the backend will fail to import at startup.

**Fix**: Add `python-dotenv>=1.0.0` to `pyproject.toml` dependencies and run `uv lock`.

---

## Medium

### M1 — Dead code: KAN-1 mock modules are unused but still in tree

**Files**:

- `frontend/src/lib/auth.ts`
- `frontend/src/lib/store.ts`
- `frontend/src/lib/mockData.ts`
- `frontend/src/types/index.ts`

These are the KAN-1 mock auth and in-memory store modules. CLAUDE.md states they were "since replaced," but they remain in the codebase. `mockData.ts` contains hardcoded admin emails and test booking data. None of these files are imported by any current production page.

**Fix**: Delete all four files.

---

### M2 — Calendar in `book/page.tsx` does not prevent selecting past dates

**File**: `frontend/src/app/dashboard/book/page.tsx`, lines 62–67

The `getDateStatus()` function never checks whether a day is in the past. The backend will correctly reject past-date bookings with a 400, but the user can click on any past date, enter details, and only discover the error after submitting.

**Fix**: Add a past-date check in `getDateStatus`:

```typescript
const today = new Date();
today.setHours(0, 0, 0, 0);
if (new Date(toDateStr(day)) < today) return "blocked"; // reuse blocked styling
```

---

### M3 — Admin API calls have no error handling

**File**: `frontend/src/app/admin/page.tsx`, lines 48–58

`handleUpdateStatus` and `handleAddBlock` are `async` functions that `await` API calls without any try/catch. If the API returns an error, it is swallowed silently — the UI state gets updated optimistically but shows incorrect data with no user feedback.

**Fix**: Wrap both functions in try/catch and display an error toast or inline message.

---

### M4 — Chat system prompt injection via user-controlled booking data

**File**: `backend/app/routers/chat.py`, lines 108–113

The `_get_user_bookings` function inserts raw database values (specifically `purpose`) directly into the system prompt string via f-string interpolation. A user could set a booking purpose to attempt prompt injection — either to confuse the AI's state or trigger false action markers in the response.

**Fix**: At minimum, sanitise or truncate the `purpose` field before embedding it in the system prompt. Consider wrapping user-provided content in explicit labels (e.g., XML-like tags) and instructing the model to treat it as data, not instructions.

---

## Low

### L1 — `ChatRequest.logged_in` field is dead/unused

**File**: `backend/app/routers/chat.py`, lines 121–124

The `ChatRequest` model accepts a `logged_in: bool = False` field, but the `chat()` handler immediately discards it and re-derives the login status from the httponly cookie. The frontend's `sendChatMessage` in `api.ts` also does not send this field.

**Fix**: Remove `logged_in` from `ChatRequest`.

---

### L2 — SQLite WAL pragma is issued on every connection open

**File**: `backend/app/database.py`, line 62

`conn.execute("PRAGMA journal_mode=WAL")` is executed on every call to `get_conn()`. WAL mode is a database-level persistent setting — once set it persists across connections and does not need to be re-applied on every open.

**Fix**: Issue the WAL pragma once in `init_db()`, not in `get_conn()`.

---

## Summary Table

| ID  | Severity | File                                                          | Description                                                       |
| --- | -------- | ------------------------------------------------------------- | ----------------------------------------------------------------- |
| C1  | Critical | `frontend/src/lib/api.ts:25`                                  | `cancelBooking` always throws — `res.json()` on 204 No Content    |
| C2  | Critical | `.env:1`                                                      | Live API key in filesystem                                        |
| C3  | Critical | `backend/app/routers/auth.py:29–35`                           | JWT cookie missing `secure=True` flag                             |
| H1  | High     | `backend/app/auth.py:8`                                       | Hardcoded `SECRET_KEY` default in public codebase                 |
| H2  | High     | `backend/app/main.py:52–77`                                   | Path traversal risk in catch-all static file handler              |
| H3  | High     | `backend/app/deps.py:25–29`                                   | `require_admin` default `None` parameter — fragile and misleading |
| H4  | High     | `backend/pyproject.toml`                                      | `python-dotenv` used but undeclared as dependency                 |
| M1  | Medium   | `frontend/src/lib/{auth,store,mockData}.ts`, `types/index.ts` | Dead KAN-1 mock code left in tree                                 |
| M2  | Medium   | `frontend/src/app/dashboard/book/page.tsx:62–67`              | Calendar allows clicking past dates                               |
| M3  | Medium   | `frontend/src/app/admin/page.tsx:48–58`                       | Admin API calls have no error handling                            |
| M4  | Medium   | `backend/app/routers/chat.py:108–113`                         | User-controlled booking `purpose` injected into LLM system prompt |
| L1  | Low      | `backend/app/routers/chat.py:121–124`                         | `ChatRequest.logged_in` is dead/unused field                      |
| L2  | Low      | `backend/app/database.py:62`                                  | WAL pragma set on every connection, not once                      |
