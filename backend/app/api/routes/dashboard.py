from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials

from app.api.dependencies import bearer_scheme, get_current_user
from app.schemas.auth import UserResponse
from app.schemas.dashboard import DashboardResponse
from app.services.dashboard import get_dashboard, save_dashboard as persist_dashboard

router = APIRouter()


@router.get("", response_model=DashboardResponse)
async def dashboard_data(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    user: UserResponse = Depends(get_current_user),
):
    return await get_dashboard(user.id, credentials.credentials)


@router.put("", response_model=DashboardResponse)
async def save_dashboard(
    payload: DashboardResponse,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    user: UserResponse = Depends(get_current_user),
):
    return await persist_dashboard(user.id, credentials.credentials, payload)
