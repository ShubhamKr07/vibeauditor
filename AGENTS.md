# Stack Auditor Agent Guide

Stack Auditor is a standalone CLI that takes a GitHub repository URL or local repo path for a web/mobile app and emits a plain-language scalability, cost, and tech-stack audit.

## How to Run

```bash
stack-auditor <repo-url-or-path> [--branch BRANCH] [--budget USD_PER_MONTH] [--target-scale TIER] [--current-host HOST] [--output REPORT.md] [--agent-prompt-output PROMPT.md] [--no-agent-prompt]
```

By default the CLI writes two files: the full Markdown report (`--output`) and a condensed,
directive `<output>-agent-prompt.md` meant to be pasted straight into Claude Code, Codex, or a
similar agentic IDE as the next job. Use `--no-agent-prompt` to skip the second file, or
`--agent-prompt-output` to control its path.

Examples:

```bash
stack-auditor https://github.com/example/app --target-scale 100-to-10k --budget 250
stack-auditor ./tests/fixtures/sample_next_app --output /tmp/stack-audit-report.md
```

Interactive web version:

```bash
python3 -m http.server 8000
```

Open `http://127.0.0.1:8000/web/`.

## Project Map

- `stack_auditor/scan.py` clones or reads a repo, inventories files, detects languages/frameworks/manifests, maps architecture signals, segments product features from route/page/component file layout, runs a lightweight grep-only secret/port/CORS/rate-limit check, and emits structured JSON (including `business` and `features` keys).
- `stack_auditor/business.py` turns that JSON into business-context inference, feature relevance/repeatability/efficiency scoring, prioritization-framework selection (RICE/MoSCoW/Kano/DVF/Weighted Scoring/Cost of Delay) and application, Product Tree + Buy-a-Feature evaluation, tech-alternative benchmarking, test-taxonomy classification, and a composite score with scale-tier projection. Everything here is static-evidence-derived and confidence-labeled — see the module docstring for the ground rules.
- `stack_auditor/pricing.py` owns pricing/source helpers, local cache handling, and dated cost estimate scaffolding.
- `stack_auditor/report.py` turns scan JSON plus `business.py` output into the final Markdown report (`render_report`) and a separate, condensed agent-ready prompt (`render_agent_prompt`) meant to be pasted into Claude Code/Codex.
- `reference/scoring_rubric.md` defines the repeatable 1-10 scoring rubric.
- `reference/scale_tiers.md` defines growth tiers, likely bottlenecks, and static cost modeling assumptions.
- `reference/feature_market_playbook.md` documents the build-vs-buy market comparables (Stripe for payments, Algolia for search, etc.) used to justify feature efficiency scores and Buy-a-Feature reasoning — qualitative and durable, not dated figures.
- `reference/tech_alternatives.md` documents the tooling-swap rules (e.g. SQLite -> managed Postgres) used in the architecture/frontend/backend benchmark, including the "why it reduces agent token/context load" reasoning.
- `templates/report_template.md` defines the report skeleton.
- `stack_auditor/brightdata.py` is an optional Bright Data SERP API client (`BRIGHTDATA_API_KEY` + `BRIGHTDATA_SERP_ZONE` env vars). Every function returns `None` and never raises when unconfigured or a request fails — live search is supplementary evidence, never a hard dependency. Never hardcode a key/zone value in source; read from the environment only.
- `web/` contains the static interactive browser tool. It mirrors the full Python pipeline in `web/app.js` (business context, feature scoring, framework selection, Product Tree/Buy-a-Feature, tech benchmarks, composite score, agent prompt) using GitHub API reads from the browser, and exports both the Markdown report and the agent prompt. Its optional Bright Data fields are runtime-only, in-tab inputs (same pattern as the GitHub token field) — never embed a real key in this file, since it is public static JS served to every visitor.
- `tests/fixtures/` contains small app repos used by tests.

## Non-Negotiable Source Rule

Never fabricate pricing, benchmark, or capacity numbers. Any number must either:

1. cite a dated source URL, or
2. be clearly labeled `estimated` with the reasoning and assumptions shown.

If current pricing cannot be fetched in the execution environment, use the static reference ranges, mark them estimated, include the provider pricing URLs, and state the access/check date.

The same rule extends to business-context inference (problem statement, target customers, industry, competitors) and feature-level judgments (Product Tree placement, Buy-a-Feature demand, prioritization-framework scores): these are heuristics over static file/README/dependency evidence, not market research. Always label them with a confidence level and keep the underlying evidence visible so a reader can verify or discard the inference.

## Development Notes

- Keep scans read-only except for the report output path requested by the user.
- Use shallow clones only.
- Skip vendor/binary/build directories such as `node_modules`, `.git`, `dist`, `build`, `.next`, `venv`, and large binary assets.
- Prefer evidence from files over inference. When evidence is missing, say so in the report.
- Keep remediation tasks paste-ready for Codex/Claude/Cursor: each task should say what to change, likely affected files/patterns, and expected scalability or cost benefit.
