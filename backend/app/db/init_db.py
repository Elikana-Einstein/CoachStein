from app.db.base import Base
from app.db.session import engine
from sqlalchemy import inspect, text

from app.models import Roadmap, RoadmapItem, RoadmapStage, User  # noqa: F401


def create_database() -> None:
    Base.metadata.create_all(bind=engine)
    # create_all does not add columns to existing SQLite databases. Keep old roadmap
    # rows intact and unowned; all new dashboard writes require an authenticated user.
    if engine.dialect.name == "sqlite" and "roadmaps" in inspect(engine).get_table_names():
        columns = {column["name"] for column in inspect(engine).get_columns("roadmaps")}
        if "user_id" not in columns:
            with engine.begin() as connection:
                connection.execute(
                    text("ALTER TABLE roadmaps ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE")
                )
                connection.execute(text("CREATE INDEX IF NOT EXISTS ix_roadmaps_user_id ON roadmaps (user_id)"))
