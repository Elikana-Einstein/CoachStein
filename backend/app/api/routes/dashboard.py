from fastapi import APIRouter, Depends, Path
from fastapi.security import HTTPAuthorizationCredentials

from app.api.dependencies import bearer_scheme, get_current_user
from app.schemas.auth import UserResponse
from app.schemas.dashboard import DashboardResponse, SavedGuidelineResponse, SavedGuidelineWrite
from app.services.dashboard import (
    get_dashboard,
    list_saved_guidelines,
    save_dashboard as persist_dashboard,
    save_guideline,
)

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


@router.get("/guidelines", response_model=list[SavedGuidelineResponse])
async def saved_guidelines(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    user: UserResponse = Depends(get_current_user),
):
    return await list_saved_guidelines(user.id, credentials.credentials)


@router.put("/guidelines/{guideline_id}", response_model=SavedGuidelineResponse)
async def upsert_saved_guideline(
    payload: SavedGuidelineWrite,
    guideline_id: str = Path(min_length=1, max_length=120),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    user: UserResponse = Depends(get_current_user),
):
    return await save_guideline(user.id, credentials.credentials, guideline_id, payload)
