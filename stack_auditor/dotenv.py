"""Minimal .env loader — no third-party dependency, matches this project's zero-dependency rule.

Only used by the CLI entrypoint. Never overrides a variable already set in the real shell
environment, so `export BRIGHTDATA_API_KEY=...` still takes priority over `.env`. Library
modules (business.py, pricing.py, brightdata.py) stay side-effect free and only read
os.environ — they don't know or care whether a value came from the shell or this file.
"""

from __future__ import annotations

import os
from pathlib import Path

ENV_FILENAME = ".env"


def load_dotenv(start: Path | None = None) -> None:
    root = _find_repo_root(start or Path.cwd())
    env_path = root / ENV_FILENAME
    if not env_path.is_file():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        clean = line.strip()
        if not clean or clean.startswith("#") or "=" not in clean:
            continue
        key, _, value = clean.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def _find_repo_root(start: Path) -> Path:
    current = start.resolve()
    for candidate in [current, *current.parents]:
        if (candidate / "pyproject.toml").is_file():
            return candidate
    return start
