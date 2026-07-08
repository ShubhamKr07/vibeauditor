"""Optional Bright Data SERP API client.

This is a thin, best-effort wrapper. Every function here returns ``None`` (never raises)
when the service isn't configured or a request fails, because live search results are
supplementary evidence, not a hard dependency of the auditor. Nothing in this module
holds a hardcoded credential — the API key and zone are read from the environment at
call time so they never end up committed to the repo.

Setup:
    export BRIGHTDATA_API_KEY=...      # from your Bright Data SERP API zone's Overview tab
    export BRIGHTDATA_SERP_ZONE=...    # your SERP API zone name (e.g. "serp_api1")

Request/response shape below was verified live against a real Bright Data SERP zone
(2026-07-08), not just documentation: POST https://api.brightdata.com/request with
{"zone", "url", "format": "json", "data_format": "parsed"}. The HTTP response is itself
a wrapper — {"status_code", "headers", "body"} — where ``body`` is a *JSON-encoded string*
that must be parsed a second time to reach the actual SERP payload
({"general", "organic": [...], ...}). Each organic entry carries a pre-parsed ``source``
field (e.g. "Pizza Hut") in addition to title/link/description, which is far more reliable
for naming a result than guessing a company name from its domain.
"""

from __future__ import annotations

import json
import os
import ssl
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

BRIGHTDATA_ENDPOINT = "https://api.brightdata.com/request"


def is_configured() -> bool:
    return bool(os.environ.get("BRIGHTDATA_API_KEY")) and bool(os.environ.get("BRIGHTDATA_SERP_ZONE"))


def search_serp(query: str, *, gl: str = "us", hl: str = "en", timeout: int = 20) -> dict[str, Any] | None:
    """Run a Google search through Bright Data's SERP API.

    Returns {"query": ..., "results": [{"rank", "title", "source", "link", "description"}, ...]}
    or None if unconfigured or the request/parse fails at any step.
    """
    api_key = os.environ.get("BRIGHTDATA_API_KEY")
    zone = os.environ.get("BRIGHTDATA_SERP_ZONE")
    if not api_key or not zone:
        return None

    search_url = "https://www.google.com/search?" + urllib.parse.urlencode({"q": query, "gl": gl, "hl": hl})
    payload = json.dumps({"zone": zone, "url": search_url, "format": "json", "data_format": "parsed"}).encode("utf-8")
    request = urllib.request.Request(
        BRIGHTDATA_ENDPOINT,
        data=payload,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
        method="POST",
    )

    outer_text = _fetch(request, timeout)
    if outer_text is None:
        return None

    try:
        outer = json.loads(outer_text)
        body = json.loads(outer.get("body", ""))
    except (json.JSONDecodeError, ValueError, AttributeError):
        return None

    organic = body.get("organic") or []
    results = [
        {
            "rank": item.get("rank"),
            "title": item.get("title", ""),
            "source": item.get("source", ""),
            "link": item.get("link", ""),
            "description": item.get("description", ""),
        }
        for item in organic[:8]
        if item.get("link")
    ]
    return {"query": query, "results": results}


def _fetch(request: urllib.request.Request, timeout: int) -> str | None:
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError:
        return None
    except urllib.error.URLError as exc:
        if isinstance(exc.reason, ssl.SSLCertVerificationError):
            return _retry_with_certifi(request, timeout)
        return None
    except (TimeoutError, OSError):
        return None


def _retry_with_certifi(request: urllib.request.Request, timeout: int) -> str | None:
    """Some Python installs (notably python.org builds on macOS) ship without a usable CA
    bundle, which surfaces as SSLCertVerificationError even against a valid host. If
    ``certifi`` happens to be installed, retry once with its bundle. Soft, optional
    fallback — certifi is not a hard dependency of this project.
    """
    try:
        import certifi
    except ImportError:
        return None
    try:
        context = ssl.create_default_context(cafile=certifi.where())
        with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
            return response.read().decode("utf-8", errors="replace")
    except (urllib.error.URLError, TimeoutError, OSError):
        return None


def top_result_domain(serp_result: dict[str, Any] | None) -> str | None:
    if not serp_result or not serp_result.get("results"):
        return None
    link = serp_result["results"][0].get("link", "")
    return urllib.parse.urlparse(link).netloc.removeprefix("www.") or None
