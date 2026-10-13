from asyncio import gather
from datetime import datetime, timezone
from uuid import UUID

from app.core.supabase import supabase_request
from app.schemas.dashboard import (
    DashboardItem,
    DashboardResponse,
    DashboardRoadmap,
    DashboardStage,
    SavedGuidelineResponse,
    SavedGuidelineWrite,
)


async def list_saved_guidelines(user_id: UUID, access_token: str) -> list[SavedGuidelineResponse]:
    rows = await supabase_request(
        "GET",
        "/rest/v1/saved_guidelines",
        access_token=access_token,
        params={
            "user_id": f"eq.{user_id}",
            "select": "id,title,stages,progress,updated_at",
            "order": "updated_at.desc",
            "limit": "50",
        },
    )
    return [SavedGuidelineResponse.model_validate(row) for row in rows]


async def save_guideline(
    user_id: UUID,
    access_token: str,
    guideline_id: str,
    payload: SavedGuidelineWrite,
) -> SavedGuidelineResponse:
    rows = await supabase_request(
        "POST",
        "/rest/v1/saved_guidelines",
        access_token=access_token,
        params={"on_conflict": "user_id,id"},
        body={
            "user_id": str(user_id),
            "id": guideline_id,
            "title": payload.title,
            "stages": [stage.model_dump(mode="json") for stage in payload.stages],
            "progress": payload.progress,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        prefer="resolution=merge-duplicates,return=representation",
    )
    if rows:
        return SavedGuidelineResponse.model_validate(rows[0])
    saved = await supabase_request(
        "GET",
        "/rest/v1/saved_guidelines",
        access_token=access_token,
        params={"user_id": f"eq.{user_id}", "id": f"eq.{guideline_id}", "select": "id,title,stages,progress,updated_at", "limit": "1"},
    )
    return SavedGuidelineResponse.model_validate(saved[0])


async def get_dashboard(user_id: UUID, access_token: str) -> DashboardResponse:
    owner_filter = {"user_id": f"eq.{user_id}"}
    roadmaps, stages, items, progress_rows = await gather(
        supabase_request("GET", "/rest/v1/roadmaps", access_token=access_token, params={**owner_filter, "select": "title", "limit": "1"}),
        supabase_request("GET", "/rest/v1/stages", access_token=access_token, params={**owner_filter, "select": "id,position,num,title,duration,summary", "order": "position.asc"}),
        supabase_request("GET", "/rest/v1/items", access_token=access_token, params={**owner_filter, "select": "id,stage_id,position,label,kind", "order": "position.asc"}),
        supabase_request("GET", "/rest/v1/progress", access_token=access_token, params={**owner_filter, "select": "item_id,done"}),
    )

    items_by_stage: dict[str, list[DashboardItem]] = {}
    for item in items:
        items_by_stage.setdefault(item["stage_id"], []).append(
            DashboardItem(id=item["id"], label=item["label"], kind=item["kind"])
        )

    dashboard_stages = [
        DashboardStage(
            id=stage["id"],
            num=stage["num"],
            title=stage["title"],
            duration=stage["duration"],
            summary=stage["summary"],
            items=items_by_stage.get(stage["id"], []),
        )
        for stage in stages
    ]
    progress = {row["item_id"]: row["done"] for row in progress_rows}
    title = roadmaps[0]["title"] if roadmaps else ""
    return DashboardResponse(
        roadmap=DashboardRoadmap(title=title, stages=dashboard_stages),
        progress=progress,
    )


async def save_dashboard(user_id: UUID, access_token: str, payload: DashboardResponse) -> DashboardResponse:
    await supabase_request(
        "POST",
        "/rest/v1/rpc/save_roadmap",
        access_token=access_token,
        body={
            "p_title": payload.roadmap.title,
            "p_stages": [stage.model_dump(mode="json") for stage in payload.roadmap.stages],
        },
    )

    progress_rows = [
        {"item_id": item.id, "done": payload.progress.get(item.id, False)}
        for stage in payload.roadmap.stages
        for item in stage.items
    ]
    if progress_rows:
        await supabase_request(
            "POST",
            "/rest/v1/progress",
            access_token=access_token,
            params={"on_conflict": "user_id,item_id"},
            body=progress_rows,
            prefer="resolution=merge-duplicates,return=minimal",
        )

    return await get_dashboard(user_id, access_token)
