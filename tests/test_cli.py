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


def test_cli_writes_agent_prompt_alongside_report_by_default(tmp_path):
    output = tmp_path / "report.md"
    code = main([str(ROOT / "fixtures" / "sample_next_app"), "--output", str(output)])

    assert code == 0
    agent_prompt_path = tmp_path / "report-agent-prompt.md"
    assert agent_prompt_path.exists()
    assert "Agent task: implement Stack Auditor recommendations" in agent_prompt_path.read_text(encoding="utf-8")


def test_cli_no_agent_prompt_flag_skips_file(tmp_path):
    output = tmp_path / "report.md"
    code = main([str(ROOT / "fixtures" / "sample_next_app"), "--output", str(output), "--no-agent-prompt"])

    assert code == 0
    assert not (tmp_path / "report-agent-prompt.md").exists()
