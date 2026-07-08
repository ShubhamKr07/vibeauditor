from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .dotenv import load_dotenv
from .report import render_agent_prompt, render_report
from .scan import scan_repository


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="stack-auditor",
        description="Audit a web/mobile app repository for stack, scalability, and cost posture.",
    )
    parser.add_argument("repo", help="GitHub URL or local repository path")
    parser.add_argument("--branch", help="Branch or tag to scan")
    parser.add_argument("--budget", type=float, help="Monthly budget ceiling in USD")
    parser.add_argument(
        "--target-scale",
        choices=["0-to-1", "1-to-100", "100-to-10k", "10k-to-1m", "1m-to-100m"],
        help="Target growth tier for recommendations",
    )
    parser.add_argument("--current-host", help="Current hosting provider, if known")
    parser.add_argument("--output", help="Report output path. Defaults to stack-audit-report.md in the scanned repo.")
    parser.add_argument(
        "--agent-prompt-output",
        help="Agent-prompt output path. Defaults to <output>-agent-prompt.md next to the report.",
    )
    parser.add_argument(
        "--no-agent-prompt",
        action="store_true",
        help="Skip writing the agent-prompt.md file.",
    )
    parser.add_argument("--json", action="store_true", help="Print scan inventory JSON instead of Markdown report")
    parser.add_argument("--keep-worktree", action="store_true", help="Do not delete a temporary cloned repo")
    return parser


def main(argv: list[str] | None = None) -> int:
    load_dotenv()
    args = build_parser().parse_args(argv)
    try:
        inventory = scan_repository(args.repo, branch=args.branch, keep_worktree=args.keep_worktree)
        if args.json:
            print(json.dumps(inventory, indent=2, sort_keys=True))
            return 0

        report = render_report(
            inventory,
            target_scale=args.target_scale,
            budget=args.budget,
            current_host=args.current_host,
        )
        if args.output:
            output_path = Path(args.output)
        elif inventory["repo"].get("temporary_clone_removed"):
            output_path = Path.cwd() / "stack-audit-report.md"
        else:
            output_path = Path(inventory["repo"]["path"]) / "stack-audit-report.md"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(report, encoding="utf-8")
        print(report)
        print(f"\nReport written to: {output_path}")

        if not args.no_agent_prompt:
            if args.agent_prompt_output:
                agent_prompt_path = Path(args.agent_prompt_output)
            else:
                agent_prompt_path = output_path.with_name(f"{output_path.stem}-agent-prompt.md")
            agent_prompt = render_agent_prompt(
                inventory,
                target_scale=args.target_scale,
                budget=args.budget,
                current_host=args.current_host,
            )
            agent_prompt_path.parent.mkdir(parents=True, exist_ok=True)
            agent_prompt_path.write_text(agent_prompt, encoding="utf-8")
            print(f"Agent prompt written to: {agent_prompt_path}")
        return 0
    except Exception as exc:  # pragma: no cover - exercised by CLI users
        print(f"stack-auditor failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
