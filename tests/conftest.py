import pytest

from stack_auditor import cli as cli_module


@pytest.fixture(autouse=True)
def _no_live_brightdata_calls(monkeypatch):
    """Tests must be hermetic and fast regardless of a developer's local .env.

    cli.main() calls load_dotenv(), which would otherwise pull real
    BRIGHTDATA_API_KEY/BRIGHTDATA_SERP_ZONE values from the repo-root .env into every
    test process and turn unit tests into live network calls. Neutering load_dotenv()
    itself (not just deleting the env vars beforehand) is required because main() would
    just re-populate os.environ from the file mid-test otherwise. Tests that want to
    exercise the Bright Data path set env vars directly via monkeypatch.setenv.
    """
    monkeypatch.setattr(cli_module, "load_dotenv", lambda *a, **k: None)
    monkeypatch.delenv("BRIGHTDATA_API_KEY", raising=False)
    monkeypatch.delenv("BRIGHTDATA_SERP_ZONE", raising=False)
