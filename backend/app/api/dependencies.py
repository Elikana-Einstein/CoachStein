from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.supabase import supabase_request
from app.schemas.auth import UserResponse

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> UserResponse:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Valid bearer token required",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise unauthorized
    try:
        payload = await supabase_request(
            "GET",
            "/auth/v1/user",
            access_token=credentials.credentials,
        )
        return UserResponse(id=payload["id"], email=payload.get("email", ""))
    except HTTPException as exc:
        if exc.status_code not in (400, 401, 403):
            raise
        raise unauthorized from None
    except (KeyError, TypeError, ValueError):
        raise unauthorized
