"""Business-context inference, feature scoring, prioritization-framework selection,
Product Tree / Buy-a-Feature evaluation, and composite scale prediction.

Everything here is derived from static repo evidence (README/description/keywords,
route/file segmentation, dependency signals). Nothing is looked up over the network
and nothing claims a specific market-share, revenue, or adoption number. Where a
market comparable is cited (Stripe for payments, Auth0 for auth, etc.) it comes from
`reference/feature_market_playbook.md` and `reference/tech_alternatives.md`, which
document durable, generally-known industry patterns rather than dated figures. Every
output that is inferred rather than directly evidenced is labeled with a confidence
level so a reader (human or agentic IDE) knows how much to trust it.
"""

from __future__ import annotations

from typing import Any

from . import brightdata

# ---------------------------------------------------------------------------
# Reference data (mirrors reference/feature_market_playbook.md and
# reference/tech_alternatives.md so this module has no file-parsing dependency).
# ---------------------------------------------------------------------------

INDUSTRY_PROFILES: dict[str, dict[str, Any]] = {
    "fintech / payments": {
        "keywords": ["pay", "checkout", "invoice", "billing", "wallet", "ledger", "subscription", "stripe", "transaction"],
        "sub_domains": {"invoice": "invoicing / AP automation", "subscription": "subscription billing", "wallet": "digital wallet"},
        "default_sub_domain": "payments infrastructure",
        "target_customers": "businesses and their end customers that need to move or track money",
        "competitors": ["Stripe", "Chargebee", "Paddle", "Adyen"],
    },
    "e-commerce / retail": {
        "keywords": ["cart", "shop", "product", "inventory", "order", "storefront", "catalog", "sku"],
        "sub_domains": {"inventory": "inventory management", "storefront": "storefront/headless commerce"},
        "default_sub_domain": "online storefront",
        "target_customers": "merchants selling products online and their shoppers",
        "competitors": ["Shopify", "WooCommerce", "BigCommerce"],
    },
    "healthtech": {
        "keywords": ["patient", "appointment", "ehr", "clinic", "telehealth", "prescription", "diagnosis"],
        "sub_domains": {"telehealth": "telehealth / virtual care", "appointment": "clinical scheduling"},
        "default_sub_domain": "clinical workflow software",
        "target_customers": "clinicians, care teams, and patients",
        "competitors": ["Epic", "athenahealth", "Teladoc"],
    },
    "edtech": {
        "keywords": ["course", "student", "lesson", "quiz", "classroom", "lms", "curriculum"],
        "sub_domains": {"quiz": "assessment tooling", "lms": "learning management"},
        "default_sub_domain": "online learning",
        "target_customers": "learners, instructors, and educational institutions",
        "competitors": ["Canvas", "Coursera", "Teachable"],
    },
    "martech / CRM": {
        "keywords": ["lead", "campaign", "crm", "contact", "pipeline", "deal", "prospect"],
        "sub_domains": {"campaign": "marketing automation", "pipeline": "sales CRM"},
        "default_sub_domain": "customer relationship management",
        "target_customers": "sales and marketing teams",
        "competitors": ["HubSpot", "Salesforce", "Pipedrive"],
    },
    "developer tools": {
        "keywords": ["sdk", "cli", "plugin", "extension", "ide", "webhook", "integration"],
        "sub_domains": {"cli": "developer CLI tooling", "webhook": "integration platform"},
        "default_sub_domain": "developer productivity tooling",
        "target_customers": "software engineers and engineering teams",
        "competitors": ["GitHub", "Vercel", "Postman"],
    },
    "collaboration / productivity SaaS": {
        "keywords": ["task", "project", "workspace", "team", "kanban", "docs", "wiki"],
        "sub_domains": {"kanban": "project/task management", "wiki": "knowledge management"},
        "default_sub_domain": "team productivity software",
        "target_customers": "knowledge-work teams inside organizations",
        "competitors": ["Notion", "Asana", "Linear"],
    },
    "communication": {
        "keywords": ["chat", "message", "inbox", "thread", "conversation"],
        "sub_domains": {"inbox": "shared inbox / support messaging"},
        "default_sub_domain": "messaging platform",
        "target_customers": "teams or communities that need real-time messaging",
        "competitors": ["Slack", "Discord", "Intercom"],
    },
    "AI / ML product": {
        "keywords": ["ai", "llm", "model", "embedding", "prompt", "agent", "completion", "inference"],
        "sub_domains": {"agent": "AI agent tooling", "embedding": "retrieval / semantic search"},
        "default_sub_domain": "AI-assisted product features",
        "target_customers": "end users or developers consuming AI-generated output",
        "competitors": ["OpenAI", "Anthropic", "Perplexity"],
    },
    "social / community": {
        "keywords": ["post", "feed", "follow", "profile", "comment", "community"],
        "sub_domains": {"feed": "social feed product"},
        "default_sub_domain": "social networking",
        "target_customers": "individual consumers building a social graph",
        "competitors": ["Reddit", "Discord", "X (Twitter)"],
    },
    "media / content": {
        "keywords": ["video", "stream", "podcast", "article", "cms", "blog", "publish"],
        "sub_domains": {"video": "video/streaming platform", "blog": "publishing / CMS"},
        "default_sub_domain": "content publishing",
        "target_customers": "content creators and their audiences",
        "competitors": ["YouTube", "Substack", "Medium"],
    },
    "analytics / observability": {
        "keywords": ["dashboard", "metric", "event", "analytics", "trace", "telemetry"],
        "sub_domains": {"telemetry": "observability tooling"},
        "default_sub_domain": "product/usage analytics",
        "target_customers": "product, growth, and engineering teams tracking usage or system health",
        "competitors": ["Amplitude", "Mixpanel", "Datadog"],
    },
}

DEPENDENCY_INDUSTRY_BOOST: dict[str, list[str]] = {
    "Stripe": ["fintech / payments", "e-commerce / retail"],
    "OpenAI": ["AI / ML product"],
    "Anthropic": ["AI / ML product"],
    "Twilio": ["communication"],
    "SendGrid": ["communication"],
    "PostHog": ["analytics / observability"],
    "Algolia": ["e-commerce / retail", "developer tools"],
}

FALLBACK_INDUSTRY = {
    "name": "general SaaS / web application",
    "sub_domain": "unclassified — insufficient business-signal evidence",
    "target_customers": "not enough evidence to infer a specific customer segment",
    "competitors": [],
}

CORE_FEATURE_KEYWORDS = {
    "auth", "login", "signup", "payment", "pay", "checkout", "billing", "cart", "order",
    "subscription", "account", "user", "api", "database", "invoice", "wallet", "ledger",
}
SUPPORTING_FEATURE_KEYWORDS = {
    "dashboard", "admin", "settings", "profile", "notification", "search", "upload",
    "report", "analytics", "team", "workspace", "onboarding",
}
PERIPHERAL_FEATURE_KEYWORDS = {
    "blog", "docs", "marketing", "landing", "about", "faq", "help", "legal", "privacy", "terms", "changelog",
}
EXCITEMENT_FEATURE_KEYWORDS = {"ai", "ml", "assistant", "recommend", "personalize", "copilot", "chat", "generate"}

# category -> (market comparable summary, rationale, risk-if-missing, efficiency tier)
FEATURE_MARKET_PLAYBOOK: dict[str, dict[str, Any]] = {
    "auth": {
        "market_comparable": "Auth0 / Clerk / Supabase Auth / NextAuth",
        "rationale": "Session/password/OAuth handling is security-critical; managed providers absorb OWASP ASVS-level correctness and ongoing patching.",
        "risk_if_missing": "Custom auth requires ongoing security maintenance; a missed rotation/hash upgrade is a direct breach vector.",
        "efficiency_tier": "high",
    },
    "payments": {
        "market_comparable": "Stripe / Braintree / Paddle",
        "rationale": "Handling card data directly pulls a company into PCI-DSS scope; hosted checkout/Elements keeps raw card data off the app's servers.",
        "risk_if_missing": "Homegrown card handling multiplies compliance audit scope and breach liability.",
        "efficiency_tier": "high",
    },
    "checkout": {
        "market_comparable": "Stripe Checkout / Shopify Checkout",
        "rationale": "Checkout flows are conversion-sensitive; providers continuously optimize and localize so merchants don't have to.",
        "risk_if_missing": "Custom checkout carries ongoing conversion-rate and tax/localization maintenance burden.",
        "efficiency_tier": "high",
    },
    "search": {
        "market_comparable": "Algolia / Elasticsearch / Typesense",
        "rationale": "Relevance ranking and query latency at scale are hard problems; ORM-filter search degrades quickly as data volume grows.",
        "risk_if_missing": "In-house SQL search commonly hits a relevance/latency ceiling that forces a rewrite later.",
        "efficiency_tier": "high",
    },
    "notification": {
        "market_comparable": "Resend / SendGrid / Postmark / Twilio",
        "rationale": "Deliverability depends on IP reputation and SPF/DKIM/DMARC upkeep that mail/SMS providers manage continuously.",
        "risk_if_missing": "Self-hosted delivery commonly lands in spam or fails silently without dedicated deliverability operations.",
        "efficiency_tier": "high",
    },
    "queue": {
        "market_comparable": "Managed Redis + BullMQ/Sidekiq / AWS SQS / Celery",
        "rationale": "Reliable retry/backoff and dead-letter handling are non-trivial to build correctly the first time.",
        "risk_if_missing": "Inline or naive worker code risks silent job loss and duplicate side effects under retries.",
        "efficiency_tier": "high",
    },
    "storage": {
        "market_comparable": "AWS S3 / Cloudflare R2 / Supabase Storage",
        "rationale": "Durable, versioned, access-controlled object storage with signed URLs is a solved problem with strong SLAs.",
        "risk_if_missing": "Disk-backed uploads on a single app server do not survive instance replacement or scale horizontally.",
        "efficiency_tier": "high",
    },
    "ai": {
        "market_comparable": "OpenAI / Anthropic / Google Gemini APIs",
        "rationale": "Training and hosting competitive foundation models is capital-intensive; API access ships model-backed features without owning GPU infrastructure.",
        "risk_if_missing": "Self-hosting comparable model quality is a multi-million-dollar undertaking for most teams.",
        "efficiency_tier": "high",
    },
    "observability": {
        "market_comparable": "Sentry / Datadog / Honeycomb",
        "rationale": "Correlating errors, traces, and logs is a dedicated discipline; ad hoc logging does not scale past a few services.",
        "risk_if_missing": "Blind spots in production delay incident detection and root-causing.",
        "efficiency_tier": "medium",
    },
    "flags": {
        "market_comparable": "LaunchDarkly / Unleash / GrowthBook",
        "rationale": "Progressive rollout and kill-switches reduce blast radius of bad deploys.",
        "risk_if_missing": "All-or-nothing deploys raise the cost of a bad release.",
        "efficiency_tier": "medium",
    },
    "analytics": {
        "market_comparable": "PostHog / Amplitude / Mixpanel",
        "rationale": "Event pipelines and privacy-regulation handling are ongoing work independent of the core product.",
        "risk_if_missing": "Home-grown analytics tables usually go stale or become their own maintenance burden.",
        "efficiency_tier": "medium",
    },
    "database": {
        "market_comparable": "Managed Postgres (RDS/Supabase/Neon) + Prisma/SQLAlchemy",
        "rationale": "Managed services absorb backup, patching, and failover; ORMs shrink the hand-written SQL surface an agent must review.",
        "risk_if_missing": "Self-managed DB operations are a common cause of unrecoverable data-loss incidents.",
        "efficiency_tier": "medium",
    },
    "generic": {
        "market_comparable": "no strong market-comparable pattern detected from static evidence",
        "rationale": "Evaluate case by case; this feature name did not match a known outsourceable category.",
        "risk_if_missing": "Not enough signal to estimate build-vs-buy risk from this scan.",
        "efficiency_tier": "low",
    },
}

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "auth": ["auth", "login", "signup", "session", "sso"],
    "payments": ["payment", "pay", "billing", "invoice", "wallet", "ledger"],
    "checkout": ["checkout", "cart", "order"],
    "search": ["search", "find", "discover"],
    "notification": ["notification", "email", "mail", "sms", "alert"],
    "queue": ["queue", "job", "worker", "background", "cron"],
    "storage": ["upload", "file", "media", "asset", "storage"],
    "ai": ["ai", "ml", "assistant", "chat", "recommend", "generate", "copilot"],
    "observability": ["log", "monitor", "trace", "health", "metric"],
    "flags": ["flag", "experiment", "rollout"],
    "analytics": ["analytics", "report", "dashboard", "insight"],
    "database": ["database", "db", "schema", "migration"],
}

FRAMEWORK_DECISION_TABLE = [
    (
        "MoSCoW",
        lambda ctx: ctx["feature_count"] < 3,
        "Fewer than 3 segmentable features were found, so there isn't enough quantitative reach/impact signal for a scored model — a qualitative must/should/could/won't split is the honest choice.",
    ),
    (
        "MoSCoW",
        lambda ctx: ctx["industry_confidence"] == "low",
        "Business-context confidence is low (little README/description/keyword signal), so a scored model would imply false precision. MoSCoW only requires relative judgment calls.",
    ),
    (
        "RICE",
        lambda ctx: ctx["feature_count"] >= 5 and ctx["file_count_spread"],
        "5+ features with meaningfully different file-touchpoint counts give usable Reach/Effort proxies, so a quantified RICE score adds real signal over a qualitative bucket.",
    ),
    (
        "Kano Model",
        lambda ctx: ctx["has_core_tier"] and ctx["has_excitement_tier"],
        "The feature set mixes expected/must-be functionality (auth, payments, core CRUD) with delighter-style functionality (AI/personalization), which is exactly the basic-vs-performance-vs-excitement split Kano is built for.",
    ),
    (
        "Cost of Delay Formula",
        lambda ctx: ctx["has_compliance_sensitive"] and ctx["low_test_coverage"],
        "Compliance-sensitive features (auth/payments) are present with weak test coverage, so sequencing by cost-of-delay (risk exposure over time) matters more than a static score.",
    ),
    (
        "Weighted Scoring Model",
        lambda ctx: ctx["low_score_variance"],
        "Feature composite scores cluster tightly together, so a multi-criteria weighted model is needed to break ties that a simpler bucket method can't resolve.",
    ),
]


def infer_business_context(inventory: dict[str, Any]) -> dict[str, Any]:
    business = inventory.get("business", {})
    stack = inventory.get("stack", {})
    text_blob = " ".join(
        [
            business.get("package_description", "") or "",
            business.get("readme_excerpt", "") or "",
            " ".join(business.get("keywords", []) or []),
        ]
    ).lower()

    scores: dict[str, int] = {}
    for industry, profile in INDUSTRY_PROFILES.items():
        hits = sum(1 for kw in profile["keywords"] if kw in text_blob)
        scores[industry] = hits

    for dep in stack.get("frameworks", []) + inventory.get("architecture", {}).get("third_party_services", []):
        for industry in DEPENDENCY_INDUSTRY_BOOST.get(dep, []):
            scores[industry] = scores.get(industry, 0) + 2

    best_industry = max(scores, key=lambda k: scores[k]) if scores else None
    best_score = scores.get(best_industry, 0) if best_industry else 0

    if not best_industry or best_score == 0:
        industry_name = FALLBACK_INDUSTRY["name"]
        sub_domain = FALLBACK_INDUSTRY["sub_domain"]
        target_customers = FALLBACK_INDUSTRY["target_customers"]
        competitors = FALLBACK_INDUSTRY["competitors"]
        confidence = "low"
    else:
        profile = INDUSTRY_PROFILES[best_industry]
        industry_name = best_industry
        sub_domain = profile["default_sub_domain"]
        for kw, label in profile["sub_domains"].items():
            if kw in text_blob:
                sub_domain = label
                break
        target_customers = profile["target_customers"]
        competitors = profile["competitors"]
        confidence = "high" if best_score >= 4 else "medium"

    description = business.get("package_description") or ""
    if description:
        problem_statement = f"Stated in repo metadata: {description.strip()}"
    elif business.get("readme_excerpt"):
        first_line = next((l.strip() for l in business["readme_excerpt"].splitlines() if l.strip()), "")
        problem_statement = f"Inferred from README opening line: \"{first_line[:220]}\"" if first_line else "No description or usable README opening line found; problem statement could not be inferred from evidence."
    else:
        problem_statement = "No package description or README found; problem statement could not be inferred from evidence."

    live_search_evidence = None
    if brightdata.is_configured() and industry_name != FALLBACK_INDUSTRY["name"]:
        live_search_evidence = brightdata.search_serp(f"{industry_name} competitors")

    return {
        "problem_statement": problem_statement,
        "target_customers": target_customers,
        "industry": industry_name,
        "sub_domain": sub_domain,
        "potential_competitors": competitors,
        "confidence": confidence,
        "live_search_evidence": live_search_evidence,
        "evidence": {
            "readme_found": bool(business.get("readme_path")),
            "package_description_found": bool(description),
            "keyword_count": len(business.get("keywords", []) or []),
            "industry_keyword_hits": best_score,
        },
    }


def _feature_tier(name: str) -> str:
    if any(kw in name for kw in CORE_FEATURE_KEYWORDS):
        return "core"
    if any(kw in name for kw in SUPPORTING_FEATURE_KEYWORDS):
        return "supporting"
    if any(kw in name for kw in PERIPHERAL_FEATURE_KEYWORDS):
        return "peripheral"
    return "unclassified"


def _feature_category(name: str) -> str:
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in name for kw in keywords):
            return category
    return "generic"


def _clamp10(value: float) -> int:
    return max(1, min(10, round(value)))


def score_features(inventory: dict[str, Any]) -> list[dict[str, Any]]:
    features = inventory.get("features", [])
    if not features:
        return []

    file_counts = [f["file_count"] for f in features]
    lo, hi = min(file_counts), max(file_counts)

    scored = []
    for feature in features:
        name = feature["name"]
        tier = _feature_tier(name)
        category = _feature_category(name)
        playbook = FEATURE_MARKET_PLAYBOOK[category]

        tier_base = {"core": 9, "supporting": 6, "peripheral": 3, "unclassified": 5}[tier]
        relevance = _clamp10(
            tier_base + (1 if len(feature.get("layers", [])) > 1 else 0) + (1 if feature.get("has_tests") else 0)
        )

        repeatability = _clamp10(1 + 9 * (feature["file_count"] - lo) / (hi - lo)) if hi > lo else 5

        efficiency = {"high": 8, "medium": 6, "low": 4}[playbook["efficiency_tier"]]

        composite = round(relevance * 0.5 + repeatability * 0.2 + efficiency * 0.3, 2)

        scored.append(
            {
                "name": name,
                "tier": tier,
                "category": category,
                "layers": feature.get("layers", []),
                "file_count": feature["file_count"],
                "has_tests": feature.get("has_tests", False),
                "evidence_paths": feature.get("paths", [])[:5],
                "relevance": relevance,
                "repeatability": repeatability,
                "repeatability_note": "proxy from file-touchpoint count across the codebase, not runtime navigation telemetry",
                "efficiency": efficiency,
                "market_comparable": playbook["market_comparable"],
                "market_rationale": playbook["rationale"],
                "risk_if_missing": playbook["risk_if_missing"],
                "composite": composite,
            }
        )
    scored.sort(key=lambda f: f["composite"], reverse=True)
    return scored


def select_prioritization_framework(features: list[dict[str, Any]], business_context: dict[str, Any]) -> dict[str, Any]:
    if not features:
        return {
            "framework": "MoSCoW",
            "reasoning": "No segmentable product features were found in the scan, so only a qualitative must/should/could/won't placeholder is possible until more of the app is evidenced.",
            "runners_up": [],
        }

    composites = [f["composite"] for f in features]
    ctx = {
        "feature_count": len(features),
        "industry_confidence": business_context.get("confidence", "low"),
        "file_count_spread": (max(f["file_count"] for f in features) - min(f["file_count"] for f in features)) >= 3,
        "has_core_tier": any(f["tier"] == "core" for f in features),
        "has_excitement_tier": any(any(kw in f["name"] for kw in EXCITEMENT_FEATURE_KEYWORDS) for f in features),
        "has_compliance_sensitive": any(f["category"] in {"auth", "payments"} for f in features),
        "low_test_coverage": sum(1 for f in features if f["has_tests"]) / len(features) < 0.5,
        "low_score_variance": (max(composites) - min(composites)) < 2.0,
    }

    chosen = None
    reasoning = ""
    for framework, predicate, why in FRAMEWORK_DECISION_TABLE:
        if predicate(ctx):
            chosen, reasoning = framework, why
            break
    if chosen is None:
        chosen = "DVF Framework"
        reasoning = "No sharper signal (data richness, Kano-style tier mix, compliance urgency, or score clustering) applied, so Desirability/Viability/Feasibility gives the most balanced general-purpose lens for a business+tech co-evaluation."

    runners_up = list(dict.fromkeys(f for f, _, _ in FRAMEWORK_DECISION_TABLE if f != chosen))[:2]
    return {"framework": chosen, "reasoning": reasoning, "runners_up": runners_up, "decision_context": ctx}


def apply_framework(framework: str, features: list[dict[str, Any]], business_context: dict[str, Any]) -> dict[str, Any]:
    if not features:
        return {"rows": [], "recommended_changes": []}

    if framework == "RICE":
        rows = []
        for f in features:
            reach, impact = f["repeatability"], f["relevance"]
            confidence = 1.0 if f["has_tests"] else 0.6
            effort = max(1, f["file_count"])
            rice = round((reach * impact * confidence) / effort, 2)
            rows.append({**f, "framework_score": rice, "framework_label": "RICE score"})
        rows.sort(key=lambda r: r["framework_score"], reverse=True)
        by_file_count = sorted(features, key=lambda f: f["file_count"], reverse=True)
        recommended = _diff_ranking_changes(rows, by_file_count, "framework_score", "file_count", "RICE score", "apparent dev investment (file count)")
        return {"rows": rows, "recommended_changes": recommended}

    if framework == "MoSCoW":
        rows = []
        for f in features:
            if f["relevance"] >= 8:
                bucket = "Must"
            elif f["relevance"] >= 6:
                bucket = "Should"
            elif f["relevance"] >= 4:
                bucket = "Could"
            else:
                bucket = "Won't (for now)"
            rows.append({**f, "framework_score": bucket, "framework_label": "MoSCoW bucket"})
        recommended = []
        for f in rows:
            if f["framework_label"] == "MoSCoW bucket" and f["framework_score"] in {"Could", "Won't (for now)"} and f["repeatability"] >= 7:
                recommended.append(
                    f"Re-check `{f['name']}`: bucketed {f['framework_score']} by keyword relevance, but its file-touchpoint count is high (repeatability {f['repeatability']}/10) — verify it isn't actually a Must before deprioritizing."
                )
            if f["framework_score"] == "Must" and not f["has_tests"]:
                recommended.append(f"`{f['name']}` is bucketed Must but has no matching test evidence — treat test coverage for it as a Must-fix, not optional.")
        return {"rows": rows, "recommended_changes": recommended}

    if framework == "Kano Model":
        rows = []
        for f in features:
            if any(kw in f["name"] for kw in EXCITEMENT_FEATURE_KEYWORDS):
                kano = "Excitement (delighter)"
            elif f["tier"] == "core":
                kano = "Basic (must-be)"
            elif f["tier"] == "supporting":
                kano = "Performance (linear)"
            else:
                kano = "Indifferent"
            rows.append({**f, "framework_score": kano, "framework_label": "Kano category"})
        recommended = []
        for f in rows:
            if f["framework_score"] == "Basic (must-be)" and not f["has_tests"]:
                recommended.append(f"`{f['name']}` is a Kano Basic/must-be feature without test evidence — its absence or breakage causes outsized dissatisfaction, so it should outrank any Excitement-tier work in the current backlog.")
            if f["framework_score"] == "Indifferent" and f["file_count"] >= 3:
                recommended.append(f"`{f['name']}` is Kano-Indifferent (peripheral, low business signal) yet has {f['file_count']} files — verify this investment against real usage before adding more to it.")
        return {"rows": rows, "recommended_changes": recommended}

    if framework == "DVF Framework":
        industry = business_context.get("industry", "")
        rows = []
        for f in features:
            desirability = f["relevance"]
            viability = f["efficiency"] + (2 if f["category"] in industry else 0)
            feasibility = _clamp10(5 + (2 if f["has_tests"] else -1) + (1 if len(f["layers"]) > 1 else 0))
            viability = _clamp10(viability)
            score = round((desirability + viability + feasibility) / 3, 2)
            rows.append({**f, "desirability": desirability, "viability": viability, "feasibility": feasibility, "framework_score": score, "framework_label": "DVF average"})
        rows.sort(key=lambda r: r["framework_score"], reverse=True)
        recommended = []
        for f in rows:
            if f["desirability"] >= 7 and f["feasibility"] <= 4:
                recommended.append(f"`{f['name']}` is high-desirability but low-feasibility (little test/multi-layer evidence) — de-risk it (add tests, document ownership) before extending it further.")
            if f["desirability"] <= 4 and f["viability"] <= 4 and f["feasibility"] <= 4:
                recommended.append(f"`{f['name']}` scores low on all three DVF axes — candidate to cut or defer.")
        return {"rows": rows, "recommended_changes": recommended}

    if framework == "Cost of Delay Formula":
        rows = []
        for f in features:
            urgency = 2.0 if f["category"] in {"auth", "payments"} else 1.0
            effort_proxy = max(1, f["file_count"])
            cod = round((f["composite"] * urgency) / effort_proxy, 3)
            rows.append({**f, "urgency_multiplier": urgency, "framework_score": cod, "framework_label": "Cost of Delay (composite x urgency / effort)"})
        rows.sort(key=lambda r: r["framework_score"], reverse=True)
        recommended = []
        for f in rows[:3]:
            if not f["has_tests"]:
                recommended.append(f"`{f['name']}` has the highest cost-of-delay in this scan (urgency x{f['urgency_multiplier']}) and no test evidence — sequence it first; every sprint it ships untested compounds risk exposure.")
        return {"rows": rows, "recommended_changes": recommended}

    # Weighted Scoring Model (default / explicit fallback)
    weights = {"relevance": 0.4, "efficiency": 0.3, "repeatability": 0.3}
    rows = []
    for f in features:
        score = round(f["relevance"] * weights["relevance"] + f["efficiency"] * weights["efficiency"] + f["repeatability"] * weights["repeatability"], 2)
        rows.append({**f, "framework_score": score, "framework_label": "Weighted score (0.4 relevance + 0.3 efficiency + 0.3 repeatability)"})
    rows.sort(key=lambda r: r["framework_score"], reverse=True)
    by_file_count = sorted(features, key=lambda f: f["file_count"], reverse=True)
    recommended = _diff_ranking_changes(rows, by_file_count, "framework_score", "file_count", "weighted score", "apparent dev investment (file count)")
    return {"rows": rows, "recommended_changes": recommended}


def _diff_ranking_changes(scored_rows: list[dict[str, Any]], baseline_rows: list[dict[str, Any]], score_key: str, baseline_key: str, score_label: str, baseline_label: str) -> list[str]:
    scored_rank = {f["name"]: i for i, f in enumerate(scored_rows)}
    baseline_rank = {f["name"]: i for i, f in enumerate(baseline_rows)}
    changes = []
    for name, rank in scored_rank.items():
        drift = baseline_rank.get(name, rank) - rank
        if drift >= 2:
            changes.append(f"Promote `{name}`: ranks #{rank + 1} by {score_label} but only #{baseline_rank[name] + 1} by {baseline_label} — current build effort likely under-indexes it.")
        elif drift <= -2:
            changes.append(f"Reconsider investment in `{name}`: ranks #{baseline_rank[name] + 1} by {baseline_label} but only #{rank + 1} by {score_label} — may be over-built relative to business signal.")
    return changes[:8]


TRUNK_LABEL = "Trunk (core infra — app breaks or is unusable without it)"
BRANCH_LABEL = "Branch (major functional area, extends the trunk)"
LEAF_LABEL = "Leaf (small enhancement on a branch)"


def product_tree(features: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not features:
        return []
    median_files = sorted(f["file_count"] for f in features)[len(features) // 2]
    tree = []
    for f in features:
        if f["tier"] == "core" and len(f["layers"]) > 1:
            branch = TRUNK_LABEL
        elif f["tier"] == "core" or (f["tier"] == "supporting" and f["file_count"] >= median_files):
            branch = BRANCH_LABEL
        else:
            branch = LEAF_LABEL
        tree.append({"name": f["name"], "placement": branch, "file_count": f["file_count"], "category": f["category"]})
    return tree


PERSONAS = {
    "End user": lambda f: f["relevance"] * 0.6 + f["repeatability"] * 0.4,
    "Growth / marketing": lambda f: (f["relevance"] if f["category"] in {"search", "notification", "checkout", "ai", "analytics"} else f["relevance"] * 0.4) + f["repeatability"] * 0.2,
    "Security / compliance": lambda f: (10 if f["category"] in {"auth", "payments", "database"} else 3) + (0 if f["has_tests"] else 2),
    "Engineering / platform": lambda f: f["efficiency"] * 0.7 + f["relevance"] * 0.3,
}


def buy_a_feature(features: list[dict[str, Any]]) -> dict[str, Any]:
    if not features:
        return {"allocations": [], "ranking": [], "possible_overinvestment": []}

    persona_totals: dict[str, float] = {name: 0.0 for name in PERSONAS}
    raw_scores: dict[str, dict[str, float]] = {f["name"]: {} for f in features}
    for persona, scorer in PERSONAS.items():
        for f in features:
            raw_scores[f["name"]][persona] = max(0.0, scorer(f))
            persona_totals[persona] += raw_scores[f["name"]][persona]

    allocations = []
    demand_by_feature: dict[str, float] = {f["name"]: 0.0 for f in features}
    for f in features:
        persona_budgets = {}
        for persona in PERSONAS:
            total = persona_totals[persona] or 1.0
            units = round(100 * raw_scores[f["name"]][persona] / total, 1)
            persona_budgets[persona] = units
            demand_by_feature[f["name"]] += units
        allocations.append({"name": f["name"], "persona_budgets": persona_budgets, "total_demand_units": round(demand_by_feature[f["name"]], 1)})

    ranking = sorted(allocations, key=lambda a: a["total_demand_units"], reverse=True)

    overinvestment = []
    for f in features:
        demand_rank = next(i for i, a in enumerate(ranking) if a["name"] == f["name"])
        by_file_count = sorted(features, key=lambda x: x["file_count"], reverse=True)
        effort_rank = next(i for i, x in enumerate(by_file_count) if x["name"] == f["name"])
        if effort_rank <= 1 and demand_rank >= max(3, len(features) - 2):
            overinvestment.append(
                f"`{f['name']}` is among the most-built features (top file-count) but ranks near the bottom of simulated Buy-a-Feature demand ({f['category']} category, market comparable: {FEATURE_MARKET_PLAYBOOK[f['category']]['market_comparable']}) — verify against real usage analytics before investing further."
            )
    return {"allocations": allocations, "ranking": ranking, "possible_overinvestment": overinvestment}


SCALE_BUCKETS = [
    (4.0, "0-to-1"),
    (6.0, "1-to-100"),
    (7.5, "100-to-10k"),
    (8.5, "10k-to-1m"),
    (11.0, "1m-to-100m"),
]


def _bucket_for(score: float) -> str:
    for ceiling, key in SCALE_BUCKETS:
        if score < ceiling:
            return key
    return "1m-to-100m"


def composite_score_and_scale(scorecard: list[dict[str, Any]], features: list[dict[str, Any]], remediation_task_count: dict[str, int]) -> dict[str, Any]:
    dimension_scores = [item["score"] for item in scorecard]
    if features:
        feature_depth = round(sum(f["composite"] for f in features) / len(features), 2)
        feature_depth_note = f"Averaged across {len(features)} segmented features; evidence-based."
    else:
        feature_depth = 5.0
        feature_depth_note = "No segmentable features were found in the scan; neutral default score used."
    dimension_scores.append(feature_depth)

    composite = round(sum(dimension_scores) / len(dimension_scores), 2)
    current_tier = _bucket_for(composite)

    uplift = min(2.5, remediation_task_count.get("fix-now", 0) * 0.3 + remediation_task_count.get("fix-before-next-tier", 0) * 0.15)
    projected = round(min(10.0, composite + uplift), 2)
    projected_tier = _bucket_for(projected)

    files_before = sum(f["file_count"] for f in features if f["category"] != "generic" and FEATURE_MARKET_PLAYBOOK[f["category"]]["efficiency_tier"] == "high")
    triggered = [f for f in features if f["category"] != "generic" and FEATURE_MARKET_PLAYBOOK[f["category"]]["efficiency_tier"] == "high"]
    if triggered:
        managed_footprint = 3 * len(triggered)
        token_reduction_pct = max(0, round(100 * (1 - managed_footprint / max(files_before, managed_footprint + 1))))
        token_note = (
            f"Estimated from static evidence only: {len(triggered)} feature(s) in high-leverage categories "
            f"({', '.join(sorted({f['category'] for f in triggered}))}) currently span {files_before} files. "
            f"A managed-service swap for those categories typically needs roughly 3 files each (~{managed_footprint} files total), "
            f"an approximate {token_reduction_pct}% reduction in the file surface an agentic coding tool must read/edit for the same outcome. "
            "This is a file-count proxy for context size, not a measured token count — actual savings depend on the coding agent and task."
        )
    else:
        token_reduction_pct = 0
        token_note = "No high-leverage build-vs-buy category was detected with enough file evidence to estimate a token/context reduction."

    return {
        "dimension_scores": dimension_scores,
        "feature_depth_score": feature_depth,
        "feature_depth_note": feature_depth_note,
        "composite_score": composite,
        "current_ready_tier": current_tier,
        "projected_score_after_fixes": projected,
        "projected_ready_tier": projected_tier,
        "estimated_token_reduction_pct": token_reduction_pct,
        "token_reduction_note": token_note,
    }


# ---------------------------------------------------------------------------
# Tech-alternative benchmark rules (mirrors reference/tech_alternatives.md).
# Each rule only fires on concrete detected evidence; nothing is suggested for
# a tool the scan didn't actually find.
# ---------------------------------------------------------------------------

def _has_dep(inventory: dict[str, Any], dep_substring: str) -> bool:
    return any(dep_substring in dep for dep in inventory.get("stack", {}).get("dependencies", []))


TECH_ALTERNATIVE_RULES: list[dict[str, Any]] = [
    {
        "area": "frontend",
        "detect": lambda inv: _has_dep(inv, "react-scripts"),
        "signal": "Create React App (`react-scripts`) detected",
        "fits_at": "learning projects, tiny prototypes",
        "breaks_at": "unmaintained tool since 2023; no first-party fix for slow builds or modern bundling",
        "alternative": "Vite + React, or Next.js if SSR/routing is needed",
        "token_note": "Vite's convention-based config replaces hand-rolled webpack/CRA overrides, shrinking the config surface an agent has to read before editing build behavior.",
    },
    {
        "area": "backend",
        "detect": lambda inv: bool(inv.get("architecture", {}).get("databases")) and "SQLite" in inv["architecture"]["databases"],
        "signal": "SQLite detected alongside a backend framework",
        "fits_at": "0 -> 1 prototyping, local dev",
        "breaks_at": "multi-user concurrent writes, backups, horizontal scaling",
        "alternative": "Managed Postgres (RDS/Supabase/Neon) with the same ORM already in use",
        "token_note": "Migration is schema/config-level, not a rewrite; an ORM already in use keeps the model layer an agent edits the same shape.",
    },
    {
        "area": "backend",
        "detect": lambda inv: bool(inv.get("architecture", {}).get("backend", {}).get("frameworks")) and not inv.get("architecture", {}).get("databases"),
        "signal": "Backend framework detected with no ORM/database dependency",
        "fits_at": "small, single-developer backend or stateless API",
        "breaks_at": "query duplication, N+1 risk, and injection risk grow with route count",
        "alternative": "Adopt the ecosystem-standard ORM/query builder (Prisma for Node, SQLAlchemy for Python, ActiveRecord for Rails)",
        "token_note": "An ORM's declarative model files are far more compact than hand-written SQL scattered across route handlers, so an agent changing a field touches one model file instead of every query site.",
    },
    {
        "area": "architecture",
        "detect": lambda inv: bool(inv.get("architecture", {}).get("third_party_services")) and not inv.get("architecture", {}).get("background_jobs"),
        "signal": "Third-party service dependency present with no queue/background-job dependency",
        "fits_at": "low-volume request handling",
        "breaks_at": "slow/failing third-party calls block user-facing request latency",
        "alternative": "Managed queue (BullMQ+Redis, Celery, SQS)",
        "token_note": "Queue/worker boilerplate is a small, well-documented pattern — far smaller than a custom retry/backoff implementation an agent would otherwise write and re-verify.",
    },
    {
        "area": "architecture",
        "detect": lambda inv: bool(inv.get("architecture", {}).get("frontend", {}).get("frameworks")) and not any(s["type"] in {"Vercel", "Netlify"} for s in inv.get("infra", {}).get("signals", [])),
        "signal": "Frontend framework detected with no CDN/edge hosting signal",
        "fits_at": "any stage serving static assets or read-heavy pages",
        "breaks_at": "origin compute serves cacheable content on every request",
        "alternative": "Deploy static/read-heavy routes behind Vercel/Netlify/Cloudflare edge caching",
        "token_note": "Edge caching config is a few lines of hosting config versus custom cache-control/invalidation logic written and tested by hand.",
    },
    {
        "area": "architecture",
        "detect": lambda inv: not inv.get("infra", {}).get("ci_cd"),
        "signal": "No CI workflow detected",
        "fits_at": "solo throwaway scripts",
        "breaks_at": "regressions ship unnoticed as the codebase grows past what one person can manually verify",
        "alternative": "GitHub Actions (or equivalent) running lint/type-check/test/build on every PR",
        "token_note": "A standard CI template is copy-once; without it, an agent must be re-told the verification steps every session instead of them running automatically.",
    },
    {
        "area": "architecture",
        "detect": lambda inv: not inv.get("quality", {}).get("dependency_health", {}).get("lockfiles"),
        "signal": "No dependency lockfile committed",
        "fits_at": "n/a — always risky once more than one contributor or environment is involved",
        "breaks_at": "non-reproducible installs; \"works on my machine\" drift",
        "alternative": "Commit the ecosystem lockfile (package-lock.json/pnpm-lock.yaml/poetry.lock/etc.)",
        "token_note": "A committed lockfile means an agent's install step is deterministic and doesn't require re-resolving dependency versions each run.",
    },
    {
        "area": "backend",
        "detect": lambda inv: bool(inv.get("architecture", {}).get("api", {}).get("routes")) and not inv.get("quality", {}).get("security", {}).get("rate_limit_signal") and not inv.get("quality", {}).get("security", {}).get("cors_signal"),
        "signal": "Public API routes detected with no rate-limiting or CORS dependency",
        "fits_at": "internal-only or pre-launch APIs",
        "breaks_at": "public traffic, abuse, or scraping once the API is reachable from the internet",
        "alternative": "express-rate-limit/django-ratelimit/slowapi plus an explicit CORS allow-list",
        "token_note": "These are drop-in middleware; adding them is a few lines versus custom throttling logic an agent would need to write and load-test.",
    },
]


def evaluate_tech_alternatives(inventory: dict[str, Any]) -> list[dict[str, Any]]:
    return [rule for rule in TECH_ALTERNATIVE_RULES if rule["detect"](inventory)]


# ---------------------------------------------------------------------------
# Test taxonomy: classify existing test evidence into conventional test types.
# ---------------------------------------------------------------------------

TEST_TYPE_PATTERNS = [
    ("unit", ["unit", "spec"]),
    ("integration", ["integration", "int_test"]),
    ("end-to-end / regression", ["e2e", "cypress", "playwright", "regression"]),
    ("sanity / smoke", ["smoke", "sanity", "health"]),
]


def classify_test_coverage(inventory: dict[str, Any]) -> dict[str, Any]:
    test_files = inventory.get("quality", {}).get("tests", {}).get("files", [])
    found_types: dict[str, list[str]] = {label: [] for label, _ in TEST_TYPE_PATTERNS}
    unclassified: list[str] = []
    for path in test_files:
        lower = path.lower()
        matched = False
        for label, keywords in TEST_TYPE_PATTERNS:
            if any(kw in lower for kw in keywords):
                found_types[label].append(path)
                matched = True
                break
        if not matched:
            unclassified.append(path)
    if unclassified:
        found_types["unit (assumed, unlabeled)"] = unclassified

    missing = [label for label, _ in TEST_TYPE_PATTERNS if not found_types.get(label)]
    return {
        "by_type": {k: v[:5] for k, v in found_types.items() if v},
        "missing_types": missing,
        "exploratory_note": "Exploratory and variability/edge-case testing cannot be verified from static file evidence; treat as unknown and recommend a manual exploratory pass regardless of automated coverage.",
        "total_test_files": len(test_files),
    }
