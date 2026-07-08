from pathlib import Path

from stack_auditor.report import render_agent_prompt, render_report, score_inventory
from stack_auditor.scan import scan_repository


ROOT = Path(__file__).parent


def test_report_contains_required_sections_and_tiers():
    inventory = scan_repository(str(ROOT / "fixtures" / "sample_next_app"))
    report = render_report(inventory, target_scale="100-to-10k", budget=200, current_host="Vercel")

    assert "## Executive summary" in report
    assert "## Tech stack & code quality scorecard" in report
    assert "## Scalability/cost table" in report
    assert "## Remediation task list" in report
    assert "0 -> 1" in report
    assert "1M -> 100M" in report
    assert "estimated" in report
    assert "Sources consulted" in report
    assert "OWASP" in report


def test_report_contains_business_and_product_sections():
    inventory = scan_repository(str(ROOT / "fixtures" / "sample_next_app"))
    report = render_report(inventory, target_scale="100-to-10k", budget=200, current_host="Vercel")

    assert "## 1. Business context" in report
    assert "## 2. Product feature inventory & ranking" in report
    assert "## 3. Prioritization framework" in report
    assert "## 4. Product Tree & Buy-a-Feature" in report
    assert "## 5-9. Technical deep dive & tooling benchmark" in report
    assert "## Security posture benchmark" in report
    assert "## 10. Composite benchmark score & scale readiness" in report
    assert "Framework selected:" in report
    assert "Composite benchmark score" in report


def test_render_agent_prompt_is_directive_and_self_contained():
    inventory = scan_repository(str(ROOT / "fixtures" / "sample_next_app"))
    prompt = render_agent_prompt(inventory, target_scale="100-to-10k", budget=200, current_host="Vercel")

    assert prompt.startswith("# Agent task: implement Stack Auditor recommendations")
    assert "## Task list (do these, in order)" in prompt
    assert "## Success criteria" in prompt
    assert "Minimize tool calls" in prompt
    assert "[fix-before-next-tier]" in prompt or "[fix-now]" in prompt


def test_score_inventory_returns_six_categories():
    inventory = scan_repository(str(ROOT / "fixtures" / "sample_django_app"))
    scores = score_inventory(inventory)

    assert len(scores) == 6
    assert {item["category"] for item in scores} == {
        "Architecture soundness",
        "Code quality and maintainability",
        "Security posture",
        "Database design",
        "API design",
        "Dependency health",
    }
    assert all(1 <= item["score"] <= 10 for item in scores)
