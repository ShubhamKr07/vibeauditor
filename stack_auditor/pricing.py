from __future__ import annotations

import datetime as dt
import json
import urllib.request
from pathlib import Path
from typing import Any

DEFAULT_CACHE_DIR = Path.home() / ".cache" / "stack-auditor"

PRICING_SOURCES = [
    {"name": "AWS EC2 On-Demand Pricing", "url": "https://aws.amazon.com/ec2/pricing/on-demand/"},
    {"name": "AWS RDS Pricing", "url": "https://aws.amazon.com/rds/pricing/"},
    {"name": "AWS CloudFront Pricing", "url": "https://aws.amazon.com/cloudfront/pricing/"},
    {"name": "Vercel Pricing", "url": "https://vercel.com/pricing"},
    {"name": "Supabase Pricing", "url": "https://supabase.com/pricing"},
    {"name": "Google Cloud Pricing", "url": "https://cloud.google.com/pricing"},
    {"name": "Azure Pricing", "url": "https://azure.microsoft.com/pricing/"},
]

BEST_PRACTICE_SOURCES = [
    {"name": "OWASP Top 10", "url": "https://owasp.org/www-project-top-ten/"},
    {"name": "OWASP ASVS", "url": "https://owasp.org/www-project-application-security-verification-standard/"},
    {"name": "The Twelve-Factor App", "url": "https://12factor.net/"},
    {"name": "Django deployment checklist", "url": "https://docs.djangoproject.com/en/stable/howto/deployment/checklist/"},
    {"name": "Next.js production deployment docs", "url": "https://nextjs.org/docs/app/building-your-application/deploying"},
    {"name": "PostgreSQL indexes documentation", "url": "https://www.postgresql.org/docs/current/indexes.html"},
]

TIER_ESTIMATES = {
    "0-to-1": {
        "label": "0 -> 1",
        "users_load": "Pre-launch / first users",
        "monthly_cost": "$0-$25 estimated",
        "cost_unit": "<$1 per active user until usage appears; per-request cost usually dominated by free-tier rounding",
        "bottleneck": "Missing deployment hygiene, secrets handling, or observability rather than raw scale",
        "minimum_fix": "Add env samples, basic CI, error logging, and a documented deploy path",
    },
    "1-to-100": {
        "label": "1 -> 100",
        "users_load": "Early adopters",
        "monthly_cost": "$0-$100 estimated",
        "cost_unit": "$0.10-$2 per active user depending on managed services; per-request still tiny at low volume",
        "bottleneck": "One small app instance or hobby database; slow cold starts if serverless",
        "minimum_fix": "Use managed hosting, backups, and simple indexes on common reads",
    },
    "100-to-10k": {
        "label": "100 -> 10K",
        "users_load": "Product-market fit stage",
        "monthly_cost": "$100-$1,500 estimated",
        "cost_unit": "$0.01-$0.30 per active user; request cost improves only if static assets are cached",
        "bottleneck": "Database query patterns, missing caching, background work running inline",
        "minimum_fix": "Add query indexes, CDN caching, queue long-running jobs, and set service-level metrics",
    },
    "10k-to-1m": {
        "label": "10K -> 1M",
        "users_load": "Growth stage",
        "monthly_cost": "$1,500-$50,000+ estimated",
        "cost_unit": "$0.005-$0.10 per active user at healthy utilization; bad cache/database design can be much higher",
        "bottleneck": "Database write/read scaling, noisy third-party calls, and stateful app servers",
        "minimum_fix": "Split read-heavy paths, add cache/queue layers, horizontal autoscaling, and rate limits",
    },
    "1m-to-100m": {
        "label": "1M -> 100M",
        "users_load": "Hyperscale",
        "monthly_cost": "$50,000-$1,000,000+ estimated",
        "cost_unit": "fractions of a cent to cents per active user depending on workload; must be measured with unit economics",
        "bottleneck": "Global data locality, multi-region reliability, cost controls, and organizational complexity",
        "minimum_fix": "Dedicated platform architecture: partitioned data, edge/CDN strategy, SLOs, capacity planning, and cost governance",
    },
}


def today_stamp() -> str:
    return dt.date.today().isoformat()


def source_list() -> list[dict[str, str]]:
    stamp = today_stamp()
    return [{**source, "accessed": stamp} for source in PRICING_SOURCES + BEST_PRACTICE_SOURCES]


def tier_estimates(provider_hint: str | None = None) -> list[dict[str, Any]]:
    stamp = today_stamp()
    provider_note = provider_hint or "provider inferred from repo signals when possible; otherwise generic managed web-app stack"
    estimates = []
    for key, data in TIER_ESTIMATES.items():
        estimates.append(
            {
                "key": key,
                **data,
                "provider_note": provider_note,
                "as_of": stamp,
                "source_note": "Estimated range based on public pricing pages and reference architectures; verify exact workload pricing before committing spend.",
            }
        )
    return estimates


def fetch_pricing_page(url: str, cache_dir: Path = DEFAULT_CACHE_DIR, max_age_days: int = 7) -> dict[str, Any]:
    """Fetch and cache a pricing page for human-verifiable source snapshots.

    The report deliberately does not scrape exact prices from arbitrary HTML because provider
    pricing pages change shape often. This helper records a dated fetch so a future extension
    can parse provider-specific APIs or tables safely.
    """

    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_key = "".join(ch if ch.isalnum() else "_" for ch in url)[:160]
    cache_path = cache_dir / f"{cache_key}.json"
    now = dt.datetime.now(dt.timezone.utc)
    if cache_path.exists():
        try:
            cached = json.loads(cache_path.read_text(encoding="utf-8"))
            fetched_at = dt.datetime.fromisoformat(cached["fetched_at"])
            if (now - fetched_at).days <= max_age_days:
                return cached
        except (KeyError, ValueError, json.JSONDecodeError):
            pass

    with urllib.request.urlopen(url, timeout=15) as response:
        body = response.read(250_000).decode("utf-8", errors="replace")
    payload = {"url": url, "fetched_at": now.isoformat(), "body_sample": body[:50_000]}
    cache_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload
