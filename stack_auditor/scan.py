from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
from collections import Counter
from pathlib import Path
from typing import Any

SKIP_DIRS = {
    ".git",
    ".hg",
    ".svn",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".next",
    ".nuxt",
    "node_modules",
    "vendor",
    "dist",
    "build",
    "coverage",
    ".venv",
    "venv",
    "env",
    "target",
}

TEXT_SUFFIXES = {
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".py",
    ".rb",
    ".go",
    ".rs",
    ".php",
    ".java",
    ".kt",
    ".swift",
    ".dart",
    ".json",
    ".toml",
    ".yaml",
    ".yml",
    ".env",
    ".md",
    ".txt",
    ".Dockerfile",
}

LANG_BY_SUFFIX = {
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".py": "Python",
    ".rb": "Ruby",
    ".go": "Go",
    ".rs": "Rust",
    ".php": "PHP",
    ".java": "Java",
    ".kt": "Kotlin",
    ".swift": "Swift",
    ".dart": "Dart",
}

MANIFESTS = {
    "package.json": "node",
    "requirements.txt": "python",
    "pyproject.toml": "python",
    "Pipfile": "python",
    "poetry.lock": "python",
    "Gemfile": "ruby",
    "go.mod": "go",
    "Cargo.toml": "rust",
    "composer.json": "php",
    "pubspec.yaml": "dart",
}

FRAMEWORK_DEPENDENCIES = {
    "next": "Next.js",
    "react": "React",
    "vue": "Vue",
    "nuxt": "Nuxt",
    "svelte": "Svelte",
    "@angular/core": "Angular",
    "express": "Express",
    "fastify": "Fastify",
    "nestjs": "NestJS",
    "@nestjs/core": "NestJS",
    "django": "Django",
    "flask": "Flask",
    "fastapi": "FastAPI",
    "rails": "Ruby on Rails",
}

DB_DEPENDENCIES = {
    "pg": "PostgreSQL",
    "postgres": "PostgreSQL",
    "psycopg2": "PostgreSQL",
    "psycopg2-binary": "PostgreSQL",
    "psycopg": "PostgreSQL",
    "mysql": "MySQL",
    "mysql2": "MySQL",
    "sqlite3": "SQLite",
    "better-sqlite3": "SQLite",
    "mongoose": "MongoDB",
    "mongodb": "MongoDB",
    "redis": "Redis",
    "ioredis": "Redis",
    "prisma": "Prisma ORM",
    "sqlalchemy": "SQLAlchemy ORM",
    "sequelize": "Sequelize ORM",
}

AUTH_DEPENDENCIES = {
    "next-auth": "NextAuth/Auth.js",
    "auth.js": "Auth.js",
    "@clerk/nextjs": "Clerk",
    "clerk": "Clerk",
    "@supabase/supabase-js": "Supabase Auth",
    "firebase": "Firebase Auth",
    "passport": "Passport.js",
    "django-allauth": "django-allauth",
    "djangorestframework-simplejwt": "JWT auth",
}

QUEUE_DEPENDENCIES = {
    "bull": "Bull queue",
    "bullmq": "BullMQ",
    "celery": "Celery",
    "rq": "RQ",
    "dramatiq": "Dramatiq",
    "sidekiq": "Sidekiq",
}

THIRD_PARTY_DEPENDENCIES = {
    "stripe": "Stripe",
    "@stripe/stripe-js": "Stripe",
    "openai": "OpenAI",
    "@anthropic-ai/sdk": "Anthropic",
    "anthropic": "Anthropic",
    "@sentry/nextjs": "Sentry",
    "sentry-sdk": "Sentry",
    "posthog-js": "PostHog",
    "resend": "Resend",
    "twilio": "Twilio",
    "algoliasearch": "Algolia",
    "elasticsearch": "Elasticsearch",
    "@sendgrid/mail": "SendGrid",
    "launchdarkly-node-server-sdk": "LaunchDarkly",
}

CORS_DEPENDENCIES = {
    "cors": "cors (npm)",
    "django-cors-headers": "django-cors-headers",
    "flask-cors": "Flask-CORS",
    "fastapi-cors": "FastAPI CORS",
}

RATE_LIMIT_DEPENDENCIES = {
    "express-rate-limit": "express-rate-limit",
    "django-ratelimit": "django-ratelimit",
    "slowapi": "slowapi",
    "flask-limiter": "Flask-Limiter",
    "rack-attack": "rack-attack",
}

INFRA_PATTERNS = {
    "Dockerfile": "Dockerfile",
    "docker-compose.yml": "Docker Compose",
    "docker-compose.yaml": "Docker Compose",
    "terraform": "Terraform",
    ".tf": "Terraform",
    "pulumi": "Pulumi",
    "cdk.json": "AWS CDK",
    "vercel.json": "Vercel",
    "netlify.toml": "Netlify",
    "serverless.yml": "Serverless Framework",
    "serverless.yaml": "Serverless Framework",
    ".github/workflows": "GitHub Actions",
}

README_NAMES = {"readme.md", "readme.rst", "readme.txt", "readme"}

NOISE_FEATURE_NAMES = {
    "api",
    "components",
    "component",
    "lib",
    "libs",
    "utils",
    "util",
    "common",
    "shared",
    "types",
    "hooks",
    "styles",
    "assets",
    "public",
    "static",
    "__tests__",
    "test",
    "tests",
    "ui",
    "misc",
    "index",
    "constants",
    "config",
    "middleware",
    "migrations",
    "static_files",
    "templates",
    "settings",
    "urls",
    "wsgi",
    "asgi",
    "manage",
    "admin",
    "apps",
    "serializers",
    "views",
    "models",
}

FRONTEND_FRAMEWORKS = {"Next.js", "React", "Vue", "Nuxt", "Svelte", "Angular"}

FEATURE_ROOTS = [
    ("app/api/", "api"),
    ("pages/api/", "api"),
    ("app/", "frontend"),
    ("pages/", "frontend"),
    ("src/", "generic"),
    ("components/", "frontend"),
    ("server/", "backend"),
    ("backend/", "backend"),
    ("routes/", "api"),
    ("controllers/", "api"),
]

# Grep-only, non-invasive patterns for a lightweight committed-secret sanity check.
# This is not a substitute for a real secret scanner (gitleaks/trufflehog); it only
# flags a small set of unambiguous high-signal formats to avoid false-positive noise.
SECRET_PATTERNS = [
    (re.compile(r"AKIA[0-9A-Z]{16}"), "AWS access key ID pattern"),
    (re.compile(r"sk_live_[0-9a-zA-Z]{16,}"), "Stripe live secret key pattern"),
    (re.compile(r"AIza[0-9A-Za-z\-_]{35}"), "Google API key pattern"),
    (re.compile(r"-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----"), "embedded private key block"),
    (re.compile(r"xox[baprs]-[0-9A-Za-z-]{10,}"), "Slack token pattern"),
    (re.compile(r"ghp_[0-9A-Za-z]{36}"), "GitHub personal access token pattern"),
]

SENSITIVE_PORT_LABELS = {
    "22": "SSH",
    "3389": "RDP",
    "5432": "PostgreSQL",
    "3306": "MySQL",
    "6379": "Redis",
    "27017": "MongoDB",
    "9200": "Elasticsearch",
}


def scan_repository(repo: str, branch: str | None = None, keep_worktree: bool = False) -> dict[str, Any]:
    repo_path, temp_dir = _materialize_repo(repo, branch)
    try:
        inventory = _scan_path(repo_path, source=repo, branch=branch)
        if temp_dir and not keep_worktree:
            inventory["repo"]["temporary_clone_removed"] = True
        return inventory
    finally:
        if temp_dir and not keep_worktree:
            shutil.rmtree(temp_dir, ignore_errors=True)


def _materialize_repo(repo: str, branch: str | None) -> tuple[Path, str | None]:
    local = Path(repo).expanduser()
    if local.exists():
        return local.resolve(), None

    if not re.match(r"^(https://github\.com/|git@github\.com:).+", repo):
        raise ValueError("repo must be an existing local path or a GitHub URL")

    temp_dir = tempfile.mkdtemp(prefix="stack-auditor-")
    clone_target = Path(temp_dir) / "repo"
    cmd = ["git", "clone", "--depth", "1"]
    if branch:
        cmd.extend(["--branch", branch])
    cmd.extend([repo, str(clone_target)])
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    return clone_target, temp_dir


def _scan_path(root: Path, source: str, branch: str | None) -> dict[str, Any]:
    files, skipped = _inventory_files(root)
    manifest_paths = [rel for rel in files if Path(rel).name in MANIFESTS]
    manifests = [_read_manifest(root, rel) for rel in manifest_paths]
    dependencies = _collect_dependencies(manifests)
    frameworks = _detect_named(dependencies, FRAMEWORK_DEPENDENCIES)
    databases = _detect_named(dependencies, DB_DEPENDENCIES)
    auth = _detect_named(dependencies, AUTH_DEPENDENCIES)
    queues = _detect_named(dependencies, QUEUE_DEPENDENCIES)
    third_party = _detect_named(dependencies, THIRD_PARTY_DEPENDENCIES)

    language_counts = Counter()
    for rel in files:
        suffix = Path(rel).suffix
        if suffix in LANG_BY_SUFFIX:
            language_counts[LANG_BY_SUFFIX[suffix]] += 1

    infra = _detect_infra(files)
    env_files = [rel for rel in files if Path(rel).name.startswith(".env") or Path(rel).name in {"env.example", ".env.example"}]
    app_type, app_warning = _classify_app(files, frameworks, manifest_paths)
    tests = _detect_tests(files, manifests)
    api = _detect_api(files, frameworks)
    frontend = _detect_frontend(files, frameworks)
    backend = _detect_backend(files, frameworks, api)
    cors = _detect_named(dependencies, CORS_DEPENDENCIES)
    rate_limit = _detect_named(dependencies, RATE_LIMIT_DEPENDENCIES)
    exposed_ports = _detect_exposed_ports(root, files)
    secret_hits = _secret_scan(root, files)
    security = _detect_security(files, env_files, auth, cors, rate_limit, exposed_ports, secret_hits)
    business = _read_business_evidence(root, files, manifests)
    features = _segment_features(files, tests.get("files", []), frameworks)

    return {
        "repo": {
            "source": source,
            "path": str(root),
            "branch": branch,
            "app_type": app_type,
            "warnings": [app_warning] if app_warning else [],
        },
        "files": {
            "count": len(files),
            "sample": files[:100],
            "skipped": skipped,
        },
        "stack": {
            "languages": dict(language_counts.most_common()),
            "frameworks": frameworks,
            "package_managers": _detect_package_managers(files),
            "manifests": manifest_paths,
            "dependencies": sorted(dependencies),
        },
        "architecture": {
            "frontend": frontend,
            "backend": backend,
            "api": api,
            "databases": databases,
            "auth": auth,
            "background_jobs": queues,
            "third_party_services": third_party,
        },
        "infra": {
            "signals": infra,
            "env_files": env_files,
            "ci_cd": [item for item in infra if item["type"] in {"GitHub Actions"}],
        },
        "quality": {
            "tests": tests,
            "security": security,
            "dependency_health": _dependency_health(files, manifests),
        },
        "business": business,
        "features": features,
    }


def _inventory_files(root: Path, max_files: int = 5000, max_depth: int = 8) -> tuple[list[str], list[str]]:
    found: list[str] = []
    skipped: list[str] = []
    for dirpath, dirnames, filenames in os.walk(root):
        current = Path(dirpath)
        rel_dir = current.relative_to(root)
        depth = 0 if str(rel_dir) == "." else len(rel_dir.parts)
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".cache")]
        if depth > max_depth:
            skipped.append(f"{rel_dir} (depth>{max_depth})")
            dirnames[:] = []
            continue
        for filename in filenames:
            path = current / filename
            rel = str(path.relative_to(root))
            if len(found) >= max_files:
                skipped.append(f"scan capped at {max_files} files")
                return found, skipped
            if _is_binary_or_large(path):
                skipped.append(f"{rel} (binary/large)")
                continue
            found.append(rel)
    return sorted(found), skipped[:200]


def _is_binary_or_large(path: Path) -> bool:
    try:
        if path.stat().st_size > 512_000:
            return True
        if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".gz"}:
            return True
    except OSError:
        return True
    return False


def _read_manifest(root: Path, rel: str) -> dict[str, Any]:
    path = root / rel
    name = path.name
    raw = _safe_read(path)
    parsed: dict[str, Any] = {"path": rel, "type": MANIFESTS.get(name, "unknown"), "dependencies": {}}
    if name == "package.json":
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            parsed["error"] = "invalid package.json"
            return parsed
        deps = {}
        for key in ("dependencies", "devDependencies", "peerDependencies", "optionalDependencies"):
            deps.update(data.get(key, {}) or {})
        parsed["dependencies"] = deps
        parsed["scripts"] = data.get("scripts", {})
        parsed["name"] = data.get("name")
    elif name == "requirements.txt":
        deps = {}
        for line in raw.splitlines():
            clean = line.strip()
            if not clean or clean.startswith("#"):
                continue
            dep = re.split(r"[<>=~!;\[]", clean, maxsplit=1)[0].strip()
            if dep:
                deps[dep.lower()] = clean
        parsed["dependencies"] = deps
    elif name == "pyproject.toml":
        deps = {}
        for match in re.finditer(r'"([A-Za-z0-9_.-]+)(?:[<>=~!][^"]*)?"', raw):
            deps[match.group(1).lower()] = match.group(0).strip('"')
        parsed["dependencies"] = deps
    elif name in {"Gemfile", "go.mod", "Cargo.toml", "composer.json", "pubspec.yaml"}:
        parsed["dependencies"] = _rough_dependency_parse(raw)
    return parsed


def _rough_dependency_parse(raw: str) -> dict[str, str]:
    deps: dict[str, str] = {}
    for line in raw.splitlines():
        clean = line.strip().strip(",")
        if not clean or clean.startswith("#"):
            continue
        for pattern in (r"gem ['\"]([^'\"]+)", r"module\s+([^\s]+)", r"require\s+([^\s]+)", r"([A-Za-z0-9_.@/-]+)\s*[:=]"):
            match = re.search(pattern, clean)
            if match:
                deps[match.group(1).lower()] = clean
                break
    return deps


def _collect_dependencies(manifests: list[dict[str, Any]]) -> set[str]:
    deps: set[str] = set()
    for manifest in manifests:
        deps.update(dep.lower() for dep in manifest.get("dependencies", {}))
    return deps


def _detect_named(dependencies: set[str], mapping: dict[str, str]) -> list[str]:
    found = {label for dep, label in mapping.items() if dep.lower() in dependencies}
    return sorted(found)


def _detect_infra(files: list[str]) -> list[dict[str, str]]:
    signals: list[dict[str, str]] = []
    for rel in files:
        name = Path(rel).name
        lower = rel.lower()
        for pattern, label in INFRA_PATTERNS.items():
            if pattern.startswith(".") and lower.endswith(pattern):
                signals.append({"type": label, "path": rel})
            elif pattern in rel or name == pattern:
                signals.append({"type": label, "path": rel})
    return _dedupe_dicts(signals)


def _detect_package_managers(files: list[str]) -> list[str]:
    markers = {
        "package-lock.json": "npm",
        "yarn.lock": "Yarn",
        "pnpm-lock.yaml": "pnpm",
        "requirements.txt": "pip",
        "poetry.lock": "Poetry",
        "Pipfile.lock": "Pipenv",
        "Gemfile.lock": "Bundler",
        "go.sum": "Go modules",
        "Cargo.lock": "Cargo",
    }
    found = {label for rel in files for marker, label in markers.items() if Path(rel).name == marker}
    return sorted(found)


def _classify_app(files: list[str], frameworks: list[str], manifests: list[str]) -> tuple[str, str | None]:
    if any(f in frameworks for f in ["Next.js", "React", "Vue", "Nuxt", "Svelte", "Angular"]):
        if any(f in frameworks for f in ["Express", "FastAPI", "Django", "Flask"]) or any("/api/" in f or f.startswith("pages/api") for f in files):
            return "web app (full-stack or hybrid)", None
        return "web app (frontend)", None
    if any(f in frameworks for f in ["Django", "Flask", "FastAPI", "Express", "NestJS"]):
        return "web app (backend/API)", None
    if any(Path(f).name in {"setup.py", "pyproject.toml"} for f in manifests) and not frameworks:
        return "ambiguous", "Repository may be a library or CLI; no clear app framework was detected."
    return "ambiguous", "Could not confidently classify as a standalone app from manifests/framework signals."


def _detect_tests(files: list[str], manifests: list[dict[str, Any]]) -> dict[str, Any]:
    test_files = [f for f in files if "test" in Path(f).name.lower() or "/tests/" in f or f.startswith("tests/")]
    scripts = []
    for manifest in manifests:
        if manifest.get("path", "").endswith("package.json"):
            test_script = (manifest.get("scripts") or {}).get("test")
            if test_script:
                scripts.append({"path": manifest["path"], "script": test_script})
    return {
        "present": bool(test_files or scripts),
        "files": test_files[:50],
        "scripts": scripts,
        "coverage_signal": any("coverage" in f.lower() for f in files) or any("coverage" in s["script"] for s in scripts),
    }


def _detect_api(files: list[str], frameworks: list[str]) -> dict[str, Any]:
    routes = [
        f
        for f in files
        if f.startswith("pages/api/")
        or f.startswith("app/api/")
        or "/routes/" in f
        or "urls.py" in f
        or "views.py" in f
        or "controllers" in f
    ]
    style = "REST-like routes inferred from file layout" if routes else "no API route evidence found"
    return {"style": style, "routes": routes[:100], "frameworks": [f for f in frameworks if f in {"Express", "FastAPI", "Django", "Flask", "NestJS", "Next.js"}]}


def _detect_frontend(files: list[str], frameworks: list[str]) -> dict[str, Any]:
    paths = [f for f in files if f.startswith(("pages/", "app/", "src/", "components/")) and Path(f).suffix in {".js", ".jsx", ".ts", ".tsx", ".vue", ".svelte"}]
    return {"frameworks": [f for f in frameworks if f in {"Next.js", "React", "Vue", "Nuxt", "Svelte", "Angular"}], "paths": paths[:100]}


def _detect_backend(files: list[str], frameworks: list[str], api: dict[str, Any]) -> dict[str, Any]:
    paths = [f for f in files if f.startswith(("api/", "server/", "backend/", "app/")) or Path(f).name in {"manage.py", "settings.py", "urls.py"}]
    return {"frameworks": [f for f in frameworks if f in {"Express", "FastAPI", "Django", "Flask", "NestJS"}], "paths": sorted(set(paths + api.get("routes", [])))[:100]}


def _detect_security(
    files: list[str],
    env_files: list[str],
    auth: list[str],
    cors: list[str],
    rate_limit: list[str],
    exposed_ports: list[dict[str, str]],
    secret_hits: list[dict[str, str]],
) -> dict[str, Any]:
    risky_env = [f for f in env_files if Path(f).name in {".env", ".env.local", ".env.production"}]
    secret_like_files = [f for f in files if re.search(r"(secret|credential|service-account|private-key)", f, re.I)]
    return {
        "auth_signal": auth,
        "env_samples_present": any("example" in f.lower() or "sample" in f.lower() for f in env_files),
        "committed_runtime_env_files": risky_env,
        "secret_like_filenames": secret_like_files[:20],
        "cors_signal": cors,
        "rate_limit_signal": rate_limit,
        "exposed_ports": exposed_ports,
        "secret_scan_hits": secret_hits,
    }


def _detect_exposed_ports(root: Path, files: list[str]) -> list[dict[str, str]]:
    hits: list[dict[str, str]] = []
    candidates = [
        rel
        for rel in files
        if Path(rel).name == "Dockerfile"
        or Path(rel).name.endswith(".Dockerfile")
        or Path(rel).name in {"docker-compose.yml", "docker-compose.yaml"}
    ]
    for rel in candidates:
        raw = _safe_read(root / rel)
        for match in re.finditer(r"(?im)^\s*EXPOSE\s+(\d{2,5})", raw):
            port = match.group(1)
            hits.append({"port": port, "path": rel, "service": SENSITIVE_PORT_LABELS.get(port, "")})
        for match in re.finditer(r'(?m)^\s*-\s*["\']?(\d{2,5}):(\d{2,5})["\']?', raw):
            port = match.group(2)
            hits.append({"port": port, "path": rel, "service": SENSITIVE_PORT_LABELS.get(port, "")})
    seen: set[tuple[str, str]] = set()
    deduped: list[dict[str, str]] = []
    for hit in hits:
        key = (hit["port"], hit["path"])
        if key not in seen:
            seen.add(key)
            deduped.append(hit)
    return deduped


def _secret_scan(root: Path, files: list[str], max_files: int = 400) -> list[dict[str, str]]:
    scannable = [rel for rel in files if Path(rel).suffix in TEXT_SUFFIXES or Path(rel).name.startswith(".env")]
    scannable.sort(key=lambda rel: (0 if re.search(r"(config|env|secret|setting|key)", rel, re.I) else 1, rel))
    hits: list[dict[str, str]] = []
    for rel in scannable[:max_files]:
        raw = _safe_read(root / rel)
        if not raw:
            continue
        for pattern, label in SECRET_PATTERNS:
            if pattern.search(raw):
                hits.append({"path": rel, "pattern": label})
                break
    return hits[:20]


def _read_business_evidence(root: Path, files: list[str], manifests: list[dict[str, Any]]) -> dict[str, Any]:
    readme_rel = next((f for f in files if Path(f).name.lower() in README_NAMES and "/" not in f), None)
    readme_excerpt = ""
    if readme_rel:
        raw = _safe_read(root / readme_rel)
        readme_excerpt = raw.strip()[:4000]

    description = ""
    keywords: list[str] = []
    for manifest in manifests:
        name = Path(manifest.get("path", "")).name
        if name == "package.json":
            raw = _safe_read(root / manifest["path"])
            try:
                data = json.loads(raw)
                description = description or (data.get("description") or "")
                keywords.extend(data.get("keywords") or [])
            except json.JSONDecodeError:
                pass
        elif name == "pyproject.toml":
            raw = _safe_read(root / manifest["path"])
            desc_match = re.search(r'(?m)^\s*description\s*=\s*"([^"]+)"', raw)
            if desc_match and not description:
                description = desc_match.group(1)
            kw_match = re.search(r"(?ms)^\s*keywords\s*=\s*\[([^\]]*)\]", raw)
            if kw_match:
                keywords.extend(re.findall(r'"([^"]+)"', kw_match.group(1)))

    return {
        "readme_path": readme_rel,
        "readme_excerpt": readme_excerpt,
        "package_description": description,
        "keywords": sorted(set(k.lower() for k in keywords)),
    }


def _strip_all_suffixes(name: str) -> str:
    stem = name
    while Path(stem).suffix:
        stem = Path(stem).stem
    return stem


def _segment_features(files: list[str], test_files: list[str], frameworks: list[str]) -> list[dict[str, Any]]:
    has_frontend_framework = any(f in FRONTEND_FRAMEWORKS for f in frameworks)
    roots = [
        (prefix, layer)
        for prefix, layer in FEATURE_ROOTS
        if prefix not in {"app/", "pages/", "components/"} or has_frontend_framework
    ]
    groups: dict[str, dict[str, Any]] = {}
    for rel in files:
        for prefix, layer in roots:
            if not rel.startswith(prefix):
                continue
            remainder = rel[len(prefix):]
            parts = remainder.split("/")
            head = parts[0]
            name = _strip_all_suffixes(head).lower() if len(parts) == 1 else head.lower()
            name = re.sub(r"^[\[(].*[\])]$", "", name)  # drop Next.js dynamic segment wrappers like [id]
            if not name or name in NOISE_FEATURE_NAMES or name.startswith("_") or name.startswith("."):
                break
            entry = groups.setdefault(name, {"name": name, "paths": [], "layers": set()})
            entry["paths"].append(rel)
            entry["layers"].add(layer)
            break

    features = []
    for name, data in groups.items():
        paths = sorted(set(data["paths"]))
        has_tests = any(name in Path(t).as_posix().lower() for t in test_files)
        features.append(
            {
                "name": name,
                "paths": paths[:12],
                "file_count": len(paths),
                "layers": sorted(data["layers"]),
                "has_tests": has_tests,
            }
        )
    features.sort(key=lambda item: item["file_count"], reverse=True)
    return features[:20]


def _dependency_health(files: list[str], manifests: list[dict[str, Any]]) -> dict[str, Any]:
    lockfiles = [f for f in files if Path(f).name in {"package-lock.json", "pnpm-lock.yaml", "yarn.lock", "poetry.lock", "Pipfile.lock", "Gemfile.lock", "Cargo.lock", "go.sum"}]
    return {
        "lockfiles": lockfiles,
        "manifest_count": len(manifests),
        "audit_attempted": False,
        "audit_note": "Static scan only. Run npm audit, pip-audit, bundler audit, or ecosystem equivalent in the target repo for vulnerability details.",
    }


def _safe_read(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def _dedupe_dicts(items: list[dict[str, str]]) -> list[dict[str, str]]:
    seen: set[tuple[str, str]] = set()
    out: list[dict[str, str]] = []
    for item in items:
        key = (item.get("type", ""), item.get("path", ""))
        if key not in seen:
            seen.add(key)
            out.append(item)
    return out
