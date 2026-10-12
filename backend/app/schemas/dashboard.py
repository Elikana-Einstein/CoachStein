from typing import Literal

from pydantic import BaseModel


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


