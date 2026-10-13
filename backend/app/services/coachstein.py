import json

import httpx
from fastapi import HTTPException

from app.core.config import settings
from app.schemas.coachstein import (
    GeneratedGuideline,
    GenerateGuidelineRequest,
    ProgressAnalysisResponse,
    ProgressAnalysisRequest,
    Recommendation,
    StageProgress,
    ChatRequest,
)

GEMINI_GENERATE_CONTENT_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

GUIDELINE_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "stages": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "duration": {"type": "string"},
                    "summary": {"type": "string"},
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "label": {"type": "string"},
                                "kind": {"type": "string", "enum": ["task", "project", "milestone"]},
                            },
                            "required": ["label", "kind"],
                            "additionalProperties": False,
                        },
                    },
                },
                "required": ["title", "duration", "summary", "items"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["title", "stages"],
    "additionalProperties": False,
}

ANALYSIS_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "strengths": {"type": "array", "items": {"type": "string"}},
        "recommendations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "detail": {"type": "string"},
                    "next_step": {"type": "string"},
                },
                "required": ["title", "detail", "next_step"],
                "additionalProperties": False,
            },
        },
        "weekly_focus": {"type": "string"},
    },
    "required": ["summary", "strengths", "recommendations", "weekly_focus"],
    "additionalProperties": False,
}

ROADMAP_EXAMPLE = """# KiCad: beginner to pro

## Stage 1: Schematic basics (1-2 weeks)
Draw clean, correct schematics in KiCad.
- Install KiCad and create a new project
- Place symbols, wires, labels and power symbols
**Project:** Build a simple LED blinker circuit
**Done when:** Your schematic passes ERC with no unexplained warnings

## Stage 2: First PCB, design to fab (2-3 weeks)
Take a board from schematic to a physical order.
- Draw the board outline and place components
- Route the board and run DRC
**Project:** Design a small microcontroller board
**Done when:** You have received the board and verified that it works"""


async def _structured_response(name: str, schema: dict, instructions: str, input_text: str) -> dict:
    if not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="CoachStein AI is not configured. Add GEMINI_API_KEY to the backend environment.")

    payload = {
        "systemInstruction": {"parts": [{"text": f"{instructions}\n\nReturn a JSON object matching this schema ({name}):\n{json.dumps(schema)}"}]},
        "contents": [{"role": "user", "parts": [{"text": input_text}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": schema,
            "maxOutputTokens": 5000,
        },
    }
    try:
        async with httpx.AsyncClient(timeout=75) as client:
            response = await client.post(
                GEMINI_GENERATE_CONTENT_URL.format(model=settings.gemini_model),
                headers={"x-goog-api-key": settings.gemini_api_key},
                json=payload,
            )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail="Could not connect to the AI service.") from exc

    if response.is_error:
        if response.status_code in (401, 403):
            raise HTTPException(status_code=503, detail="The Gemini API key or model permissions are invalid.")
        if response.status_code == 429:
            raise HTTPException(status_code=503, detail="Gemini is rate limited or out of available quota. Try again shortly.")
        raise HTTPException(status_code=502, detail="Gemini could not complete this request. Check GEMINI_MODEL is available to your key.")

    try:
        response_payload = response.json()
        output = "".join(
            part.get("text", "")
            for candidate in response_payload.get("candidates", [])
            for part in candidate.get("content", {}).get("parts", [])
            if isinstance(part.get("text"), str)
        )
        if not output:
            raise ValueError("No structured output was returned")
        return json.loads(output)
    except (ValueError, TypeError, AttributeError) as exc:
        raise HTTPException(status_code=502, detail="The AI service returned an unreadable response. Please try again.") from exc


async def chat(payload: ChatRequest) -> dict:
    if not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="CoachStein AI is not configured. Add GEMINI_API_KEY to the backend environment.")
    # Keep the conversation bounded and require alternating user/assistant turns.
    messages = payload.messages[-20:]
    # Gemini conversations should begin with a user turn; trimming may otherwise
    # leave an assistant message at the front of a long-running chat.
    if messages and messages[0].role == "assistant":
        messages = messages[1:]
    if messages[-1].role != "user":
        raise HTTPException(status_code=422, detail="The last chat message must be from you.")
    if any(a.role == b.role for a, b in zip(messages, messages[1:])):
        raise HTTPException(status_code=422, detail="Chat messages must alternate between you and CoachStein.")

    request_body = {
        "systemInstruction": {"parts": [{"text": "You are CoachStein, a helpful, thoughtful AI assistant for a mechatronics engineer. Answer general questions clearly, explain technical concepts accurately, and adapt detail to the user's question. For engineering or coding advice, include practical examples when useful. If unsure, say so. Keep responses readable with Markdown. Do not claim access to the user's roadmap, files, or account unless they are included in the conversation."}]},
        "contents": [
            {"role": "model" if message.role == "assistant" else "user", "parts": [{"text": message.content.strip()}]}
            for message in messages
        ],
        "generationConfig": {"maxOutputTokens": 1800, "temperature": 0.7},
    }
    try:
        async with httpx.AsyncClient(timeout=75) as client:
            response = await client.post(
                GEMINI_GENERATE_CONTENT_URL.format(model=settings.gemini_model),
                headers={"x-goog-api-key": settings.gemini_api_key},
                json=request_body,
            )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail="Could not connect to the AI service.") from exc

    if response.is_error:
        if response.status_code in (401, 403):
            raise HTTPException(status_code=503, detail="The Gemini API key or model permissions are invalid.")
        if response.status_code == 429:
            raise HTTPException(status_code=503, detail="Gemini is rate limited or out of available quota. Try again shortly.")
        raise HTTPException(status_code=502, detail="Gemini could not complete this chat. Please try again.")
    try:
        response_payload = response.json()
        reply = "".join(
            part.get("text", "")
            for candidate in response_payload.get("candidates", [])
            for part in candidate.get("content", {}).get("parts", [])
            if isinstance(part.get("text"), str)
        ).strip()
        if not reply:
            raise ValueError("No chat text was returned")
        return {"reply": reply}
    except (ValueError, TypeError, AttributeError) as exc:
        raise HTTPException(status_code=502, detail="Gemini returned an unreadable reply. Please try again.") from exc


def _to_guideline(plan: GeneratedGuideline) -> str:
    lines = [f"# {plan.title}", ""]
    for index, stage in enumerate(plan.stages, start=1):
        lines.extend([f"## Stage {index}: {stage.title} ({stage.duration})", stage.summary])
        for item in stage.items:
            if item.kind == "task":
                lines.append(f"- {item.label}")
            elif item.kind == "project":
                lines.append(f"**Project:** {item.label}")
            else:
                lines.append(f"**Done when:** {item.label}")
        lines.append("")
    return "\n".join(lines).strip()


async def generate_guideline(payload: GenerateGuidelineRequest):
    instructions = f"""You are CoachStein, a practical engineering learning-path designer.
Create a realistic step-by-step learning guideline using the exact Markdown pattern shown in this example. Preserve the pattern: one # title; numbered ## Stage headings with a duration in parentheses; one concise plain-text stage summary; actionable task bullets; a **Project:** line; and a **Done when:** checkpoint. Every generated stage must contain at least two task items, one project item, and one milestone/checkpoint item. Use concrete, achievable tasks and sequence prerequisites before advanced work. Adapt the stage count and pace to the learner's goal and constraints. Do not invent external URLs or cite unverifiable resources. Output only fields required by the schema.

Formatting example:
{ROADMAP_EXAMPLE}"""
    prompt = {
        "learning_goal": payload.learning_goal.strip(),
        "current_level": payload.current_level.strip() if payload.current_level else "Not specified",
        "weekly_hours": payload.weekly_hours,
        "target_weeks": payload.target_weeks,
    }
    result = await _structured_response("learning_guideline", GUIDELINE_SCHEMA, instructions, json.dumps(prompt))
    try:
        plan = GeneratedGuideline.model_validate(result)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="The AI-generated guideline did not match the expected structure. Try again.") from exc
    guideline = _to_guideline(plan)
    item_count = sum(len(stage.items) for stage in plan.stages)
    return {
        "title": plan.title,
        "guideline": guideline,
        "stage_count": len(plan.stages),
        "item_count": item_count,
    }


async def analyze_progress(payload: ProgressAnalysisRequest) -> ProgressAnalysisResponse:
    roadmap = payload.dashboard.roadmap
    all_items = [item for stage in roadmap.stages for item in stage.items]
    if not all_items:
        raise HTTPException(status_code=422, detail="Add a roadmap with trackable steps before analyzing progress.")
    if len(all_items) > 300 or len(roadmap.stages) > 30:
        raise HTTPException(status_code=422, detail="The roadmap is too large to analyze in one request.")

    progress = payload.dashboard.progress
    stage_progress = []
    context_stages = []
    for stage in roadmap.stages:
        done = sum(1 for item in stage.items if progress.get(item.id, False))
        total = len(stage.items)
        complete = total > 0 and done == total
        percent = round((done / total) * 100) if total else 0
        status = "complete" if complete else "in-progress" if done else "not-started"
        stage_progress.append(StageProgress(
            id=stage.id,
            number=stage.num,
            title=stage.title,
            done=done,
            total=total,
            percent=percent,
            status=status,
        ))
        context_stages.append({
            "number": stage.num,
            "title": stage.title,
            "summary": stage.summary,
            "status": status,
            "percent": percent,
            "items": [
                {"label": item.label, "kind": item.kind, "done": bool(progress.get(item.id, False))}
                for item in stage.items
            ],
        })

    completed_items = sum(1 for item in all_items if progress.get(item.id, False))
    total_items = len(all_items)
    completed_stages = sum(stage.status == "complete" for stage in stage_progress)
    active_stage = next((stage for stage in stage_progress if stage.status != "complete"), None)
    exact_stats = {
        "roadmap_title": roadmap.title,
        "completed_items": completed_items,
        "total_items": total_items,
        "overall_percent": round((completed_items / total_items) * 100),
        "completed_stages": completed_stages,
        "total_stages": len(roadmap.stages),
        "active_stage": active_stage.title if active_stage else None,
        "stages": context_stages,
    }
    instructions = """You are CoachStein, an encouraging but candid engineering learning coach. Analyze only the roadmap snapshot and exact completion counts provided. Do not claim trends, streaks, time spent, consistency, or deadlines because no historical activity data is provided. Ground each recommendation in a stage or unfinished roadmap item. Give 2-4 practical recommendations and 1-3 strengths, and make the weekly focus specific and achievable. If little is completed, be constructive and suggest a small first step. Do not change or recalculate the supplied percentages. Output only the schema fields."""
    result = await _structured_response("progress_coaching", ANALYSIS_SCHEMA, instructions, json.dumps(exact_stats))
    try:
        coaching = json.loads(json.dumps(result))
        recommendations = [Recommendation.model_validate(row) for row in coaching["recommendations"]]
        return ProgressAnalysisResponse(
            roadmap_title=roadmap.title,
            percent=exact_stats["overall_percent"],
            completed_items=completed_items,
            total_items=total_items,
            completed_stages=completed_stages,
            total_stages=len(roadmap.stages),
            stage_progress=stage_progress,
            summary=coaching["summary"],
            strengths=coaching["strengths"],
            recommendations=recommendations,
            weekly_focus=coaching["weekly_focus"],
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail="The AI service returned an incomplete progress analysis. Please try again.") from exc

