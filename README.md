# Stack Auditor

Stack Auditor is a standalone CLI for auditing a web or mobile app repository. It scans the repo, identifies stack and infrastructure signals, estimates scalability/cost posture, and emits a plain-language Markdown report with remediation tasks that can be pasted into Codex, Claude Code, Cursor, or a similar coding agent.

It also includes a static interactive web tool in `web/` for browser-based GitHub scans.

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
stack-auditor <repo-url-or-path> [--branch BRANCH] [--budget USD_PER_MONTH] [--target-scale TIER] [--current-host HOST] [--output REPORT.md]
```

Examples:

```bash
stack-auditor https://github.com/example/app --branch main --budget 250 --target-scale 100-to-10k
stack-auditor ./tests/fixtures/sample_next_app --output ./stack-audit-report.md
python -m stack_auditor ./tests/fixtures/sample_django_app --json
```

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
- Frontend/backend/API file layout
- Database, auth, background job, and third-party service dependency signals
- Docker, Compose, Vercel, Netlify, Terraform, Pulumi, Serverless, and GitHub Actions files
- Tests, coverage hints, lockfiles, env samples, and risky committed env files

Stack Auditor is intentionally conservative. If a repo lacks enough evidence to assess something, the report says so instead of inventing confidence.

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
- `stack_auditor/scan.py`: repo inventory and stack/infra detection
- `stack_auditor/pricing.py`: pricing/source helpers and dated estimated tier data
- `stack_auditor/report.py`: scoring and report rendering
- `reference/scoring_rubric.md`: repeatable scoring rubric
- `reference/scale_tiers.md`: scale tier definitions and cost assumptions
- `templates/report_template.md`: report skeleton
- `web/`: static interactive browser tool
- `tests/`: scanner, renderer, and smoke tests

## Limitations

- Static analysis cannot prove runtime latency, cache hit rate, database query plans, or dependency vulnerabilities.
- Public GitHub cloning requires network access and credentials for private repos.
- Dependency audits are noted but not run automatically by default because audit commands can be slow, ecosystem-specific, and network-dependent.
- The browser tool uses the GitHub API file tree and manifest contents, so it cannot run package-manager audits or inspect local uncommitted files.
