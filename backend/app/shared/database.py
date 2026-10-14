import sqlite3
from pathlib import Path

from sqlalchemy import create_engine, event

from .config import Settings


def create_database(settings: Settings):
    path = settings.database_file
    path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(path) as db:
        db.execute("PRAGMA journal_mode=WAL")
        version = db.execute("PRAGMA user_version").fetchone()[0]
        if version == 0:
            migration = Path(__file__).with_name("migrations") / "001_complaints.sql"
            db.executescript(
                "BEGIN IMMEDIATE;\n" + migration.read_text() + "\nPRAGMA user_version=1;\nCOMMIT;"
            )
        elif version != 1:
            raise RuntimeError("Database schema is newer than this application")
    engine = create_engine(
        f"sqlite:///{path.as_posix()}", connect_args={"check_same_thread": False, "timeout": 30}
    )

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")

    return engine
