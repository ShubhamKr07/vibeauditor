from stack_auditor import business


def _inventory(**overrides):
    base = {
        "business": {
            "readme_path": None,
            "readme_excerpt": "",
            "package_description": "",
            "keywords": [],
        },
        "stack": {"frameworks": [], "dependencies": []},
        "architecture": {"third_party_services": [], "databases": [], "backend": {"frameworks": []}, "frontend": {"frameworks": []}, "api": {"routes": []}},
        "infra": {"signals": [], "ci_cd": []},
        "quality": {"dependency_health": {"lockfiles": []}, "security": {"rate_limit_signal": [], "cors_signal": []}, "tests": {"files": []}},
        "features": [],
    }
    base.update(overrides)
    return base


def test_infer_business_context_falls_back_when_no_evidence():
    ctx = business.infer_business_context(_inventory())

    assert ctx["industry"] == business.FALLBACK_INDUSTRY["name"]
    assert ctx["confidence"] == "low"
    assert ctx["potential_competitors"] == []


def test_infer_business_context_detects_industry_from_description():
    inv = _inventory(business={
        "readme_path": None,
        "readme_excerpt": "",
        "package_description": "A checkout and billing platform for subscription invoices",
        "keywords": ["billing", "subscription"],
    })

    ctx = business.infer_business_context(inv)

    assert ctx["industry"] == "fintech / payments"
    assert "Stripe" in ctx["potential_competitors"]
    assert ctx["confidence"] in {"medium", "high"}


def test_score_features_ranks_core_feature_above_peripheral():
    features_input = [
        {"name": "auth", "paths": ["src/auth/login.ts"], "file_count": 4, "layers": ["api", "frontend"], "has_tests": True},
        {"name": "blog", "paths": ["src/blog/post.ts"], "file_count": 1, "layers": ["frontend"], "has_tests": False},
    ]
    scored = business.score_features(_inventory(features=features_input))

    assert scored[0]["name"] == "auth"
    assert scored[0]["tier"] == "core"
    assert scored[0]["category"] == "auth"
    assert scored[0]["composite"] > scored[1]["composite"]


def test_select_prioritization_framework_uses_moscow_for_sparse_features():
    ctx = business.infer_business_context(_inventory())
    features = business.score_features(_inventory(features=[
        {"name": "auth", "paths": ["a.ts"], "file_count": 1, "layers": ["api"], "has_tests": False},
    ]))

    choice = business.select_prioritization_framework(features, ctx)

    assert choice["framework"] == "MoSCoW"
    assert len(set(choice["runners_up"])) == len(choice["runners_up"])


def test_apply_framework_moscow_buckets_by_relevance():
    features = business.score_features(_inventory(features=[
        {"name": "auth", "paths": ["a.ts"], "file_count": 1, "layers": ["api"], "has_tests": True},
        {"name": "blog", "paths": ["b.ts"], "file_count": 1, "layers": ["frontend"], "has_tests": False},
    ]))
    ctx = business.infer_business_context(_inventory())

    result = business.apply_framework("MoSCoW", features, ctx)

    buckets = {row["name"]: row["framework_score"] for row in result["rows"]}
    assert buckets["auth"] == "Must"
    assert buckets["blog"] in {"Could", "Won't (for now)"}


def test_composite_score_and_scale_projects_higher_tier_with_more_fixes():
    scorecard = [{"category": "Architecture soundness", "score": 5}, {"category": "Security posture", "score": 5}]
    low_fix = business.composite_score_and_scale(scorecard, [], {"fix-now": 0, "fix-before-next-tier": 0})
    high_fix = business.composite_score_and_scale(scorecard, [], {"fix-now": 3, "fix-before-next-tier": 3})

    assert high_fix["projected_score_after_fixes"] > low_fix["projected_score_after_fixes"]
