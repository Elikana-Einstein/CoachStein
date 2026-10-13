from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.schemas.dashboard import DashboardResponse


class GenerateGuidelineRequest(BaseModel):
    learning_goal: str = Field(min_length=8, max_length=1800)
    current_level: str | None = Field(default=None, max_length=300)
    weekly_hours: int | None = Field(default=None, ge=1, le=80)
    target_weeks: int | None = Field(default=None, ge=1, le=52)


class GeneratedItem(BaseModel):
    label: str = Field(min_length=3, max_length=180)
    kind: Literal["task", "project", "milestone"]


class GeneratedStage(BaseModel):
    title: str = Field(min_length=3, max_length=100)
    duration: str = Field(min_length=1, max_length=40)
    summary: str = Field(min_length=10, max_length=240)
    items: list[GeneratedItem] = Field(min_length=3, max_length=12)

    @model_validator(mode="after")
    def has_project_and_checkpoint(self):
        kinds = {item.kind for item in self.items}
        if "project" not in kinds or "milestone" not in kinds:
            raise ValueError("Every stage needs a project and a completion checkpoint.")
        if sum(item.kind == "task" for item in self.items) < 2:
            raise ValueError("Every stage needs at least two task items.")
        return self


class GeneratedGuideline(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    stages: list[GeneratedStage] = Field(min_length=3, max_length=8)


class GenerateGuidelineResponse(BaseModel):
    title: str
    guideline: str
    stage_count: int
    item_count: int


class ProgressAnalysisRequest(BaseModel):
    dashboard: DashboardResponse


class StageProgress(BaseModel):
    id: str
    number: int
    title: str
    done: int
    total: int
    percent: int
    status: Literal["not-started", "in-progress", "complete"]


class Recommendation(BaseModel):
    title: str
    detail: str
    next_step: str


class ProgressAnalysisResponse(BaseModel):
    roadmap_title: str
    percent: int
    completed_items: int
    total_items: int
    completed_stages: int
    total_stages: int
    stage_progress: list[StageProgress]
    summary: str
    strengths: list[str]
    recommendations: list[Recommendation]
    weekly_focus: str


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=24)


class ChatResponse(BaseModel):
    reply: str

