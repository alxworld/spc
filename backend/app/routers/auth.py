"""Auth routes: signup, signin, signout, me."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, EmailStr

from app.auth import create_token, hash_password, verify_password
from app.database import get_conn
from app.deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_NAME = "access_token"
COOKIE_MAX_AGE = 7 * 24 * 3600  # 7 days


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class SigninRequest(BaseModel):
    email: EmailStr
    password: str


def _set_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
    )


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest, response: Response):
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    with get_conn() as conn:
        if conn.execute("SELECT id FROM users WHERE email = ?", (body.email,)).fetchone():
            raise HTTPException(status_code=409, detail="Email already registered")
        cursor = conn.execute(
            "INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, 'user', ?)",
            (body.name, body.email, hash_password(body.password), date.today().isoformat()),
        )
        user_id = cursor.lastrowid
    token = create_token(user_id, body.email, "user")
    _set_cookie(response, token)
    return {"id": user_id, "name": body.name, "email": body.email, "role": "user"}


@router.post("/signin")
def signin(body: SigninRequest, response: Response):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, name, email, password_hash, role FROM users WHERE email = ?", (body.email,)
        ).fetchone()
    if not row or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(row["id"], row["email"], row["role"])
    _set_cookie(response, token)
    return {"id": row["id"], "name": row["name"], "email": row["email"], "role": row["role"]}


@router.post("/signout")
def signout(response: Response):
    response.delete_cookie(COOKIE_NAME)
    return {"ok": True}


@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return user
