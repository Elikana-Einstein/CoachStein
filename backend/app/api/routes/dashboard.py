from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.roadmap import Roadmap, RoadmapStage
from app.models.user import User
from app.schemas.dashboard import DashboardItem, DashboardResponse, DashboardRoadmap, DashboardStage

router = APIRouter()


@router.get("", response_model=DashboardResponse)
def dashboard_data(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    roadmap = db.scalar(
        select(Roadmap)
        .options(selectinload(Roadmap.stages).selectinload(RoadmapStage.items))
        .where(Roadmap.user_id == user.id)
        .order_by(Roadmap.id)
    )
    if roadmap is None:
        return DashboardResponse(
            roadmap=DashboardRoadmap(title="", stages=[]),
            progress={},
        )

    progress: dict[str, bool] = {}
    stages: list[DashboardStage] = []
    for stage in roadmap.stages:
        stage_id = stage.client_id or str(stage.id)
        items: list[DashboardItem] = []
        for item in stage.items:
            item_id = item.client_id or str(item.id)
            progress[item_id] = item.completed
            items.append(DashboardItem(id=item_id, label=item.label, kind=item.kind))
        stages.append(
            DashboardStage(
                id=stage_id,
                num=stage.number,
                title=stage.title,
                duration=stage.duration,
                summary=stage.summary,
                items=items,
            )
        )

    return DashboardResponse(
        roadmap=DashboardRoadmap(title=roadmap.title, stages=stages),
        progress=progress,
    )
