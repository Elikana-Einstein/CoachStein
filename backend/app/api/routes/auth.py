from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials

from app.api.dependencies import bearer_scheme, get_current_user
from app.core.supabase import supabase_request
from app.schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse, UserResponse

router = APIRouter()


def auth_response(payload: dict) -> TokenResponse:
    user = payload.get("user") or payload
    return TokenResponse(
        access_token=payload.get("access_token"),
        refresh_token=payload.get("refresh_token"),
        expires_in=payload.get("expires_in"),
        user=UserResponse(id=user["id"], email=user.get("email", "")),
    )


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(payload: RegisterRequest):
    result = await supabase_request(
        "POST",
        "/auth/v1/signup",
        body={"email": payload.email.strip().lower(), "password": payload.password},
    )
    return auth_response(result)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest):
    result = await supabase_request(
        "POST",
        "/auth/v1/token",
        params={"grant_type": "password"},
        body={"email": payload.email.strip().lower(), "password": payload.password},
    )
    return auth_response(result)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_session(payload: RefreshRequest):
    result = await supabase_request(
        "POST",
        "/auth/v1/token",
        params={"grant_type": "refresh_token"},
        body={"refresh_token": payload.refresh_token},
    )
    return auth_response(result)


@router.post("/logout", status_code=204)
async def logout(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    _user: UserResponse = Depends(get_current_user),
):
    if credentials is None:
        return None
    await supabase_request(
        "POST",
        "/auth/v1/logout",
        access_token=credentials.credentials,
    )


@router.get("/me", response_model=UserResponse)
async def read_current_user(user: UserResponse = Depends(get_current_user)):
    return user
