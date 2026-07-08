import io
import json
from unittest import mock

from stack_auditor import brightdata


def test_search_serp_returns_none_when_unconfigured(monkeypatch):
    monkeypatch.delenv("BRIGHTDATA_API_KEY", raising=False)
    monkeypatch.delenv("BRIGHTDATA_SERP_ZONE", raising=False)

    assert brightdata.search_serp("stripe competitors") is None
    assert brightdata.is_configured() is False


def test_search_serp_posts_expected_shape_and_parses_organic(monkeypatch):
    monkeypatch.setenv("BRIGHTDATA_API_KEY", "test-key")
    monkeypatch.setenv("BRIGHTDATA_SERP_ZONE", "test-zone")

    inner_body = json.dumps(
        {
            "organic": [
                {"rank": 1, "title": "Stripe", "source": "Stripe", "link": "https://stripe.com", "description": "Payments API"},
                {"rank": 2, "title": "Adyen", "source": "Adyen", "link": "https://adyen.com", "description": "Payments platform"},
            ]
        }
    )
    fake_response_body = json.dumps({"status_code": 200, "headers": {}, "body": inner_body}).encode("utf-8")

    captured = {}

    class FakeResponse(io.BytesIO):
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

    def fake_urlopen(request, timeout=None):
        captured["url"] = request.full_url
        captured["method"] = request.get_method()
        captured["headers"] = {k.lower(): v for k, v in request.headers.items()}
        captured["body"] = json.loads(request.data.decode("utf-8"))
        return FakeResponse(fake_response_body)

    with mock.patch("urllib.request.urlopen", fake_urlopen):
        result = brightdata.search_serp("fintech competitors")

    assert captured["url"] == brightdata.BRIGHTDATA_ENDPOINT
    assert captured["method"] == "POST"
    assert captured["headers"]["authorization"] == "Bearer test-key"
    assert captured["body"]["zone"] == "test-zone"
    assert captured["body"]["format"] == "json"
    assert captured["body"]["data_format"] == "parsed"
    assert "q=fintech" in captured["body"]["url"]

    assert result["query"] == "fintech competitors"
    assert result["results"][0] == {"rank": 1, "title": "Stripe", "source": "Stripe", "link": "https://stripe.com", "description": "Payments API"}


def test_search_serp_returns_none_on_request_failure(monkeypatch):
    monkeypatch.setenv("BRIGHTDATA_API_KEY", "test-key")
    monkeypatch.setenv("BRIGHTDATA_SERP_ZONE", "test-zone")

    def fake_urlopen(request, timeout=None):
        raise OSError("network down")

    with mock.patch("urllib.request.urlopen", fake_urlopen):
        assert brightdata.search_serp("anything") is None


def test_top_result_domain_strips_www():
    result = {"results": [{"link": "https://www.stripe.com/pricing", "title": "", "description": ""}]}
    assert brightdata.top_result_domain(result) == "stripe.com"
    assert brightdata.top_result_domain(None) is None
    assert brightdata.top_result_domain({"results": []}) is None
