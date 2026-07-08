from pathlib import Path

from stack_auditor.scan import scan_repository


ROOT = Path(__file__).parent


def test_scan_detects_next_app_stack():
    inventory = scan_repository(str(ROOT / "fixtures" / "sample_next_app"))

    assert inventory["repo"]["app_type"] == "web app (full-stack or hybrid)"
    assert "TypeScript" in inventory["stack"]["languages"]
    assert "Next.js" in inventory["stack"]["frameworks"]
    assert "React" in inventory["stack"]["frameworks"]
    assert "PostgreSQL" in inventory["architecture"]["databases"]
    assert "NextAuth/Auth.js" in inventory["architecture"]["auth"]
    assert inventory["quality"]["tests"]["present"] is True
    assert any(signal["type"] == "Vercel" for signal in inventory["infra"]["signals"])


def test_scan_flags_committed_runtime_env_file():
    inventory = scan_repository(str(ROOT / "fixtures" / "sample_django_app"))

    assert inventory["repo"]["app_type"] == "web app (backend/API)"
    assert "Django" in inventory["stack"]["frameworks"]
    assert "PostgreSQL" in inventory["architecture"]["databases"]
    assert "Celery" in inventory["architecture"]["background_jobs"]
    assert ".env" in inventory["quality"]["security"]["committed_runtime_env_files"]
    assert any(signal["type"] == "Dockerfile" for signal in inventory["infra"]["signals"])
