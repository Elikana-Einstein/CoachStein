from typing import Literal

from datetime import datetime

from pydantic import BaseModel, Field


class DashboardItem(BaseModel):
    id: str
    label: str
    kind: Literal["task", "project", "milestone"]


class DashboardStage(BaseModel):
    id: str
    num: int
    title: str
    duration: str
    summary: str
    items: list[DashboardItem]


class DashboardRoadmap(BaseModel):
    title: str
    stages: list[DashboardStage]


class DashboardResponse(BaseModel):
    """Data contract matching frontend/src/data/roadmap.ts."""

    roadmap: DashboardRoadmap
    progress: dict[str, bool]


class SavedGuidelineWrite(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    stages: list[DashboardStage] = Field(max_length=100)
    progress: dict[str, bool] = Field(default_factory=dict)


class SavedGuidelineResponse(SavedGuidelineWrite):
    id: str
    updated_at: datetime


