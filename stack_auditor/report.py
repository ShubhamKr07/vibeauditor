from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from . import brightdata, business
from .pricing import source_list, tier_estimates, verify_pricing_source

ROOT = Path(__file__).resolve().parent.parent


def _analyze(
    inventory: dict[str, Any],
    target_scale: str | None,
    budget: float | None,
    current_host: str | None,
) -> dict[str, Any]:
    scores = score_inventory(inventory)
    tiers = tier_estimates(current_host or _infer_host(inventory))

    business_context = business.infer_business_context(inventory)
    features = business.score_features(inventory)
    framework_choice = business.select_prioritization_framework(features, business_context)
    framework_applied = business.apply_framework(framework_choice["framework"], features, business_context)
    tree = business.product_tree(features)
    baf = business.buy_a_feature(features)
    tech_alternatives = business.evaluate_tech_alternatives(inventory)
    test_taxonomy = business.classify_test_coverage(inventory)

    tasks = _remediation_task_list(inventory, scores, target_scale)
    tag_counts = _count_task_tags(tasks)
    composite = business.composite_score_and_scale(scores, features, tag_counts)

    return {
        "scores": scores,
        "tiers": tiers,
        "business_context": business_context,
        "features": features,
        "framework_choice": framework_choice,
        "framework_applied": framework_applied,
        "tree": tree,
        "baf": baf,
        "tech_alternatives": tech_alternatives,
        "test_taxonomy": test_taxonomy,
        "tasks": tasks,
        "tag_counts": tag_counts,
        "composite": composite,
    }


def render_report(
    inventory: dict[str, Any],
    target_scale: str | None = None,
    budget: float | None = None,
    current_host: str | None = None,
) -> str:
    a = _analyze(inventory, target_scale, budget, current_host)

    summary = _executive_summary(inventory, a["scores"], a["tiers"], target_scale, budget)
    scorecard = _scorecard_table(a["scores"])
    scale_table = _scale_table(a["tiers"])
    infra_notes = _infra_efficiency_notes(inventory)
    remediation = "\n".join(a["tasks"])
    sources = _sources_section()

    return "\n\n".join(
        [
            "# Stack Auditor Report",
            "## Executive summary\n\n" + summary,
            "## 1. Business context\n\n" + _business_context_section(a["business_context"]),
            "## 2. Product feature inventory & ranking\n\n" + _feature_ranking_section(a["features"]),
            "## 3. Prioritization framework\n\n" + _framework_section(a["framework_choice"], a["framework_applied"]),
            "## 4. Product Tree & Buy-a-Feature (trajectory / ROI)\n\n" + _product_tree_section(a["tree"], a["baf"]),
            "## 5-9. Technical deep dive & tooling benchmark\n\n"
            + _tech_deep_dive_section(inventory, a["features"], a["tech_alternatives"], a["test_taxonomy"]),
            "## Tech stack & code quality scorecard\n\n" + scorecard,
            "## Scalability/cost table\n\n" + scale_table,
            "## Infrastructure efficiency notes\n\n" + infra_notes,
            "## Security posture benchmark\n\n" + _security_benchmark_section(inventory),
            "## 10. Composite benchmark score & scale readiness\n\n" + _composite_section(a["composite"], a["tag_counts"]),
            "## Remediation task list\n\n" + remediation,
            "## Sources consulted\n\n" + sources,
        ]
    ) + "\n"


def render_agent_prompt(
    inventory: dict[str, Any],
    target_scale: str | None = None,
    budget: float | None = None,
    current_host: str | None = None,
) -> str:
    """Condensed, directive markdown meant to be pasted/ingested into Claude Code, Codex, or a
    similar agentic coding IDE as the next job. It front-loads every decision already made by
    the audit (business context, feature ranking, framework, tech swaps) so the agent spends its
    tool calls executing changes rather than re-deriving analysis, and it explicitly asks the
    agent to batch reads/edits and install any needed dependencies itself.
    """

    a = _analyze(inventory, target_scale, budget, current_host)
    repo = inventory["repo"]
    ctx = a["business_context"]

    lines = [
        "# Agent task: implement Stack Auditor recommendations",
        "",
        "You are an agentic coding IDE (Claude Code, Codex, or similar) picking up the output of a "
        "static repository audit. Everything below is already-decided analysis — do not re-derive it. "
        "Your job is to implement the changes. Work in priority order (fix-now, then fix-before-next-tier, "
        "then future-proofing). Install any packages you need yourself instead of asking. Batch your reads "
        "and edits per task (open each affected file once, make all edits for that task, then move to the "
        "next task) to minimize tool calls before producing your final summary. Preserve existing behavior "
        "and add or update tests for any changed path. If a task cannot be verified from this repo, say so "
        "explicitly in your final summary instead of guessing.",
        "",
        f"Repo: `{repo.get('source')}` (branch: `{repo.get('branch') or 'default'}`), classified as {repo['app_type']}.",
        "",
        "## Business context (inferred, verify with product owner if it matters for a decision)",
        f"- Problem: {ctx['problem_statement']}",
        f"- Target customers: {ctx['target_customers']}",
        f"- Industry / sub-domain: {ctx['industry']} / {ctx['sub_domain']}",
        f"- Confidence: {ctx['confidence']}",
        "",
        f"## Prioritization framework in use: {a['framework_choice']['framework']}",
        a["framework_choice"]["reasoning"],
    ]

    if a["framework_applied"]["recommended_changes"]:
        lines.append("\nRe-prioritization changes to reflect in backlog/issue tracker (not code):")
        for change in a["framework_applied"]["recommended_changes"]:
            lines.append(f"- {change}")

    if a["tech_alternatives"]:
        lines.append("\n## Technical swaps to implement (install packages as needed)")
        for rule in a["tech_alternatives"]:
            lines.append(f"- **{rule['area']}**: {rule['signal']} → {rule['alternative']}. {rule['token_note']}")

    lines.append("\n## Task list (do these, in order)")
    for task in a["tasks"]:
        lines.append(task)

    composite = a["composite"]
    lines += [
        "",
        "## Success criteria",
        f"- Composite benchmark score before: {composite['composite_score']}/10 (`{composite['current_ready_tier']}` readiness).",
        f"- Target after this pass: {composite['projected_score_after_fixes']}/10 (`{composite['projected_ready_tier']}` readiness).",
        "- Re-run `stack-auditor` (or the web tool) after your changes to confirm the fix-now items no longer appear in the remediation list.",
        "",
        "## Constraints",
        "- Do not fabricate pricing, benchmark, or capacity numbers; if you need one, cite a source or label it estimated.",
        "- Keep diffs scoped to the tasks above; do not refactor unrelated code.",
        "- Minimize tool calls: prefer one pass of reads before a batch of edits per task over interleaving many small reads and edits.",
    ]
    return "\n".join(lines) + "\n"


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


def _remediation_task_list(inventory: dict[str, Any], scores: list[dict[str, Any]], target_scale: str | None) -> list[str]:
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
    return tasks


def _count_task_tags(tasks: list[str]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for task in tasks:
        match = re.match(r"- \[([^\]]+)\]", task)
        if match:
            counts[match.group(1)] = counts.get(match.group(1), 0) + 1
    return counts


def _business_context_section(ctx: dict[str, Any]) -> str:
    competitors = _join(ctx["potential_competitors"]) or "none surfaced from static evidence"
    lines = [
        f"- **Problem statement** ({ctx['confidence']} confidence): {ctx['problem_statement']}",
        f"- **Target customers** (inferred): {ctx['target_customers']}",
        f"- **Industry** (inferred): {ctx['industry']}",
        f"- **Sub-domain** (inferred): {ctx['sub_domain']}",
        f"- **Potential competitors** (curated static mapping, not a market study): {competitors}",
        f"- Evidence used: README found={ctx['evidence']['readme_found']}, package description found={ctx['evidence']['package_description_found']}, "
        f"keyword count={ctx['evidence']['keyword_count']}, industry keyword hits={ctx['evidence']['industry_keyword_hits']}.",
        "- This section is inferred from README/package-description/keyword text and dependency signals only. Treat it as a starting hypothesis to verify with the product owner, not a market-research finding.",
    ]
    live = ctx.get("live_search_evidence")
    if live and live.get("results"):
        lines.append(f"\n**Live SERP evidence (Bright Data)** for \"{live['query']}\" — real search results, source-labeled by Bright Data's parser; verify relevance yourself before treating any of these as a confirmed competitor:")
        for item in live["results"][:5]:
            label = item.get("source") or item["title"]
            lines.append(f"  - **{label}** — [{item['title']}]({item['link']}): {item['description']}")
    elif brightdata.is_configured():
        lines.append("\n- Live SERP evidence: Bright Data was configured but returned no results for this query.")
    else:
        lines.append("\n- Live SERP evidence: not fetched (set `BRIGHTDATA_API_KEY` and `BRIGHTDATA_SERP_ZONE` to enable).")
    return "\n".join(lines)


def _feature_ranking_section(features: list[dict[str, Any]]) -> str:
    if not features:
        return "No segmentable product features were found from route/page/component file layout. This usually means the repo is a library, a very small app, or uses an unconventional file structure this scanner doesn't recognize."
    rows = [
        "| Feature | Category | Relevance (core-logic dependency) | Repeatability (file-touchpoint proxy) | Efficiency (build-vs-buy leverage) | Composite | Risk if missing |",
        "|---|---|---:|---:|---:|---:|---|",
    ]
    for f in features:
        rows.append(
            f"| `{f['name']}` | {f['category']} | {f['relevance']}/10 | {f['repeatability']}/10 | {f['efficiency']}/10 | {f['composite']} | {f['risk_if_missing']} |"
        )
    note = (
        "\nRelevance answers \"is core logic non-implementable without it, and how much effort/risk would replacing it cost\". "
        "Repeatability is a static proxy (file-touchpoint count across the codebase), not real navigation telemetry — verify against product analytics. "
        "Efficiency reflects build-vs-buy leverage from `reference/feature_market_playbook.md`."
    )
    return "\n".join(rows) + "\n" + note


def _framework_section(choice: dict[str, Any], applied: dict[str, Any]) -> str:
    lines = [
        f"**Framework selected: {choice['framework']}.** {choice['reasoning']}",
    ]
    if choice.get("runners_up"):
        lines.append(f"Runner-up frameworks considered: {_join(choice['runners_up'])}.")
    if applied["rows"]:
        lines.append("")
        lines.append("| Feature | " + applied["rows"][0]["framework_label"] + " |")
        lines.append("|---|---:|")
        for row in applied["rows"]:
            lines.append(f"| `{row['name']}` | {row['framework_score']} |")
    if applied["recommended_changes"]:
        lines.append("\n**Recommended re-prioritization changes:**")
        for change in applied["recommended_changes"]:
            lines.append(f"- {change}")
    else:
        lines.append("\nNo re-prioritization changes are recommended — current file-count-implied investment roughly tracks the framework's ranking.")
    return "\n".join(lines)


def _product_tree_section(tree: list[dict[str, Any]], baf: dict[str, Any]) -> str:
    if not tree:
        return "No features were available to place on a Product Tree or run through Buy-a-Feature."
    lines = ["### Product Tree placement", "", "| Feature | Placement | Category |", "|---|---|---|"]
    for item in tree:
        lines.append(f"| `{item['name']}` | {item['placement']} | {item['category']} |")

    lines += ["", "### Buy-a-Feature (simulated persona demand, ROI signal)", ""]
    lines.append("Four personas (End user, Growth/marketing, Security/compliance, Engineering/platform) each allocate a 100-unit hypothetical budget across features by simulated interest. This is a static-evidence simulation, not real user research.")
    lines.append("")
    lines.append("| Feature | Total demand units | End user | Growth/marketing | Security/compliance | Engineering/platform |")
    lines.append("|---|---:|---:|---:|---:|---:|")
    for row in baf["ranking"]:
        pb = row["persona_budgets"]
        lines.append(
            f"| `{row['name']}` | {row['total_demand_units']} | {pb['End user']} | {pb['Growth / marketing']} | {pb['Security / compliance']} | {pb['Engineering / platform']} |"
        )
    if baf["possible_overinvestment"]:
        lines.append("\n**Honest call-outs (possible over-investment relative to simulated demand):**")
        for note in baf["possible_overinvestment"]:
            lines.append(f"- {note}")
    return "\n".join(lines)


def _tech_deep_dive_section(
    inventory: dict[str, Any],
    features: list[dict[str, Any]],
    tech_alternatives: list[dict[str, Any]],
    test_taxonomy: dict[str, Any],
) -> str:
    lines = ["### Per-feature technical mapping"]
    if features:
        lines.append("")
        lines.append("| Feature | Layers touched | Files | Tests found | Evidence paths |")
        lines.append("|---|---|---:|---|---|")
        for f in features:
            lines.append(
                f"| `{f['name']}` | {_join(f['layers']) or 'unknown'} | {f['file_count']} | {'yes' if f['has_tests'] else 'no'} | {_join(f['evidence_paths'])} |"
            )
    else:
        lines.append("No features segmented; see stack scorecard below for whole-repo signal instead.")

    lines.append("\n### Architecture, frontend, and backend/database tooling benchmark")
    if tech_alternatives:
        lines.append("")
        lines.append("| Area | Signal | Fits at | Breaks at | Recommended alternative | Why it reduces agent token/context load |")
        lines.append("|---|---|---|---|---|---|")
        for rule in tech_alternatives:
            lines.append(
                f"| {rule['area']} | {rule['signal']} | {rule['fits_at']} | {rule['breaks_at']} | {rule['alternative']} | {rule['token_note']} |"
            )
    else:
        lines.append("\nNo tooling-alternative triggers fired against `reference/tech_alternatives.md` — no evidence-backed swap to recommend from this static scan.")

    lines.append("\n### Test coverage benchmark")
    if test_taxonomy["total_test_files"]:
        lines.append(f"\n{test_taxonomy['total_test_files']} test file(s) found. Classified by conventional test type (filename/path heuristic):\n")
        lines.append("| Test type | Example files |")
        lines.append("|---|---|")
        for label, sample in test_taxonomy["by_type"].items():
            lines.append(f"| {label} | {_join(sample)} |")
        if test_taxonomy["missing_types"]:
            lines.append(f"\n**Missing test types (no file-naming evidence found):** {_join(test_taxonomy['missing_types'])}.")
    else:
        lines.append("\nNo test files were found at all. Unit, integration, sanity, and regression coverage are all unverified.")
    lines.append(f"\n{test_taxonomy['exploratory_note']}")

    return "\n".join(lines)


def _security_benchmark_section(inventory: dict[str, Any]) -> str:
    security = inventory.get("quality", {}).get("security", {})
    arch = inventory.get("architecture", {})
    lines = [
        f"- **Auth**: {_join(security.get('auth_signal')) or 'no auth library/dependency detected'}.",
        f"- **Env samples**: {'present' if security.get('env_samples_present') else 'not found'}; "
        f"**committed runtime env files** (risk if secrets are inside): {_join(security.get('committed_runtime_env_files')) or 'none detected'}.",
        f"- **External/third-party APIs used**: {_join(arch.get('third_party_services')) or 'none detected'}.",
        f"- **CORS dependency**: {_join(security.get('cors_signal')) or 'none detected'}. "
        f"**Rate-limit dependency**: {_join(security.get('rate_limit_signal')) or 'none detected'}.",
        f"- **System ports exposed** (Dockerfile `EXPOSE` / compose port mappings): "
        + (_join([f"{p['port']}" + (f" ({p['service']})" if p.get("service") else "") + f" in {p['path']}" for p in security.get("exposed_ports", [])]) or "none detected"),
        f"- **Secret-management evidence**: secret-like filenames: {_join(security.get('secret_like_filenames')) or 'none'}; "
        f"grep-based high-signal secret pattern hits (AWS/Stripe/Google/private-key/Slack/GitHub token formats only, not a full scanner): "
        + (_join([f"{h['pattern']} in {h['path']}" for h in security.get("secret_scan_hits", [])]) or "none detected"),
        "- This is a static, non-exploitative check (regex pattern match + dependency/file presence only). It is not a substitute for a dedicated secret scanner (gitleaks/trufflehog), SAST tool, or a real penetration test.",
    ]
    return "\n".join(lines)


def _composite_section(composite: dict[str, Any], tag_counts: dict[str, int]) -> str:
    tier_users = {
        "0-to-1": "pre-launch / first users",
        "1-to-100": "early adopters",
        "100-to-10k": "product-market-fit stage",
        "10k-to-1m": "growth stage",
        "1m-to-100m": "hyperscale",
    }
    lines = [
        f"- **Composite benchmark score**: {composite['composite_score']}/10 "
        f"(scorecard dimensions + feature-depth score {composite['feature_depth_score']}/10 — {composite['feature_depth_note']}).",
        f"- **Current user-scale readiness**: `{composite['current_ready_tier']}` ({tier_users[composite['current_ready_tier']]}).",
        f"- **Projected score after fix-now/fix-before-next-tier remediation**: {composite['projected_score_after_fixes']}/10 "
        f"→ projected readiness `{composite['projected_ready_tier']}` ({tier_users[composite['projected_ready_tier']]}), "
        f"based on {tag_counts.get('fix-now', 0)} fix-now and {tag_counts.get('fix-before-next-tier', 0)} fix-before-next-tier task(s) in the remediation list below.",
        f"- **Estimated agent token/context reduction from recommended swaps**: ~{composite['estimated_token_reduction_pct']}%. {composite['token_reduction_note']}",
    ]
    return "\n".join(lines)


def _sources_section() -> str:
    rows = []
    for source in source_list():
        line = f"- {source['name']}: {source['url']} (accessed {source['accessed']})"
        verification = verify_pricing_source(source["name"], source["url"])
        if verification:
            if verification["matches"]:
                line += " — live-verified current (Bright Data)"
            else:
                line += f" — Bright Data top result now points at `{verification['top_result_domain']}`; re-check this URL"
        rows.append(line)
    rows.append("- Local reference: `reference/scoring_rubric.md`")
    rows.append("- Local reference: `reference/scale_tiers.md`")
    if not brightdata.is_configured():
        rows.append("- Live source verification: not run (set `BRIGHTDATA_API_KEY` and `BRIGHTDATA_SERP_ZONE` to enable freshness checks on the pricing URLs above).")
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
