import httpx
from fastapi import HTTPException

from app.core.config import settings


def _base_url() -> str:
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(
            status_code=503,
            detail="Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in backend/.env.",
        )
    return settings.supabase_url.rstrip("/")


async def supabase_request(
    method: str,
    path: str,
    *,
    access_token: str | None = None,
    body: dict | list | None = None,
    params: dict[str, str] | None = None,
    prefer: str | None = None,
):
    headers = {"apikey": settings.supabase_anon_key}
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    if prefer:
        headers["Prefer"] = prefer
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.request(
                method,
                f"{_base_url()}{path}",
                headers=headers,
                json=body,
                params=params,
            )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail="Could not connect to Supabase.") from exc

    if response.is_error:
        try:
            payload = response.json()
        except ValueError:
            payload = {}
        detail = (
            payload.get("msg")
            or payload.get("message")
            or payload.get("error_description")
            or payload.get("error")
            or "Supabase request failed."
        ) if isinstance(payload, dict) else "Supabase request failed."
        status_code = response.status_code if response.status_code < 500 else 502
        raise HTTPException(status_code=status_code, detail=detail)

    if response.status_code == 204 or not response.content:
        return None
    return response.json()
