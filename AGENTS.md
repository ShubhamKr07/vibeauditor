# Stack Auditor Agent Guide

Stack Auditor is a standalone CLI that takes a GitHub repository URL or local repo path for a web/mobile app and emits a plain-language scalability, cost, and tech-stack audit.

## How to Run

```bash
stack-auditor <repo-url-or-path> [--branch BRANCH] [--budget USD_PER_MONTH] [--target-scale TIER] [--current-host HOST] [--output REPORT.md]
```

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

- `stack_auditor/scan.py` clones or reads a repo, inventories files, detects languages/frameworks/manifests, maps architecture signals, and emits structured JSON.
- `stack_auditor/pricing.py` owns pricing/source helpers, local cache handling, and dated cost estimate scaffolding.
- `stack_auditor/report.py` turns scan JSON plus references into the final Markdown report.
- `reference/scoring_rubric.md` defines the repeatable 1-10 scoring rubric.
- `reference/scale_tiers.md` defines growth tiers, likely bottlenecks, and static cost modeling assumptions.
- `templates/report_template.md` defines the report skeleton.
- `web/` contains the static interactive browser tool. It uses GitHub API reads from the browser, renders scorecards/tier tables/tasks, and exports Markdown.
- `tests/fixtures/` contains small app repos used by tests.

## Non-Negotiable Source Rule

Never fabricate pricing, benchmark, or capacity numbers. Any number must either:

1. cite a dated source URL, or
2. be clearly labeled `estimated` with the reasoning and assumptions shown.

If current pricing cannot be fetched in the execution environment, use the static reference ranges, mark them estimated, include the provider pricing URLs, and state the access/check date.

## Development Notes

- Keep scans read-only except for the report output path requested by the user.
- Use shallow clones only.
- Skip vendor/binary/build directories such as `node_modules`, `.git`, `dist`, `build`, `.next`, `venv`, and large binary assets.
- Prefer evidence from files over inference. When evidence is missing, say so in the report.
- Keep remediation tasks paste-ready for Codex/Claude/Cursor: each task should say what to change, likely affected files/patterns, and expected scalability or cost benefit.
