from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Roadmap(Base):
    __tablename__ = "roadmaps"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Nullable only to allow existing, pre-authentication SQLite rows to migrate safely.
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True)
    title: Mapped[str] = mapped_column(String(200), default="My engineering roadmap")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    stages: Mapped[list["RoadmapStage"]] = relationship(back_populates="roadmap", cascade="all, delete-orphan", order_by="RoadmapStage.position")
    owner: Mapped["User | None"] = relationship(back_populates="roadmaps")


class RoadmapStage(Base):
    __tablename__ = "roadmap_stages"

    id: Mapped[int] = mapped_column(primary_key=True)
    roadmap_id: Mapped[int] = mapped_column(ForeignKey("roadmaps.id", ondelete="CASCADE"), index=True)
    client_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    number: Mapped[int] = mapped_column(Integer, default=1)
    title: Mapped[str] = mapped_column(String(200))
    duration: Mapped[str] = mapped_column(String(100), default="")
    summary: Mapped[str] = mapped_column(Text, default="")
    position: Mapped[int] = mapped_column(Integer, default=0)
    roadmap: Mapped[Roadmap] = relationship(back_populates="stages")
    items: Mapped[list["RoadmapItem"]] = relationship(back_populates="stage", cascade="all, delete-orphan", order_by="RoadmapItem.position")


class RoadmapItem(Base):
    __tablename__ = "roadmap_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    stage_id: Mapped[int] = mapped_column(ForeignKey("roadmap_stages.id", ondelete="CASCADE"), index=True)
    client_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    label: Mapped[str] = mapped_column(String(300))
    kind: Mapped[str] = mapped_column(String(20), default="task")
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[int] = mapped_column(Integer, default=0)
    stage: Mapped[RoadmapStage] = relationship(back_populates="items")
