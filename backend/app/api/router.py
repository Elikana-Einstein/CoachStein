from fastapi import APIRouter

from app.api.routes import auth, coachstein, dashboard

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(coachstein.router, prefix="/ai", tags=["coachstein-ai"])
