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


def test_scan_includes_business_evidence_and_feature_segmentation():
    inventory = scan_repository(str(ROOT / "fixtures" / "sample_next_app"))

    assert "business" in inventory
    assert set(inventory["business"]) == {"readme_path", "readme_excerpt", "package_description", "keywords"}

    assert "features" in inventory
    assert any(f["name"] == "health" for f in inventory["features"])
    health = next(f for f in inventory["features"] if f["name"] == "health")
    assert health["file_count"] == 1
    assert health["layers"] == ["api"]

    security = inventory["quality"]["security"]
    for key in ("cors_signal", "rate_limit_signal", "exposed_ports", "secret_scan_hits"):
        assert key in security


def test_secret_scan_flags_high_signal_pattern(tmp_path):
    repo = tmp_path / "leaky-repo"
    (repo / "config").mkdir(parents=True)
    (repo / "config" / "settings.py").write_text('AWS_KEY = "AKIAABCDEFGHIJKLMNOP"\n', encoding="utf-8")

    inventory = scan_repository(str(repo))

    hits = inventory["quality"]["security"]["secret_scan_hits"]
    assert any(hit["path"] == "config/settings.py" for hit in hits)
