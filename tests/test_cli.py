from pathlib import Path

from stack_auditor.cli import main


ROOT = Path(__file__).parent


def test_cli_writes_report(tmp_path):
    output = tmp_path / "report.md"
    code = main([str(ROOT / "fixtures" / "sample_next_app"), "--output", str(output)])

    assert code == 0
    text = output.read_text(encoding="utf-8")
    assert "# Stack Auditor Report" in text
    assert "Next.js" in text
