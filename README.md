# Stack Auditor

Stack Auditor is a standalone CLI for auditing a web or mobile app repository. It scans the repo, identifies stack and infrastructure signals, estimates scalability/cost posture, and emits a plain-language Markdown report with remediation tasks that can be pasted into Codex, Claude Code, Cursor, or a similar coding agent.

Beyond the tech/infra audit, it also infers the app's business context (problem, target
customers, industry/sub-domain, potential competitors), segments the app into product
features and ranks them by relevance/repeatability/efficiency, picks a prioritization
framework (RICE, MoSCoW, Kano, DVF, Weighted Scoring, or Cost of Delay) and applies it,
evaluates the feature set with a Product Tree and simulated Buy-a-Feature exercise, benchmarks
the architecture/frontend/backend/testing/security posture against industry-standard
alternatives, and rolls everything into a composite score with a user-scale-readiness
projection. Every inference is evidence-based and confidence-labeled — see
`stack_auditor/business.py` and `reference/feature_market_playbook.md` /
`reference/tech_alternatives.md` for the ground rules and source data.

It also includes a static interactive web tool in `web/` for browser-based GitHub scans, with
full feature parity with the CLI pipeline described above.

## Install

From this repository:

```bash
python -m pip install -e .
```

For development tests:

```bash
python -m pip install -e ".[dev]"
python -m pytest
```

## Usage

CLI:

```bash
stack-auditor <repo-url-or-path> [--branch BRANCH] [--budget USD_PER_MONTH] [--target-scale TIER] [--current-host HOST] [--output REPORT.md] [--agent-prompt-output PROMPT.md] [--no-agent-prompt]
```

Examples:

```bash
stack-auditor https://github.com/example/app --branch main --budget 250 --target-scale 100-to-10k
stack-auditor ./tests/fixtures/sample_next_app --output ./stack-audit-report.md
python -m stack_auditor ./tests/fixtures/sample_django_app --json
```

By default this writes two files: the full report (`--output`, default
`stack-audit-report.md`) and a condensed `stack-audit-report-agent-prompt.md` meant to be
pasted directly into Claude Code, Codex, or a similar agentic IDE as the next job — it bundles
the business context, chosen prioritization framework, recommended tech swaps, and the
prioritized task list so the agent can act without re-deriving the analysis. Pass
`--no-agent-prompt` to skip it.

Interactive web tool:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://127.0.0.1:8000/web/
```

The web tool accepts a GitHub repo URL, optional branch/tag, budget, target scale, current host, and optional GitHub token. The token is used only in the current browser tab for GitHub API requests and is not stored by the app.

Valid `--target-scale` values:

- `0-to-1`
- `1-to-100`
- `100-to-10k`
- `10k-to-1m`
- `1m-to-100m`

## What It Detects

- Languages, package managers, manifests, and major frameworks
- Frontend/backend/API file layout, segmented into named product features (e.g. `checkout`, `auth`, `dashboard`)
- Database, auth, background job, and third-party service dependency signals
- CORS and rate-limiting dependency presence, Dockerfile/compose exposed ports, and a lightweight high-signal secret pattern check (AWS/Stripe/Google/private-key/Slack/GitHub token formats)
- Docker, Compose, Vercel, Netlify, Terraform, Pulumi, Serverless, and GitHub Actions files
- Tests, coverage hints, lockfiles, env samples, and risky committed env files, classified into unit/integration/e2e/sanity test types where filename evidence allows
- README/package-description/keyword text, used only to infer business context (never scraped or sent anywhere)

Stack Auditor is intentionally conservative. If a repo lacks enough evidence to assess something, the report says so instead of inventing confidence.

## Live search evidence (optional, Bright Data)

Competitor inference in the business-context section and pricing-URL freshness checks in the
sources section are static/curated by default. Set these environment variables to enable a
live Bright Data SERP API lookup that supplements (never replaces) the static evidence:

```bash
export BRIGHTDATA_API_KEY=...      # from your Bright Data SERP API zone's Overview tab
export BRIGHTDATA_SERP_ZONE=...    # your SERP API zone name
```

Never commit these values. If unset, the report says so explicitly instead of silently
skipping the section. The web tool has matching optional "Bright Data API key"/"zone" fields
that stay in-browser only (never stored or sent anywhere except `api.brightdata.com`); a
static page has no backend, so a cross-origin request there can be blocked by the browser's
CORS policy — if that happens, the report notes it and falls back to static evidence.

## Pricing and Benchmarks

Pricing rows are marked estimated unless an exact provider-specific figure is fetched and cited. Current implementation includes dated provider pricing/source links and static reference ranges in `reference/scale_tiers.md`. Future provider parsers should extend `stack_auditor/pricing.py` without weakening the rule: no uncited numbers.

## Using inside Codex

Run the auditor, then paste the generated remediation task list back into Codex as the next job:

```text
Use the remediation task list from stack-audit-report.md as the implementation plan.
Work through the fix-now items first, then fix-before-next-tier.
Preserve existing behavior, add tests for changed paths, and report any task that cannot be verified from the repo.
```

## Repository Layout

- `AGENTS.md`: repo-level operating instructions for Codex
- `stack_auditor/scan.py`: repo inventory, stack/infra detection, feature segmentation, and security signal collection
- `stack_auditor/business.py`: business-context inference, feature scoring, prioritization-framework selection, Product Tree/Buy-a-Feature, tech-alternative benchmarking, composite scoring
- `stack_auditor/pricing.py`: pricing/source helpers and dated estimated tier data
- `stack_auditor/report.py`: scoring and report rendering, plus `render_agent_prompt()` for the agent-ready output
- `reference/scoring_rubric.md`: repeatable scoring rubric
- `reference/scale_tiers.md`: scale tier definitions and cost assumptions
- `reference/feature_market_playbook.md`: build-vs-buy market comparables backing feature efficiency/Buy-a-Feature reasoning
- `reference/tech_alternatives.md`: tooling-swap benchmark rules and their agent-token-load rationale
- `templates/report_template.md`: report skeleton
- `web/`: static interactive browser tool, feature-parity mirror of the Python pipeline
- `tests/`: scanner, business-logic, renderer, and CLI tests

## Limitations

- Static analysis cannot prove runtime latency, cache hit rate, database query plans, or dependency vulnerabilities.
- Public GitHub cloning requires network access and credentials for private repos.
- Dependency audits are noted but not run automatically by default because audit commands can be slow, ecosystem-specific, and network-dependent.
- The browser tool uses the GitHub API file tree and manifest contents, so it cannot run package-manager audits or inspect local uncommitted files.
