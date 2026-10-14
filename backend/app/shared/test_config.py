import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

from app.shared import config


def test_server_configuration_resolves_from_project_root_not_launch_directory(tmp_path):
    module_path = tmp_path / "backend" / "app" / "shared" / "config.py"
    module_path.parent.mkdir(parents=True)
    shutil.copyfile(config.__file__, module_path)
    (tmp_path / ".env").write_text(
        "GEMINI_API_KEY=test-only-root-key\nDATABASE_PATH=backend/data/test.db\n"
        "FRONTEND_DIST=frontend/dist\n",
        encoding="utf-8",
    )
    launch_directory = tmp_path / "backend"
    (launch_directory / ".env").write_text("GEMINI_API_KEY=wrong-directory-key\n")
    script = """
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location('isolated_config', sys.argv[1])
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)
settings = module.Settings()
assert settings.gemini_api_key == 'test-only-root-key', 'Loaded the wrong environment file'
print(json.dumps({'database': str(settings.database_file), 'frontend': str(settings.frontend_directory)}))
"""
    environment = {
        key: value
        for key, value in os.environ.items()
        if key.upper() not in {"GEMINI_API_KEY", "DATABASE_PATH", "FRONTEND_DIST"}
    }
    result = subprocess.run(
        [sys.executable, "-c", script, str(module_path)],
        cwd=launch_directory,
        env=environment,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr
    actual = json.loads(result.stdout)
    assert Path(actual["database"]) == tmp_path / "backend" / "data" / "test.db"
    assert Path(actual["frontend"]) == tmp_path / "frontend" / "dist"
