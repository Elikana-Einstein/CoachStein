from fastapi import APIRouter, Depends
from app.api.dependencies import get_current_user
from app.schemas.auth import UserResponse
from app.schemas.coachstein import (
    GenerateGuidelineRequest,
    GenerateGuidelineResponse,
    ProgressAnalysisRequest,
    ProgressAnalysisResponse,
    ChatRequest,
    ChatResponse,
)
from app.services.coachstein import analyze_progress, generate_guideline, chat

router = APIRouter()


@router.post("/guidelines", response_model=GenerateGuidelineResponse)
async def create_guideline(
    payload: GenerateGuidelineRequest,
    _user: UserResponse = Depends(get_current_user),
):
    return await generate_guideline(payload)


@router.post("/progress-analysis", response_model=ProgressAnalysisResponse)
async def progress_analysis(
    payload: ProgressAnalysisRequest,
    _user: UserResponse = Depends(get_current_user),
):
    return await analyze_progress(payload)


@router.post("/chat", response_model=ChatResponse)
async def chat_with_coachstein(
    payload: ChatRequest,
    _user: UserResponse = Depends(get_current_user),
):
    return await chat(payload)

