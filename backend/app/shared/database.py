import sqlite3
from pathlib import Path

from sqlalchemy import create_engine, event

from .config import Settings


def create_database(settings: Settings):
    path = settings.database_file
    path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(path) as db:
        db.execute("PRAGMA journal_mode=WAL")
        migrations = [
            "001_complaints.sql",
            "002_secondary_routing.sql",
            "003_issue_decomposition.sql",
        ]
        # Serialize migration checks as well as writes across concurrent server starts.
        db.execute("BEGIN IMMEDIATE")
        try:
            version = db.execute("PRAGMA user_version").fetchone()[0]
            if version > len(migrations):
                raise RuntimeError("Database schema is newer than this application")
            for index in range(version, len(migrations)):
                migration = Path(__file__).with_name("migrations") / migrations[index]
                statement = ""
                for line in migration.read_text(encoding="utf-8").splitlines(keepends=True):
                    statement += line
                    if sqlite3.complete_statement(statement):
                        db.execute(statement)
                        statement = ""
                if statement.strip():
                    raise RuntimeError(f"Incomplete migration: {migration.name}")
                db.execute(f"PRAGMA user_version={index + 1}")
            db.commit()
        except Exception:
            db.rollback()
            raise
    engine = create_engine(
        f"sqlite:///{path.as_posix()}", connect_args={"check_same_thread": False, "timeout": 30}
    )

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")

    return engine
