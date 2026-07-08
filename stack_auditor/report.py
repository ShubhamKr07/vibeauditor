from __future__ import annotations

from pathlib import Path
from typing import Any

from .pricing import source_list, tier_estimates

ROOT = Path(__file__).resolve().parent.parent


def render_report(
    inventory: dict[str, Any],
    target_scale: str | None = None,
    budget: float | None = None,
    current_host: str | None = None,
) -> str:
    scores = score_inventory(inventory)
    tiers = tier_estimates(current_host or _infer_host(inventory))
    summary = _executive_summary(inventory, scores, tiers, target_scale, budget)
    scorecard = _scorecard_table(scores)
    scale_table = _scale_table(tiers)
    infra_notes = _infra_efficiency_notes(inventory)
    remediation = _remediation_tasks(inventory, scores, target_scale)
    sources = _sources_section()

    return "\n\n".join(
        [
            "# Stack Auditor Report",
            "## Executive summary\n\n" + summary,
            "## Tech stack & code quality scorecard\n\n" + scorecard,
            "## Scalability/cost table\n\n" + scale_table,
            "## Infrastructure efficiency notes\n\n" + infra_notes,
            "## Remediation task list\n\n" + remediation,
            "## Sources consulted\n\n" + sources,
        ]
    ) + "\n"


def score_inventory(inventory: dict[str, Any]) -> list[dict[str, Any]]:
    arch = inventory.get("architecture", {})
    infra = inventory.get("infra", {})
    quality = inventory.get("quality", {})
    stack = inventory.get("stack", {})
    files = inventory.get("files", {})

    tests = quality.get("tests", {})
    security = quality.get("security", {})
    dep_health = quality.get("dependency_health", {})

    has_frontend = bool(arch.get("frontend", {}).get("paths") or arch.get("frontend", {}).get("frameworks"))
    has_backend = bool(arch.get("backend", {}).get("paths") or arch.get("backend", {}).get("frameworks"))
    has_api = bool(arch.get("api", {}).get("routes"))
    has_db = bool(arch.get("databases"))
    has_ci = bool(infra.get("ci_cd"))
    has_env_sample = bool(security.get("env_samples_present"))
    committed_env = bool(security.get("committed_runtime_env_files"))
    has_lockfile = bool(dep_health.get("lockfiles"))
    has_tests = bool(tests.get("present"))

    return [
        {
            "category": "Architecture soundness",
            "score": _clamp(5 + has_frontend + has_backend + has_api + has_ci - int(inventory["repo"]["app_type"] == "ambiguous")),
            "justification": _evidence(
                "Separation is inferred from frontend/backend/API file layout.",
                [
                    *arch.get("frontend", {}).get("paths", [])[:2],
                    *arch.get("backend", {}).get("paths", [])[:2],
                    *arch.get("api", {}).get("routes", [])[:2],
                ],
                "Limited modularity evidence from file inventory.",
            ),
            "standard": "Twelve-Factor codebase/config guidance and framework deployment docs favor clear app boundaries.",
        },
        {
            "category": "Code quality and maintainability",
            "score": _clamp(4 + has_tests + bool(tests.get("coverage_signal")) + has_ci + min(files.get("count", 0) // 1000, 2)),
            "justification": _evidence(
                "Maintainability score is driven by tests, coverage, CI, and project structure signals.",
                tests.get("files", [])[:3] + [item["path"] for item in infra.get("ci_cd", [])[:2]],
                "No strong test or CI signal was found in the scanned files.",
            ),
            "standard": "Framework docs and common CI practice expect automated tests before scaling changes.",
        },
        {
            "category": "Security posture",
            "score": _clamp(6 + bool(security.get("auth_signal")) + has_env_sample - 3 * committed_env - bool(security.get("secret_like_filenames"))),
            "justification": _security_justification(security),
            "standard": "OWASP Top 10/ASVS and Twelve-Factor config guidance: protect secrets, validate inputs, and make auth explicit.",
        },
        {
            "category": "Database design",
            "score": _clamp(5 + has_db - int(not has_db) - int("SQLite" in arch.get("databases", []) and has_backend)),
            "justification": _db_justification(arch),
            "standard": "PostgreSQL and major framework docs expect indexed access paths and production-suitable storage.",
        },
        {
            "category": "API design",
            "score": _clamp(5 + has_api + bool(arch.get("api", {}).get("frameworks")) - int(not has_api)),
            "justification": _evidence(
                "API routes/frameworks were detected from conventional route files.",
                arch.get("api", {}).get("routes", [])[:5],
                "No API route evidence was found; API design cannot be deeply assessed.",
            ),
            "standard": "REST/framework conventions favor explicit route structure, validation, and rate limits.",
        },
        {
            "category": "Dependency health",
            "score": _clamp(5 + has_lockfile + min(dep_health.get("manifest_count", 0), 2) - int(not has_lockfile)),
            "justification": _dep_justification(dep_health, stack),
            "standard": "Package-manager lockfiles and ecosystem audit tools are baseline supply-chain hygiene.",
        },
    ]


def _executive_summary(
    inventory: dict[str, Any],
    scores: list[dict[str, Any]],
    tiers: list[dict[str, Any]],
    target_scale: str | None,
    budget: float | None,
) -> str:
    repo = inventory["repo"]
    stack = inventory["stack"]
    arch = inventory["architecture"]
    avg = sum(item["score"] for item in scores) / len(scores)
    ready = "1 -> 100" if avg < 6 else "100 -> 10K" if avg < 8 else "10K -> 1M"
    frameworks = _join(stack.get("frameworks")) or "no major framework detected"
    dbs = _join(arch.get("databases")) or "no database signal detected"
    first_bottleneck = _first_bottleneck(inventory)
    budget_sentence = f" The stated budget ceiling is ${budget:,.0f}/month, so compare that against the tier rows before upgrading managed services." if budget is not None else ""
    target_sentence = f" The requested target tier is `{target_scale}`; tasks below prioritize reaching that tier." if target_scale else ""
    warnings = " ".join(repo.get("warnings", []))
    return (
        f"This repository was classified as {repo['app_type']} with {frameworks}; database evidence: {dbs}. "
        f"Based on static repository evidence, it looks architecturally ready for roughly the {ready} stage, not hyperscale. "
        f"The first likely break point is {first_bottleneck}. "
        "The cost numbers below are estimated ranges, not quotes, because exact spend depends on traffic shape, region, data transfer, and managed-service plan choices. "
        "The strongest immediate improvements are the ones that create proof: tests, CI, explicit env samples, dependency audits, database indexes, caching, and rate limits. "
        f"{warnings}{budget_sentence}{target_sentence}"
    ).strip()


def _scorecard_table(scores: list[dict[str, Any]]) -> str:
    rows = ["| Category | Score | One-line justification | Standard/convention applied |", "|---|---:|---|---|"]
    for item in scores:
        rows.append(f"| {item['category']} | {item['score']}/10 | {item['justification']} | {item['standard']} |")
    return "\n".join(rows)


def _scale_table(tiers: list[dict[str, Any]]) -> str:
    rows = [
        "| Tier | Users/load definition | Est. monthly cost | Likely first bottleneck | Minimum fix | Cost unit |",
        "|---|---|---|---|---|---|",
    ]
    for tier in tiers:
        rows.append(
            f"| {tier['label']} | {tier['users_load']} | {tier['monthly_cost']} as of {tier['as_of']} | {tier['bottleneck']} | {tier['minimum_fix']} | {tier['cost_unit']} |"
        )
    return "\n".join(rows)


def _infra_efficiency_notes(inventory: dict[str, Any]) -> str:
    infra = inventory.get("infra", {})
    arch = inventory.get("architecture", {})
    signals = ", ".join(f"{item['type']} ({item['path']})" for item in infra.get("signals", [])) or "none detected"
    cdn = "Vercel/Netlify-style edge hosting signal detected" if any(item["type"] in {"Vercel", "Netlify"} for item in infra.get("signals", [])) else "no explicit CDN/edge caching config detected"
    stateless = "likely stateless from repository signals" if not arch.get("background_jobs") else "background jobs are present; verify workers are separate from request handlers"
    db_note = _join(arch.get("databases")) or "no database detected, so query cost/indexing cannot be evaluated from repo evidence"
    return "\n".join(
        [
            f"- Hosting/infra signals: {signals}.",
            f"- Compute efficiency: unknown until runtime metrics exist; start right-sized at tiers 0 -> 100 and autoscale only after CPU/memory/request metrics justify it.",
            f"- Data layer efficiency: {db_note}; assume low cache hit rate until CDN/server cache configuration is visible.",
            f"- Latency under load: not benchmarked by this static tool; add load tests before the 100 -> 10K tier.",
            f"- Horizontal scaling readiness: {stateless}; verify file uploads, sessions, and scheduled jobs do not rely on local disk or a single instance.",
            f"- CDN/edge caching: {cdn}.",
            "- Autoscaling configuration: no autoscaling proof unless Terraform/Pulumi/cloud config explicitly defines it.",
        ]
    )


def _remediation_tasks(inventory: dict[str, Any], scores: list[dict[str, Any]], target_scale: str | None) -> str:
    arch = inventory.get("architecture", {})
    infra = inventory.get("infra", {})
    quality = inventory.get("quality", {})
    tasks: list[str] = []

    if quality.get("security", {}).get("committed_runtime_env_files"):
        tasks.append(
            "- [fix-now] Remove committed runtime env files from version control, add sanitized `.env.example`, rotate any exposed secrets, and document required variables. Likely files: `.env*`, README/deploy docs. Benefit: reduces credential leakage risk and matches OWASP/Twelve-Factor config guidance."
        )
    if not quality.get("tests", {}).get("present"):
        tasks.append(
            "- [fix-now] Add a minimal automated test suite for the highest-risk user flows and wire it into CI. Likely files: `tests/`, `__tests__/`, `.github/workflows/*`. Benefit: lets future Codex changes catch regressions before scaling work."
        )
    if not infra.get("ci_cd"):
        tasks.append(
            "- [fix-now] Add CI that installs dependencies, runs lint/type checks, runs tests, and builds the app on every pull request. Likely files: `.github/workflows/ci.yml`, package/test config. Benefit: improves maintainability and deploy confidence."
        )
    if not quality.get("dependency_health", {}).get("lockfiles"):
        tasks.append(
            "- [fix-now] Commit the ecosystem lockfile and add a dependency audit command to CI (`npm audit`, `pip-audit`, `bundler audit`, or equivalent). Likely files: lockfile plus CI workflow. Benefit: repeatable installs and visible supply-chain risk."
        )
    if arch.get("databases") and "SQLite" not in arch.get("databases", []):
        tasks.append(
            "- [fix-before-next-tier] Identify the top read/write queries, add indexes for common filters/joins, and add regression tests for N+1 query paths. Likely files: migrations/schema files, ORM models, API handlers. Benefit: delays the first database bottleneck at the 100 -> 10K tier."
        )
    elif "SQLite" in arch.get("databases", []):
        tasks.append(
            "- [fix-before-next-tier] Plan migration from SQLite to managed Postgres before multi-user production traffic. Likely files: database config, migrations, deployment env. Benefit: safer concurrency, backups, and operational tooling."
        )
    else:
        tasks.append(
            "- [fix-before-next-tier] Make the data model explicit: document the chosen database, schema ownership, backup policy, and indexing plan. Likely files: schema/migration directory, README, deployment docs. Benefit: prevents hidden data-layer cost and reliability surprises."
        )
    if not arch.get("background_jobs"):
        tasks.append(
            "- [fix-before-next-tier] Move slow email, payment webhook, AI, file-processing, or notification work out of request handlers into a queue/worker. Likely files: API route handlers, worker module, queue config. Benefit: keeps request latency stable as traffic grows."
        )
    tasks.append(
        "- [fix-before-next-tier] Add request validation, rate limiting, and structured error responses to public API endpoints. Likely files: API routes/controllers/middleware. Benefit: protects app servers and databases from accidental or abusive traffic spikes."
    )
    tasks.append(
        "- [future-proofing] Add CDN/cache headers for static assets and read-heavy public pages, then measure cache hit rate. Likely files: framework config, route handlers, hosting config such as `vercel.json`/`netlify.toml`. Benefit: lowers per-request compute cost."
    )
    tasks.append(
        "- [future-proofing] Add basic observability: request latency, error rate, database query latency, queue depth, and monthly cost dashboard. Likely files: app middleware, logging config, hosting/provider dashboards. Benefit: makes scale and spend decisions evidence-based."
    )
    if target_scale in {"10k-to-1m", "1m-to-100m"}:
        tasks.append(
            "- [future-proofing] Run a load test for the target tier and record p50/p95 latency, saturation point, and cost assumptions in the repo. Likely files: `tests/load/`, docs, CI/manual runbook. Benefit: replaces rough estimates with measured capacity."
        )
    return "\n".join(tasks)


def _sources_section() -> str:
    rows = []
    for source in source_list():
        rows.append(f"- {source['name']}: {source['url']} (accessed {source['accessed']})")
    rows.append("- Local reference: `reference/scoring_rubric.md`")
    rows.append("- Local reference: `reference/scale_tiers.md`")
    return "\n".join(rows)


def _infer_host(inventory: dict[str, Any]) -> str | None:
    signals = inventory.get("infra", {}).get("signals", [])
    for item in signals:
        if item["type"] in {"Vercel", "Netlify", "Docker Compose"}:
            return item["type"]
    return None


def _first_bottleneck(inventory: dict[str, Any]) -> str:
    arch = inventory.get("architecture", {})
    if not inventory.get("quality", {}).get("tests", {}).get("present"):
        return "low change confidence because tests are missing"
    if not arch.get("databases"):
        return "unknown data-layer behavior because no database signal was detected"
    if not arch.get("background_jobs"):
        return "database and request latency once slow work runs inline"
    return "database query efficiency and cache strategy"


def _security_justification(security: dict[str, Any]) -> str:
    parts = []
    if security.get("auth_signal"):
        parts.append(f"auth detected: {_join(security['auth_signal'])}")
    if security.get("env_samples_present"):
        parts.append("env sample present")
    if security.get("committed_runtime_env_files"):
        parts.append(f"runtime env file committed: {_join(security['committed_runtime_env_files'])}")
    if security.get("secret_like_filenames"):
        parts.append(f"secret-like filenames: {_join(security['secret_like_filenames'][:3])}")
    return "; ".join(parts) if parts else "No auth, env-sample, or secret-management evidence was found in the static scan."


def _db_justification(arch: dict[str, Any]) -> str:
    dbs = arch.get("databases", [])
    if not dbs:
        return "No database/ORM dependency or schema signal was detected, so database design is under-specified."
    return f"Detected { _join(dbs) }; static scan cannot prove indexes or N+1 safety without schema/query inspection."


def _dep_justification(dep_health: dict[str, Any], stack: dict[str, Any]) -> str:
    lockfiles = dep_health.get("lockfiles", [])
    manifests = stack.get("manifests", [])
    if lockfiles:
        return f"Dependency manifests detected ({_join(manifests[:3])}) with lockfile(s): {_join(lockfiles[:3])}."
    return f"Dependency manifests detected ({_join(manifests[:3]) or 'none'}), but no lockfile was found."


def _evidence(prefix: str, evidence: list[str], fallback: str) -> str:
    if not evidence:
        return fallback
    return f"{prefix} Evidence: {_join(evidence[:5])}."


def _join(items: list[Any] | None) -> str:
    if not items:
        return ""
    return ", ".join(str(item) for item in items)


def _clamp(value: int) -> int:
    return max(1, min(10, int(value)))
