const form = document.querySelector("#audit-form");
const statusEl = document.querySelector("#status");
const statusTextEl = document.querySelector(".status-text");
const themeToggle = document.querySelector("#theme-toggle");
const scanButton = document.querySelector("#scan-button");
const overviewContent = document.querySelector("#overview-content");
const emptyState = document.querySelector("#empty-state");
const scoreGrid = document.querySelector("#score-grid");
const scaleTable = document.querySelector("#scale-table");
const inventoryJson = document.querySelector("#inventory-json");
const reportMarkdown = document.querySelector("#report-markdown");
const taskList = document.querySelector("#task-list");
const copyReportButton = document.querySelector("#copy-report");
const downloadReportButton = document.querySelector("#download-report");
const copyTasksButton = document.querySelector("#copy-tasks");
const loadDemoButton = document.querySelector("#load-demo");
const copyAgentPromptButton = document.querySelector("#copy-agent-prompt");
const downloadAgentPromptButton = document.querySelector("#download-agent-prompt");
const businessContent = document.querySelector("#business-content");
const featureList = document.querySelector("#feature-list");
const frameworkContent = document.querySelector("#framework-content");
const agentPromptMarkdown = document.querySelector("#agent-prompt-markdown");

let latestReport = "";
let latestTasks = [];
let latestAgentPrompt = "";
let latestRepoName = "stack-audit-report";

const today = new Date().toISOString().slice(0, 10);

const SKIP_DIRS = new Set([".git", "node_modules", "vendor", "dist", "build", ".next", "coverage", ".venv", "venv", "target"]);
const LANG_BY_SUFFIX = {
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
  ".dart": "Dart"
};

const FRAMEWORK_DEPENDENCIES = {
  next: "Next.js",
  react: "React",
  vue: "Vue",
  nuxt: "Nuxt",
  svelte: "Svelte",
  "@angular/core": "Angular",
  express: "Express",
  fastify: "Fastify",
  "@nestjs/core": "NestJS",
  django: "Django",
  flask: "Flask",
  fastapi: "FastAPI",
  rails: "Ruby on Rails"
};

const DB_DEPENDENCIES = {
  pg: "PostgreSQL",
  postgres: "PostgreSQL",
  psycopg2: "PostgreSQL",
  "psycopg2-binary": "PostgreSQL",
  psycopg: "PostgreSQL",
  mysql: "MySQL",
  mysql2: "MySQL",
  sqlite3: "SQLite",
  "better-sqlite3": "SQLite",
  mongoose: "MongoDB",
  mongodb: "MongoDB",
  redis: "Redis",
  ioredis: "Redis",
  prisma: "Prisma ORM",
  sqlalchemy: "SQLAlchemy ORM",
  sequelize: "Sequelize ORM"
};

const AUTH_DEPENDENCIES = {
  "next-auth": "NextAuth/Auth.js",
  "@auth/core": "Auth.js",
  "@clerk/nextjs": "Clerk",
  "@supabase/supabase-js": "Supabase Auth",
  firebase: "Firebase Auth",
  passport: "Passport.js",
  "django-allauth": "django-allauth",
  "djangorestframework-simplejwt": "JWT auth"
};

const QUEUE_DEPENDENCIES = {
  bull: "Bull queue",
  bullmq: "BullMQ",
  celery: "Celery",
  rq: "RQ",
  dramatiq: "Dramatiq",
  sidekiq: "Sidekiq"
};

const THIRD_PARTY_DEPENDENCIES = {
  stripe: "Stripe",
  "@stripe/stripe-js": "Stripe",
  openai: "OpenAI",
  "@sentry/nextjs": "Sentry",
  "sentry-sdk": "Sentry",
  "posthog-js": "PostHog",
  resend: "Resend",
  twilio: "Twilio"
};

const TIER_ESTIMATES = [
  {
    key: "0-to-1",
    label: "0 -> 1",
    usersLoad: "Pre-launch / first users",
    monthlyCost: "$0-$25 estimated",
    bottleneck: "Missing deployment hygiene, secrets handling, or observability rather than raw scale",
    minimumFix: "Add env samples, basic CI, error logging, and a documented deploy path",
    costUnit: "<$1 per active user until usage appears; per-request cost usually dominated by free-tier rounding"
  },
  {
    key: "1-to-100",
    label: "1 -> 100",
    usersLoad: "Early adopters",
    monthlyCost: "$0-$100 estimated",
    bottleneck: "One small app instance or hobby database; slow cold starts if serverless",
    minimumFix: "Use managed hosting, backups, and simple indexes on common reads",
    costUnit: "$0.10-$2 per active user depending on managed services; per-request still tiny at low volume"
  },
  {
    key: "100-to-10k",
    label: "100 -> 10K",
    usersLoad: "Product-market fit stage",
    monthlyCost: "$100-$1,500 estimated",
    bottleneck: "Database query patterns, missing caching, background work running inline",
    minimumFix: "Add query indexes, CDN caching, queue long-running jobs, and set service-level metrics",
    costUnit: "$0.01-$0.30 per active user; request cost improves only if static assets are cached"
  },
  {
    key: "10k-to-1m",
    label: "10K -> 1M",
    usersLoad: "Growth stage",
    monthlyCost: "$1,500-$50,000+ estimated",
    bottleneck: "Database write/read scaling, noisy third-party calls, and stateful app servers",
    minimumFix: "Split read-heavy paths, add cache/queue layers, horizontal autoscaling, and rate limits",
    costUnit: "$0.005-$0.10 per active user at healthy utilization; bad cache/database design can be much higher"
  },
  {
    key: "1m-to-100m",
    label: "1M -> 100M",
    usersLoad: "Hyperscale",
    monthlyCost: "$50,000-$1,000,000+ estimated",
    bottleneck: "Global data locality, multi-region reliability, cost controls, and organizational complexity",
    minimumFix: "Dedicated platform architecture: partitioned data, edge/CDN strategy, SLOs, capacity planning, and cost governance",
    costUnit: "fractions of a cent to cents per active user depending on workload; must be measured with unit economics"
  }
];

const SOURCES = [
  ["AWS EC2 On-Demand Pricing", "https://aws.amazon.com/ec2/pricing/on-demand/"],
  ["AWS RDS Pricing", "https://aws.amazon.com/rds/pricing/"],
  ["AWS CloudFront Pricing", "https://aws.amazon.com/cloudfront/pricing/"],
  ["Vercel Pricing", "https://vercel.com/pricing"],
  ["Supabase Pricing", "https://supabase.com/pricing"],
  ["Google Cloud Pricing", "https://cloud.google.com/pricing"],
  ["Azure Pricing", "https://azure.microsoft.com/pricing/"],
  ["OWASP Top 10", "https://owasp.org/www-project-top-ten/"],
  ["OWASP ASVS", "https://owasp.org/www-project-application-security-verification-standard/"],
  ["The Twelve-Factor App", "https://12factor.net/"],
  ["Django deployment checklist", "https://docs.djangoproject.com/en/stable/howto/deployment/checklist/"],
  ["Next.js production deployment docs", "https://nextjs.org/docs/app/building-your-application/deploying"],
  ["PostgreSQL indexes documentation", "https://www.postgresql.org/docs/current/indexes.html"]
];

const README_NAMES = new Set(["readme.md", "readme.rst", "readme.txt", "readme"]);

const CORS_DEPENDENCIES = {
  cors: "cors (npm)",
  "django-cors-headers": "django-cors-headers",
  "flask-cors": "Flask-CORS",
  "fastapi-cors": "FastAPI CORS"
};

const RATE_LIMIT_DEPENDENCIES = {
  "express-rate-limit": "express-rate-limit",
  "django-ratelimit": "django-ratelimit",
  slowapi: "slowapi",
  "flask-limiter": "Flask-Limiter",
  "rack-attack": "rack-attack"
};

const SENSITIVE_PORT_LABELS = {
  22: "SSH",
  3389: "RDP",
  5432: "PostgreSQL",
  3306: "MySQL",
  6379: "Redis",
  27017: "MongoDB",
  9200: "Elasticsearch"
};

const SECRET_PATTERNS = [
  [/AKIA[0-9A-Z]{16}/, "AWS access key ID pattern"],
  [/sk_live_[0-9a-zA-Z]{16,}/, "Stripe live secret key pattern"],
  [/AIza[0-9A-Za-z\-_]{35}/, "Google API key pattern"],
  [/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, "embedded private key block"],
  [/xox[baprs]-[0-9A-Za-z-]{10,}/, "Slack token pattern"],
  [/ghp_[0-9A-Za-z]{36}/, "GitHub personal access token pattern"]
];

const NOISE_FEATURE_NAMES = new Set([
  "api", "components", "component", "lib", "libs", "utils", "util", "common", "shared", "types",
  "hooks", "styles", "assets", "public", "static", "__tests__", "test", "tests", "ui", "misc",
  "index", "constants", "config", "middleware", "migrations", "static_files", "templates",
  "settings", "urls", "wsgi", "asgi", "manage", "admin", "apps", "serializers", "views", "models"
]);

const FRONTEND_FRAMEWORKS = new Set(["Next.js", "React", "Vue", "Nuxt", "Svelte", "Angular"]);

const FEATURE_ROOTS = [
  ["app/api/", "api"],
  ["pages/api/", "api"],
  ["app/", "frontend"],
  ["pages/", "frontend"],
  ["src/", "generic"],
  ["components/", "frontend"],
  ["server/", "backend"],
  ["backend/", "backend"],
  ["routes/", "api"],
  ["controllers/", "api"]
];

// -- Business/product analysis reference data (mirrors reference/feature_market_playbook.md
// and reference/tech_alternatives.md; see those files for the qualitative source notes). --

const INDUSTRY_PROFILES = {
  "fintech / payments": {
    keywords: ["pay", "checkout", "invoice", "billing", "wallet", "ledger", "subscription", "stripe", "transaction"],
    subDomains: { invoice: "invoicing / AP automation", subscription: "subscription billing", wallet: "digital wallet" },
    defaultSubDomain: "payments infrastructure",
    targetCustomers: "businesses and their end customers that need to move or track money",
    competitors: ["Stripe", "Chargebee", "Paddle", "Adyen"]
  },
  "e-commerce / retail": {
    keywords: ["cart", "shop", "product", "inventory", "order", "storefront", "catalog", "sku"],
    subDomains: { inventory: "inventory management", storefront: "storefront/headless commerce" },
    defaultSubDomain: "online storefront",
    targetCustomers: "merchants selling products online and their shoppers",
    competitors: ["Shopify", "WooCommerce", "BigCommerce"]
  },
  healthtech: {
    keywords: ["patient", "appointment", "ehr", "clinic", "telehealth", "prescription", "diagnosis"],
    subDomains: { telehealth: "telehealth / virtual care", appointment: "clinical scheduling" },
    defaultSubDomain: "clinical workflow software",
    targetCustomers: "clinicians, care teams, and patients",
    competitors: ["Epic", "athenahealth", "Teladoc"]
  },
  edtech: {
    keywords: ["course", "student", "lesson", "quiz", "classroom", "lms", "curriculum"],
    subDomains: { quiz: "assessment tooling", lms: "learning management" },
    defaultSubDomain: "online learning",
    targetCustomers: "learners, instructors, and educational institutions",
    competitors: ["Canvas", "Coursera", "Teachable"]
  },
  "martech / CRM": {
    keywords: ["lead", "campaign", "crm", "contact", "pipeline", "deal", "prospect"],
    subDomains: { campaign: "marketing automation", pipeline: "sales CRM" },
    defaultSubDomain: "customer relationship management",
    targetCustomers: "sales and marketing teams",
    competitors: ["HubSpot", "Salesforce", "Pipedrive"]
  },
  "developer tools": {
    keywords: ["sdk", "cli", "plugin", "extension", "ide", "webhook", "integration"],
    subDomains: { cli: "developer CLI tooling", webhook: "integration platform" },
    defaultSubDomain: "developer productivity tooling",
    targetCustomers: "software engineers and engineering teams",
    competitors: ["GitHub", "Vercel", "Postman"]
  },
  "collaboration / productivity SaaS": {
    keywords: ["task", "project", "workspace", "team", "kanban", "docs", "wiki"],
    subDomains: { kanban: "project/task management", wiki: "knowledge management" },
    defaultSubDomain: "team productivity software",
    targetCustomers: "knowledge-work teams inside organizations",
    competitors: ["Notion", "Asana", "Linear"]
  },
  communication: {
    keywords: ["chat", "message", "inbox", "thread", "conversation"],
    subDomains: { inbox: "shared inbox / support messaging" },
    defaultSubDomain: "messaging platform",
    targetCustomers: "teams or communities that need real-time messaging",
    competitors: ["Slack", "Discord", "Intercom"]
  },
  "AI / ML product": {
    keywords: ["ai", "llm", "model", "embedding", "prompt", "agent", "completion", "inference"],
    subDomains: { agent: "AI agent tooling", embedding: "retrieval / semantic search" },
    defaultSubDomain: "AI-assisted product features",
    targetCustomers: "end users or developers consuming AI-generated output",
    competitors: ["OpenAI", "Anthropic", "Perplexity"]
  },
  "social / community": {
    keywords: ["post", "feed", "follow", "profile", "comment", "community"],
    subDomains: { feed: "social feed product" },
    defaultSubDomain: "social networking",
    targetCustomers: "individual consumers building a social graph",
    competitors: ["Reddit", "Discord", "X (Twitter)"]
  },
  "media / content": {
    keywords: ["video", "stream", "podcast", "article", "cms", "blog", "publish"],
    subDomains: { video: "video/streaming platform", blog: "publishing / CMS" },
    defaultSubDomain: "content publishing",
    targetCustomers: "content creators and their audiences",
    competitors: ["YouTube", "Substack", "Medium"]
  },
  "analytics / observability": {
    keywords: ["dashboard", "metric", "event", "analytics", "trace", "telemetry"],
    subDomains: { telemetry: "observability tooling" },
    defaultSubDomain: "product/usage analytics",
    targetCustomers: "product, growth, and engineering teams tracking usage or system health",
    competitors: ["Amplitude", "Mixpanel", "Datadog"]
  }
};

const DEPENDENCY_INDUSTRY_BOOST = {
  Stripe: ["fintech / payments", "e-commerce / retail"],
  OpenAI: ["AI / ML product"],
  Anthropic: ["AI / ML product"],
  Twilio: ["communication"],
  SendGrid: ["communication"],
  PostHog: ["analytics / observability"],
  Algolia: ["e-commerce / retail", "developer tools"]
};

const FALLBACK_INDUSTRY = {
  name: "general SaaS / web application",
  subDomain: "unclassified — insufficient business-signal evidence",
  targetCustomers: "not enough evidence to infer a specific customer segment",
  competitors: []
};

const CORE_FEATURE_KEYWORDS = new Set(["auth", "login", "signup", "payment", "pay", "checkout", "billing", "cart", "order", "subscription", "account", "user", "api", "database", "invoice", "wallet", "ledger"]);
const SUPPORTING_FEATURE_KEYWORDS = new Set(["dashboard", "admin", "settings", "profile", "notification", "search", "upload", "report", "analytics", "team", "workspace", "onboarding"]);
const PERIPHERAL_FEATURE_KEYWORDS = new Set(["blog", "docs", "marketing", "landing", "about", "faq", "help", "legal", "privacy", "terms", "changelog"]);
const EXCITEMENT_FEATURE_KEYWORDS = new Set(["ai", "ml", "assistant", "recommend", "personalize", "copilot", "chat", "generate"]);

const FEATURE_MARKET_PLAYBOOK = {
  auth: { marketComparable: "Auth0 / Clerk / Supabase Auth / NextAuth", rationale: "Session/password/OAuth handling is security-critical; managed providers absorb OWASP ASVS-level correctness and ongoing patching.", riskIfMissing: "Custom auth requires ongoing security maintenance; a missed rotation/hash upgrade is a direct breach vector.", efficiencyTier: "high" },
  payments: { marketComparable: "Stripe / Braintree / Paddle", rationale: "Handling card data directly pulls a company into PCI-DSS scope; hosted checkout/Elements keeps raw card data off the app's servers.", riskIfMissing: "Homegrown card handling multiplies compliance audit scope and breach liability.", efficiencyTier: "high" },
  checkout: { marketComparable: "Stripe Checkout / Shopify Checkout", rationale: "Checkout flows are conversion-sensitive; providers continuously optimize and localize so merchants don't have to.", riskIfMissing: "Custom checkout carries ongoing conversion-rate and tax/localization maintenance burden.", efficiencyTier: "high" },
  search: { marketComparable: "Algolia / Elasticsearch / Typesense", rationale: "Relevance ranking and query latency at scale are hard problems; ORM-filter search degrades quickly as data volume grows.", riskIfMissing: "In-house SQL search commonly hits a relevance/latency ceiling that forces a rewrite later.", efficiencyTier: "high" },
  notification: { marketComparable: "Resend / SendGrid / Postmark / Twilio", rationale: "Deliverability depends on IP reputation and SPF/DKIM/DMARC upkeep that mail/SMS providers manage continuously.", riskIfMissing: "Self-hosted delivery commonly lands in spam or fails silently without dedicated deliverability operations.", efficiencyTier: "high" },
  queue: { marketComparable: "Managed Redis + BullMQ/Sidekiq / AWS SQS / Celery", rationale: "Reliable retry/backoff and dead-letter handling are non-trivial to build correctly the first time.", riskIfMissing: "Inline or naive worker code risks silent job loss and duplicate side effects under retries.", efficiencyTier: "high" },
  storage: { marketComparable: "AWS S3 / Cloudflare R2 / Supabase Storage", rationale: "Durable, versioned, access-controlled object storage with signed URLs is a solved problem with strong SLAs.", riskIfMissing: "Disk-backed uploads on a single app server do not survive instance replacement or scale horizontally.", efficiencyTier: "high" },
  ai: { marketComparable: "OpenAI / Anthropic / Google Gemini APIs", rationale: "Training and hosting competitive foundation models is capital-intensive; API access ships model-backed features without owning GPU infrastructure.", riskIfMissing: "Self-hosting comparable model quality is a multi-million-dollar undertaking for most teams.", efficiencyTier: "high" },
  observability: { marketComparable: "Sentry / Datadog / Honeycomb", rationale: "Correlating errors, traces, and logs is a dedicated discipline; ad hoc logging does not scale past a few services.", riskIfMissing: "Blind spots in production delay incident detection and root-causing.", efficiencyTier: "medium" },
  flags: { marketComparable: "LaunchDarkly / Unleash / GrowthBook", rationale: "Progressive rollout and kill-switches reduce blast radius of bad deploys.", riskIfMissing: "All-or-nothing deploys raise the cost of a bad release.", efficiencyTier: "medium" },
  analytics: { marketComparable: "PostHog / Amplitude / Mixpanel", rationale: "Event pipelines and privacy-regulation handling are ongoing work independent of the core product.", riskIfMissing: "Home-grown analytics tables usually go stale or become their own maintenance burden.", efficiencyTier: "medium" },
  database: { marketComparable: "Managed Postgres (RDS/Supabase/Neon) + Prisma/SQLAlchemy", rationale: "Managed services absorb backup, patching, and failover; ORMs shrink the hand-written SQL surface an agent must review.", riskIfMissing: "Self-managed DB operations are a common cause of unrecoverable data-loss incidents.", efficiencyTier: "medium" },
  generic: { marketComparable: "no strong market-comparable pattern detected from static evidence", rationale: "Evaluate case by case; this feature name did not match a known outsourceable category.", riskIfMissing: "Not enough signal to estimate build-vs-buy risk from this scan.", efficiencyTier: "low" }
};

const CATEGORY_KEYWORDS = {
  auth: ["auth", "login", "signup", "session", "sso"],
  payments: ["payment", "pay", "billing", "invoice", "wallet", "ledger"],
  checkout: ["checkout", "cart", "order"],
  search: ["search", "find", "discover"],
  notification: ["notification", "email", "mail", "sms", "alert"],
  queue: ["queue", "job", "worker", "background", "cron"],
  storage: ["upload", "file", "media", "asset", "storage"],
  ai: ["ai", "ml", "assistant", "chat", "recommend", "generate", "copilot"],
  observability: ["log", "monitor", "trace", "health", "metric"],
  flags: ["flag", "experiment", "rollout"],
  analytics: ["analytics", "report", "dashboard", "insight"],
  database: ["database", "db", "schema", "migration"]
};

const FRAMEWORK_DECISION_TABLE = [
  ["MoSCoW", (ctx) => ctx.featureCount < 3, "Fewer than 3 segmentable features were found, so there isn't enough quantitative reach/impact signal for a scored model — a qualitative must/should/could/won't split is the honest choice."],
  ["MoSCoW", (ctx) => ctx.industryConfidence === "low", "Business-context confidence is low (little README/description/keyword signal), so a scored model would imply false precision. MoSCoW only requires relative judgment calls."],
  ["RICE", (ctx) => ctx.featureCount >= 5 && ctx.fileCountSpread, "5+ features with meaningfully different file-touchpoint counts give usable Reach/Effort proxies, so a quantified RICE score adds real signal over a qualitative bucket."],
  ["Kano Model", (ctx) => ctx.hasCoreTier && ctx.hasExcitementTier, "The feature set mixes expected/must-be functionality (auth, payments, core CRUD) with delighter-style functionality (AI/personalization), which is exactly the basic-vs-performance-vs-excitement split Kano is built for."],
  ["Cost of Delay Formula", (ctx) => ctx.hasComplianceSensitive && ctx.lowTestCoverage, "Compliance-sensitive features (auth/payments) are present with weak test coverage, so sequencing by cost-of-delay (risk exposure over time) matters more than a static score."],
  ["Weighted Scoring Model", (ctx) => ctx.lowScoreVariance, "Feature composite scores cluster tightly together, so a multi-criteria weighted model is needed to break ties that a simpler bucket method can't resolve."]
];

const TECH_ALTERNATIVE_RULES = [
  {
    area: "frontend",
    detect: (inv) => inv.stack.dependencies.some((d) => d.includes("react-scripts")),
    signal: "Create React App (`react-scripts`) detected",
    fitsAt: "learning projects, tiny prototypes",
    breaksAt: "unmaintained tool since 2023; no first-party fix for slow builds or modern bundling",
    alternative: "Vite + React, or Next.js if SSR/routing is needed",
    tokenNote: "Vite's convention-based config replaces hand-rolled webpack/CRA overrides, shrinking the config surface an agent has to read before editing build behavior."
  },
  {
    area: "backend",
    detect: (inv) => inv.architecture.databases.includes("SQLite"),
    signal: "SQLite detected alongside a backend framework",
    fitsAt: "0 -> 1 prototyping, local dev",
    breaksAt: "multi-user concurrent writes, backups, horizontal scaling",
    alternative: "Managed Postgres (RDS/Supabase/Neon) with the same ORM already in use",
    tokenNote: "Migration is schema/config-level, not a rewrite; an ORM already in use keeps the model layer an agent edits the same shape."
  },
  {
    area: "backend",
    detect: (inv) => inv.architecture.backend.frameworks.length > 0 && inv.architecture.databases.length === 0,
    signal: "Backend framework detected with no ORM/database dependency",
    fitsAt: "small, single-developer backend or stateless API",
    breaksAt: "query duplication, N+1 risk, and injection risk grow with route count",
    alternative: "Adopt the ecosystem-standard ORM/query builder (Prisma for Node, SQLAlchemy for Python, ActiveRecord for Rails)",
    tokenNote: "An ORM's declarative model files are far more compact than hand-written SQL scattered across route handlers, so an agent changing a field touches one model file instead of every query site."
  },
  {
    area: "architecture",
    detect: (inv) => inv.architecture.third_party_services.length > 0 && inv.architecture.background_jobs.length === 0,
    signal: "Third-party service dependency present with no queue/background-job dependency",
    fitsAt: "low-volume request handling",
    breaksAt: "slow/failing third-party calls block user-facing request latency",
    alternative: "Managed queue (BullMQ+Redis, Celery, SQS)",
    tokenNote: "Queue/worker boilerplate is a small, well-documented pattern — far smaller than a custom retry/backoff implementation an agent would otherwise write and re-verify."
  },
  {
    area: "architecture",
    detect: (inv) => inv.architecture.frontend.frameworks.length > 0 && !inv.infra.signals.some((s) => ["Vercel", "Netlify"].includes(s.type)),
    signal: "Frontend framework detected with no CDN/edge hosting signal",
    fitsAt: "any stage serving static assets or read-heavy pages",
    breaksAt: "origin compute serves cacheable content on every request",
    alternative: "Deploy static/read-heavy routes behind Vercel/Netlify/Cloudflare edge caching",
    tokenNote: "Edge caching config is a few lines of hosting config versus custom cache-control/invalidation logic written and tested by hand."
  },
  {
    area: "architecture",
    detect: (inv) => inv.infra.ci_cd.length === 0,
    signal: "No CI workflow detected",
    fitsAt: "solo throwaway scripts",
    breaksAt: "regressions ship unnoticed as the codebase grows past what one person can manually verify",
    alternative: "GitHub Actions (or equivalent) running lint/type-check/test/build on every PR",
    tokenNote: "A standard CI template is copy-once; without it, an agent must be re-told the verification steps every session instead of them running automatically."
  },
  {
    area: "architecture",
    detect: (inv) => inv.quality.dependency_health.lockfiles.length === 0,
    signal: "No dependency lockfile committed",
    fitsAt: "n/a — always risky once more than one contributor or environment is involved",
    breaksAt: "non-reproducible installs; \"works on my machine\" drift",
    alternative: "Commit the ecosystem lockfile (package-lock.json/pnpm-lock.yaml/poetry.lock/etc.)",
    tokenNote: "A committed lockfile means an agent's install step is deterministic and doesn't require re-resolving dependency versions each run."
  },
  {
    area: "backend",
    detect: (inv) => inv.architecture.api.routes.length > 0 && inv.quality.security.rate_limit_signal.length === 0 && inv.quality.security.cors_signal.length === 0,
    signal: "Public API routes detected with no rate-limiting or CORS dependency",
    fitsAt: "internal-only or pre-launch APIs",
    breaksAt: "public traffic, abuse, or scraping once the API is reachable from the internet",
    alternative: "express-rate-limit/django-ratelimit/slowapi plus an explicit CORS allow-list",
    tokenNote: "These are drop-in middleware; adding them is a few lines versus custom throttling logic an agent would need to write and load-test."
  }
];

const TEST_TYPE_PATTERNS = [
  ["unit", ["unit", "spec"]],
  ["integration", ["integration", "int_test"]],
  ["end-to-end / regression", ["e2e", "cypress", "playwright", "regression"]],
  ["sanity / smoke", ["smoke", "sanity", "health"]]
];

const SCALE_BUCKETS = [
  [4.0, "0-to-1"],
  [6.0, "1-to-100"],
  [7.5, "100-to-10k"],
  [8.5, "10k-to-1m"],
  [11.0, "1m-to-100m"]
];

const TIER_USERS_LOAD = {
  "0-to-1": "pre-launch / first users",
  "1-to-100": "early adopters",
  "100-to-10k": "product-market-fit stage",
  "10k-to-1m": "growth stage",
  "1m-to-100m": "hyperscale"
};

initTheme();
themeToggle.addEventListener("click", toggleTheme);

function initTheme() {
  const stored = localStorage.getItem("stack-auditor-theme");
  const preferred = stored || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  document.documentElement.dataset.theme = preferred;
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("stack-auditor-theme", next);
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    document.querySelector(`#${tab.dataset.tab}`).classList.add("active");
  });
});

function analyze(inventory, targetScale) {
  const scores = scoreInventory(inventory);
  const businessContext = inferBusinessContext(inventory);
  const features = scoreFeatures(inventory);
  const frameworkChoice = selectPrioritizationFramework(features, businessContext);
  const frameworkApplied = applyFramework(frameworkChoice.framework, features, businessContext);
  const tree = productTree(features);
  const baf = buyAFeature(features);
  const techAlternatives = evaluateTechAlternatives(inventory);
  const testTaxonomy = classifyTestCoverage(inventory);
  const tasks = remediationTasks(inventory, scores, targetScale);
  const tagCounts = countTaskTags(tasks);
  const composite = compositeScoreAndScale(scores, features, tagCounts);
  return { scores, businessContext, features, frameworkChoice, frameworkApplied, tree, baf, techAlternatives, testTaxonomy, tasks, tagCounts, composite };
}

async function augmentWithLiveSerpEvidence(inventory, analysis, inputs) {
  if (!inputs.brightDataKey || !inputs.brightDataZone) return;
  if (analysis.businessContext.industry === FALLBACK_INDUSTRY.name) return;
  setStatus("Fetching live competitor search evidence (Bright Data)...");
  const live = await fetchBrightDataSerp(`${analysis.businessContext.industry} competitors`, inputs.brightDataKey, inputs.brightDataZone);
  analysis.businessContext.live_search_attempted = true;
  analysis.businessContext.live_search_evidence = live;
  const report = renderMarkdownReport(inventory, analysis, inputs);
  const agentPrompt = renderAgentPromptMarkdown(inventory, analysis, inputs);
  latestReport = report;
  latestAgentPrompt = agentPrompt;
  renderApp(inventory, analysis, report, agentPrompt, inputs);
  setStatus(
    live && live.results.length ? "Audit complete. Live competitor evidence added." : "Audit complete. Live competitor evidence unavailable (see Business tab).",
    "good"
  );
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setBusy(true, "Parsing repository URL...");
  try {
    const inputs = getInputs();
    latestRepoName = repoSlug(inputs.repoUrl).replace("/", "-");
    const inventory = await scanGithubRepo(inputs);
    const analysis = analyze(inventory, inputs.targetScale);
    const report = renderMarkdownReport(inventory, analysis, inputs);
    const agentPrompt = renderAgentPromptMarkdown(inventory, analysis, inputs);
    latestReport = report;
    latestTasks = analysis.tasks;
    latestAgentPrompt = agentPrompt;
    renderApp(inventory, analysis, report, agentPrompt, inputs);
    setStatus(`Audit complete. Scanned ${inventory.files.count} files and ${inventory.stack.manifests.length} manifest(s).`, "good");
    enableActions(true);
    await augmentWithLiveSerpEvidence(inventory, analysis, inputs);
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Audit failed.", "bad");
  } finally {
    setBusy(false);
  }
});

copyReportButton.addEventListener("click", () => copyText(latestReport, "Report copied."));
copyTasksButton.addEventListener("click", () => copyText(latestTasks.join("\n"), "Remediation tasks copied."));
loadDemoButton.addEventListener("click", async () => {
  const liveInputs = getInputs();
  const inputs = {
    repoUrl: "https://github.com/demo/next-saas",
    branch: "main",
    budget: "250",
    targetScale: "100-to-10k",
    currentHost: "Vercel",
    token: "",
    brightDataKey: liveInputs.brightDataKey,
    brightDataZone: liveInputs.brightDataZone
  };
  const inventory = demoInventory();
  const analysis = analyze(inventory, inputs.targetScale);
  const report = renderMarkdownReport(inventory, analysis, inputs);
  const agentPrompt = renderAgentPromptMarkdown(inventory, analysis, inputs);
  latestRepoName = "demo-next-saas";
  latestReport = report;
  latestTasks = analysis.tasks;
  latestAgentPrompt = agentPrompt;
  renderApp(inventory, analysis, report, agentPrompt, inputs);
  setStatus("Demo audit loaded. Enter a GitHub URL to scan a real repo.", "good");
  enableActions(true);
  await augmentWithLiveSerpEvidence(inventory, analysis, inputs);
});
downloadReportButton.addEventListener("click", () => {
  const blob = new Blob([latestReport], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${latestRepoName || "stack-audit"}-report.md`;
  link.click();
  URL.revokeObjectURL(url);
});
if (copyAgentPromptButton) {
  copyAgentPromptButton.addEventListener("click", () => copyText(latestAgentPrompt, "Agent prompt copied."));
}
if (downloadAgentPromptButton) {
  downloadAgentPromptButton.addEventListener("click", () => {
    const blob = new Blob([latestAgentPrompt], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${latestRepoName || "stack-audit"}-agent-prompt.md`;
    link.click();
    URL.revokeObjectURL(url);
  });
}

function getInputs() {
  return {
    repoUrl: document.querySelector("#repo-url").value.trim(),
    branch: document.querySelector("#branch").value.trim(),
    budget: document.querySelector("#budget").value.trim(),
    targetScale: document.querySelector("#target-scale").value,
    currentHost: document.querySelector("#current-host").value.trim(),
    token: document.querySelector("#github-token").value.trim(),
    brightDataKey: (document.querySelector("#brightdata-key") || {}).value?.trim() || "",
    brightDataZone: (document.querySelector("#brightdata-zone") || {}).value?.trim() || ""
  };
}

// Bright Data SERP API — best-effort, client-side. The key/zone are typed into this tab only
// (see index.html note) and never persisted or committed. Browser CORS restrictions can block
// this call since it's a cross-origin POST from a static page with no backend; any failure
// (network, CORS, non-2xx) is swallowed and surfaced as "not available" rather than breaking
// the rest of the audit. Mirrors stack_auditor/brightdata.py's request shape exactly.
async function fetchBrightDataSerp(query, apiKey, zone) {
  if (!apiKey || !zone) return null;
  try {
    const searchUrl = "https://www.google.com/search?" + new URLSearchParams({ q: query, gl: "us", hl: "en" }).toString();
    const response = await fetch("https://api.brightdata.com/request", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ zone, url: searchUrl, format: "json", data_format: "parsed" })
    });
    if (!response.ok) return null;
    // Response is double-encoded: {status_code, headers, body} where body is itself a JSON string.
    const outer = await response.json();
    const body = JSON.parse(outer.body || "{}");
    const organic = body.organic || [];
    const results = organic
      .filter((item) => item && item.link)
      .slice(0, 8)
      .map((item) => ({ rank: item.rank, title: item.title || "", source: item.source || "", link: item.link || "", description: item.description || "" }));
    return { query, results };
  } catch {
    return null;
  }
}

async function scanGithubRepo(inputs) {
  const { owner, repo } = parseGithubUrl(inputs.repoUrl);
  setStatus("Reading repository metadata...");
  const repoMeta = await githubJson(`https://api.github.com/repos/${owner}/${repo}`, inputs.token);
  const branch = inputs.branch || repoMeta.default_branch;
  setStatus(`Fetching file tree for ${owner}/${repo}@${branch}...`);
  const tree = await githubJson(`https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`, inputs.token);
  if (tree.truncated) {
    setStatus("GitHub returned a truncated tree. The report will note skipped files.", "warn");
  }
  const allFiles = (tree.tree || [])
    .filter((item) => item.type === "blob")
    .map((item) => item.path)
    .filter((path) => !isSkipped(path))
    .sort();

  const manifests = manifestPaths(allFiles);
  setStatus(`Fetching ${manifests.length} manifest file(s)...`);
  const manifestData = await Promise.all(manifests.slice(0, 40).map((path) => fetchManifest(owner, repo, branch, path, inputs.token)));

  const readmePath = allFiles.find((path) => !path.includes("/") && README_NAMES.has(basename(path).toLowerCase()));
  let readmeText = "";
  if (readmePath) {
    setStatus("Fetching README...");
    readmeText = await fetchFileText(owner, repo, branch, readmePath, inputs.token).catch(() => "");
  }

  const infraSignalsPreview = detectInfra(allFiles);
  const portFiles = infraSignalsPreview.filter((s) => ["Dockerfile", "Docker Compose"].includes(s.type)).slice(0, 3);
  let exposedPorts = [];
  if (portFiles.length) {
    setStatus("Checking Dockerfile/compose for exposed ports...");
    const portFileContents = await Promise.all(portFiles.map((f) => fetchFileText(owner, repo, branch, f.path, inputs.token).catch(() => "")));
    exposedPorts = detectExposedPorts(portFiles.map((f, i) => ({ path: f.path, content: portFileContents[i] })));
  }

  const secretCandidates = pickSecretScanCandidates(allFiles).slice(0, 25);
  let secretHits = [];
  if (secretCandidates.length) {
    setStatus(`Running lightweight secret pattern check on ${secretCandidates.length} file(s)...`);
    const secretContents = await Promise.all(secretCandidates.map((path) => fetchFileText(owner, repo, branch, path, inputs.token).catch(() => "")));
    secretHits = secretScan(secretCandidates.map((path, i) => ({ path, content: secretContents[i] })));
  }

  const inventory = buildInventory({
    owner,
    repo,
    branch,
    repoUrl: inputs.repoUrl,
    repoMeta,
    files: allFiles,
    treeTruncated: tree.truncated,
    manifests: manifestData,
    readmePath,
    readmeText,
    exposedPorts,
    secretHits
  });
  return inventory;
}

function pickSecretScanCandidates(files) {
  const scored = files
    .filter((path) => /\.(js|jsx|ts|tsx|py|rb|go|rs|php|java|kt|swift|dart|json|toml|yaml|yml|md|txt)$/i.test(path) || basename(path).startsWith(".env"))
    .map((path) => ({ path, priority: /(config|env|secret|setting|key)/i.test(path) ? 0 : 1 }));
  scored.sort((a, b) => a.priority - b.priority || a.path.localeCompare(b.path));
  return scored.map((s) => s.path);
}

function detectExposedPorts(fileContents) {
  const hits = [];
  fileContents.forEach(({ path, content }) => {
    [...content.matchAll(/^\s*EXPOSE\s+(\d{2,5})/gim)].forEach((m) => {
      hits.push({ port: m[1], path, service: SENSITIVE_PORT_LABELS[m[1]] || "" });
    });
    [...content.matchAll(/^\s*-\s*["']?(\d{2,5}):(\d{2,5})["']?/gm)].forEach((m) => {
      hits.push({ port: m[2], path, service: SENSITIVE_PORT_LABELS[m[2]] || "" });
    });
  });
  const seen = new Set();
  return hits.filter((hit) => {
    const key = `${hit.port}:${hit.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function secretScan(fileContents) {
  const hits = [];
  fileContents.forEach(({ path, content }) => {
    if (!content) return;
    for (const [pattern, label] of SECRET_PATTERNS) {
      if (pattern.test(content)) {
        hits.push({ path, pattern: label });
        break;
      }
    }
  });
  return hits.slice(0, 20);
}

function buildInventory({ owner, repo, branch, repoUrl, repoMeta, files, treeTruncated, manifests, readmePath = null, readmeText = "", exposedPorts = [], secretHits = [] }) {
  const dependencies = new Set();
  manifests.forEach((manifest) => Object.keys(manifest.dependencies || {}).forEach((dep) => dependencies.add(dep.toLowerCase())));
  const frameworks = detectNamed(dependencies, FRAMEWORK_DEPENDENCIES);
  const databases = detectNamed(dependencies, DB_DEPENDENCIES);
  const auth = detectNamed(dependencies, AUTH_DEPENDENCIES);
  const backgroundJobs = detectNamed(dependencies, QUEUE_DEPENDENCIES);
  const thirdPartyServices = detectNamed(dependencies, THIRD_PARTY_DEPENDENCIES);
  const cors = detectNamed(dependencies, CORS_DEPENDENCIES);
  const rateLimit = detectNamed(dependencies, RATE_LIMIT_DEPENDENCIES);
  const languages = countLanguages(files);
  const infraSignals = detectInfra(files);
  const envFiles = files.filter((path) => basename(path).startsWith(".env") || ["env.example", ".env.example"].includes(basename(path)));
  const frontend = detectFrontend(files, frameworks);
  const api = detectApi(files, frameworks);
  const backend = detectBackend(files, frameworks, api);
  const tests = detectTests(files, manifests);
  const security = detectSecurity(files, envFiles, auth, cors, rateLimit, exposedPorts, secretHits);
  const appType = classifyApp(files, frameworks, manifests.map((item) => item.path));
  const warnings = [];
  if (treeTruncated) warnings.push("GitHub tree response was truncated; scan may be incomplete.");
  if (appType === "ambiguous") warnings.push("Repository may not be a standalone app; no clear app framework was detected.");

  const description = manifests.map((m) => m.description).find(Boolean) || "";
  const keywords = Array.from(new Set(manifests.flatMap((m) => m.keywords || []).map((k) => k.toLowerCase())));
  const businessEvidence = {
    readme_path: readmePath,
    readme_excerpt: (readmeText || "").trim().slice(0, 4000),
    package_description: description,
    keywords
  };
  const features = segmentFeatures(files, tests.files, frameworks);

  return {
    repo: {
      source: repoUrl,
      owner,
      name: repo,
      full_name: repoMeta.full_name || `${owner}/${repo}`,
      branch,
      app_type: appType,
      warnings
    },
    files: {
      count: files.length,
      sample: files.slice(0, 100),
      skipped: treeTruncated ? ["GitHub API tree truncated"] : []
    },
    stack: {
      languages,
      frameworks,
      package_managers: detectPackageManagers(files),
      manifests: manifests.map((item) => item.path),
      dependencies: Array.from(dependencies).sort()
    },
    architecture: {
      frontend,
      backend,
      api,
      databases,
      auth,
      background_jobs: backgroundJobs,
      third_party_services: thirdPartyServices
    },
    infra: {
      signals: infraSignals,
      env_files: envFiles,
      ci_cd: infraSignals.filter((item) => item.type === "GitHub Actions")
    },
    quality: {
      tests,
      security,
      dependency_health: {
        lockfiles: files.filter((path) => ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "poetry.lock", "Pipfile.lock", "Gemfile.lock", "Cargo.lock", "go.sum"].includes(basename(path))),
        manifest_count: manifests.length,
        audit_attempted: false,
        audit_note: "Browser scan only. Run npm audit, pip-audit, bundler audit, or ecosystem equivalent inside the repo for vulnerability details."
      }
    },
    business: businessEvidence,
    features
  };
}

function demoInventory() {
  return buildInventory({
    owner: "demo",
    repo: "next-saas",
    branch: "main",
    repoUrl: "https://github.com/demo/next-saas",
    repoMeta: { full_name: "demo/next-saas", default_branch: "main" },
    treeTruncated: false,
    files: [
      ".env.example",
      ".github/workflows/ci.yml",
      "app/api/checkout/route.ts",
      "app/api/health/route.ts",
      "app/dashboard/page.tsx",
      "app/page.tsx",
      "components/nav.tsx",
      "lib/db.ts",
      "lib/auth.ts",
      "package-lock.json",
      "package.json",
      "prisma/schema.prisma",
      "tests/checkout.test.ts",
      "vercel.json"
    ],
    manifests: [
      {
        path: "package.json",
        scripts: { test: "vitest --coverage", build: "next build" },
        dependencies: {
          next: "14.2.0",
          react: "18.3.1",
          "react-dom": "18.3.1",
          pg: "8.11.5",
          prisma: "5.16.0",
          "next-auth": "4.24.7",
          stripe: "16.0.0"
        }
      }
    ]
  });
}

// ---------------------------------------------------------------------------
// Business-context inference, feature scoring, prioritization-framework
// selection, Product Tree / Buy-a-Feature, and composite scale prediction.
// Mirrors stack_auditor/business.py — see that module's docstring for the
// non-fabrication ground rules this logic follows.
// ---------------------------------------------------------------------------

function inferBusinessContext(inventory) {
  const biz = inventory.business || { readme_excerpt: "", package_description: "", keywords: [] };
  const textBlob = [biz.package_description || "", biz.readme_excerpt || "", (biz.keywords || []).join(" ")].join(" ").toLowerCase();

  const scores = {};
  Object.entries(INDUSTRY_PROFILES).forEach(([industry, profile]) => {
    scores[industry] = profile.keywords.filter((kw) => textBlob.includes(kw)).length;
  });
  [...inventory.stack.frameworks, ...inventory.architecture.third_party_services].forEach((dep) => {
    (DEPENDENCY_INDUSTRY_BOOST[dep] || []).forEach((industry) => {
      scores[industry] = (scores[industry] || 0) + 2;
    });
  });

  let bestIndustry = null;
  let bestScore = 0;
  Object.entries(scores).forEach(([industry, score]) => {
    if (score > bestScore) {
      bestIndustry = industry;
      bestScore = score;
    }
  });

  let industryName, subDomain, targetCustomers, competitors, confidence;
  if (!bestIndustry || bestScore === 0) {
    industryName = FALLBACK_INDUSTRY.name;
    subDomain = FALLBACK_INDUSTRY.subDomain;
    targetCustomers = FALLBACK_INDUSTRY.targetCustomers;
    competitors = FALLBACK_INDUSTRY.competitors;
    confidence = "low";
  } else {
    const profile = INDUSTRY_PROFILES[bestIndustry];
    industryName = bestIndustry;
    subDomain = profile.defaultSubDomain;
    for (const [kw, label] of Object.entries(profile.subDomains)) {
      if (textBlob.includes(kw)) {
        subDomain = label;
        break;
      }
    }
    targetCustomers = profile.targetCustomers;
    competitors = profile.competitors;
    confidence = bestScore >= 4 ? "high" : "medium";
  }

  const description = biz.package_description || "";
  let problemStatement;
  if (description) {
    problemStatement = `Stated in repo metadata: ${description.trim()}`;
  } else if (biz.readme_excerpt) {
    const firstLine = biz.readme_excerpt.split("\n").map((l) => l.trim()).find(Boolean) || "";
    problemStatement = firstLine ? `Inferred from README opening line: "${firstLine.slice(0, 220)}"` : "No description or usable README opening line found; problem statement could not be inferred from evidence.";
  } else {
    problemStatement = "No package description or README found; problem statement could not be inferred from evidence.";
  }

  return {
    problem_statement: problemStatement,
    target_customers: targetCustomers,
    industry: industryName,
    sub_domain: subDomain,
    potential_competitors: competitors,
    confidence,
    live_search_evidence: null,
    live_search_attempted: false,
    evidence: {
      readme_found: Boolean(biz.readme_path),
      package_description_found: Boolean(description),
      keyword_count: (biz.keywords || []).length,
      industry_keyword_hits: bestScore
    }
  };
}

function featureTier(name) {
  if ([...CORE_FEATURE_KEYWORDS].some((kw) => name.includes(kw))) return "core";
  if ([...SUPPORTING_FEATURE_KEYWORDS].some((kw) => name.includes(kw))) return "supporting";
  if ([...PERIPHERAL_FEATURE_KEYWORDS].some((kw) => name.includes(kw))) return "peripheral";
  return "unclassified";
}

function featureCategory(name) {
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => name.includes(kw))) return category;
  }
  return "generic";
}

function clamp10(value) {
  return Math.max(1, Math.min(10, Math.round(value)));
}

function scoreFeatures(inventory) {
  const features = inventory.features || [];
  if (!features.length) return [];

  const fileCounts = features.map((f) => f.file_count);
  const lo = Math.min(...fileCounts);
  const hi = Math.max(...fileCounts);

  const scored = features.map((feature) => {
    const name = feature.name;
    const tier = featureTier(name);
    const category = featureCategory(name);
    const playbook = FEATURE_MARKET_PLAYBOOK[category];
    const tierBase = { core: 9, supporting: 6, peripheral: 3, unclassified: 5 }[tier];
    const relevance = clamp10(tierBase + (feature.layers.length > 1 ? 1 : 0) + (feature.has_tests ? 1 : 0));
    const repeatability = hi > lo ? clamp10(1 + (9 * (feature.file_count - lo)) / (hi - lo)) : 5;
    const efficiency = { high: 8, medium: 6, low: 4 }[playbook.efficiencyTier];
    const composite = Math.round((relevance * 0.5 + repeatability * 0.2 + efficiency * 0.3) * 100) / 100;
    return {
      name,
      tier,
      category,
      layers: feature.layers,
      file_count: feature.file_count,
      has_tests: feature.has_tests,
      evidence_paths: feature.paths.slice(0, 5),
      relevance,
      repeatability,
      efficiency,
      market_comparable: playbook.marketComparable,
      market_rationale: playbook.rationale,
      risk_if_missing: playbook.riskIfMissing,
      composite
    };
  });
  scored.sort((a, b) => b.composite - a.composite);
  return scored;
}

function selectPrioritizationFramework(features, businessContext) {
  if (!features.length) {
    return {
      framework: "MoSCoW",
      reasoning: "No segmentable product features were found in the scan, so only a qualitative must/should/could/won't placeholder is possible until more of the app is evidenced.",
      runners_up: []
    };
  }
  const composites = features.map((f) => f.composite);
  const ctx = {
    featureCount: features.length,
    industryConfidence: businessContext.confidence,
    fileCountSpread: Math.max(...features.map((f) => f.file_count)) - Math.min(...features.map((f) => f.file_count)) >= 3,
    hasCoreTier: features.some((f) => f.tier === "core"),
    hasExcitementTier: features.some((f) => [...EXCITEMENT_FEATURE_KEYWORDS].some((kw) => f.name.includes(kw))),
    hasComplianceSensitive: features.some((f) => ["auth", "payments"].includes(f.category)),
    lowTestCoverage: features.filter((f) => f.has_tests).length / features.length < 0.5,
    lowScoreVariance: Math.max(...composites) - Math.min(...composites) < 2.0
  };

  let chosen = null;
  let reasoning = "";
  for (const [framework, predicate, why] of FRAMEWORK_DECISION_TABLE) {
    if (predicate(ctx)) {
      chosen = framework;
      reasoning = why;
      break;
    }
  }
  if (!chosen) {
    chosen = "DVF Framework";
    reasoning = "No sharper signal (data richness, Kano-style tier mix, compliance urgency, or score clustering) applied, so Desirability/Viability/Feasibility gives the most balanced general-purpose lens for a business+tech co-evaluation.";
  }
  const runnersUp = Array.from(new Set(FRAMEWORK_DECISION_TABLE.map(([f]) => f).filter((f) => f !== chosen))).slice(0, 2);
  return { framework: chosen, reasoning, runners_up: runnersUp, decision_context: ctx };
}

function diffRankingChanges(scoredRows, baselineRows, scoreLabel, baselineLabel) {
  const scoredRank = new Map(scoredRows.map((f, i) => [f.name, i]));
  const baselineRank = new Map(baselineRows.map((f, i) => [f.name, i]));
  const changes = [];
  scoredRank.forEach((rank, name) => {
    const bRank = baselineRank.has(name) ? baselineRank.get(name) : rank;
    const drift = bRank - rank;
    if (drift >= 2) {
      changes.push(`Promote \`${name}\`: ranks #${rank + 1} by ${scoreLabel} but only #${bRank + 1} by ${baselineLabel} — current build effort likely under-indexes it.`);
    } else if (drift <= -2) {
      changes.push(`Reconsider investment in \`${name}\`: ranks #${bRank + 1} by ${baselineLabel} but only #${rank + 1} by ${scoreLabel} — may be over-built relative to business signal.`);
    }
  });
  return changes.slice(0, 8);
}

function applyFramework(framework, features, businessContext) {
  if (!features.length) return { rows: [], recommended_changes: [] };

  if (framework === "RICE") {
    const rows = features.map((f) => {
      const reach = f.repeatability;
      const impact = f.relevance;
      const confidence = f.has_tests ? 1.0 : 0.6;
      const effort = Math.max(1, f.file_count);
      const rice = Math.round(((reach * impact * confidence) / effort) * 100) / 100;
      return { ...f, framework_score: rice, framework_label: "RICE score" };
    });
    rows.sort((a, b) => b.framework_score - a.framework_score);
    const byFileCount = [...features].sort((a, b) => b.file_count - a.file_count);
    return { rows, recommended_changes: diffRankingChanges(rows, byFileCount, "RICE score", "apparent dev investment (file count)") };
  }

  if (framework === "MoSCoW") {
    const rows = features.map((f) => {
      let bucket;
      if (f.relevance >= 8) bucket = "Must";
      else if (f.relevance >= 6) bucket = "Should";
      else if (f.relevance >= 4) bucket = "Could";
      else bucket = "Won't (for now)";
      return { ...f, framework_score: bucket, framework_label: "MoSCoW bucket" };
    });
    const recommended = [];
    rows.forEach((f) => {
      if (["Could", "Won't (for now)"].includes(f.framework_score) && f.repeatability >= 7) {
        recommended.push(`Re-check \`${f.name}\`: bucketed ${f.framework_score} by keyword relevance, but its file-touchpoint count is high (repeatability ${f.repeatability}/10) — verify it isn't actually a Must before deprioritizing.`);
      }
      if (f.framework_score === "Must" && !f.has_tests) {
        recommended.push(`\`${f.name}\` is bucketed Must but has no matching test evidence — treat test coverage for it as a Must-fix, not optional.`);
      }
    });
    return { rows, recommended_changes: recommended };
  }

  if (framework === "Kano Model") {
    const rows = features.map((f) => {
      let kano;
      if ([...EXCITEMENT_FEATURE_KEYWORDS].some((kw) => f.name.includes(kw))) kano = "Excitement (delighter)";
      else if (f.tier === "core") kano = "Basic (must-be)";
      else if (f.tier === "supporting") kano = "Performance (linear)";
      else kano = "Indifferent";
      return { ...f, framework_score: kano, framework_label: "Kano category" };
    });
    const recommended = [];
    rows.forEach((f) => {
      if (f.framework_score === "Basic (must-be)" && !f.has_tests) {
        recommended.push(`\`${f.name}\` is a Kano Basic/must-be feature without test evidence — its absence or breakage causes outsized dissatisfaction, so it should outrank any Excitement-tier work in the current backlog.`);
      }
      if (f.framework_score === "Indifferent" && f.file_count >= 3) {
        recommended.push(`\`${f.name}\` is Kano-Indifferent (peripheral, low business signal) yet has ${f.file_count} files — verify this investment against real usage before adding more to it.`);
      }
    });
    return { rows, recommended_changes: recommended };
  }

  if (framework === "DVF Framework") {
    const industry = businessContext.industry || "";
    const rows = features.map((f) => {
      const desirability = f.relevance;
      let viability = f.efficiency + (industry.includes(f.category) ? 2 : 0);
      viability = clamp10(viability);
      const feasibility = clamp10(5 + (f.has_tests ? 2 : -1) + (f.layers.length > 1 ? 1 : 0));
      const score = Math.round(((desirability + viability + feasibility) / 3) * 100) / 100;
      return { ...f, desirability, viability, feasibility, framework_score: score, framework_label: "DVF average" };
    });
    rows.sort((a, b) => b.framework_score - a.framework_score);
    const recommended = [];
    rows.forEach((f) => {
      if (f.desirability >= 7 && f.feasibility <= 4) {
        recommended.push(`\`${f.name}\` is high-desirability but low-feasibility (little test/multi-layer evidence) — de-risk it (add tests, document ownership) before extending it further.`);
      }
      if (f.desirability <= 4 && f.viability <= 4 && f.feasibility <= 4) {
        recommended.push(`\`${f.name}\` scores low on all three DVF axes — candidate to cut or defer.`);
      }
    });
    return { rows, recommended_changes: recommended };
  }

  if (framework === "Cost of Delay Formula") {
    const rows = features.map((f) => {
      const urgency = ["auth", "payments"].includes(f.category) ? 2.0 : 1.0;
      const effortProxy = Math.max(1, f.file_count);
      const cod = Math.round(((f.composite * urgency) / effortProxy) * 1000) / 1000;
      return { ...f, urgency_multiplier: urgency, framework_score: cod, framework_label: "Cost of Delay (composite x urgency / effort)" };
    });
    rows.sort((a, b) => b.framework_score - a.framework_score);
    const recommended = [];
    rows.slice(0, 3).forEach((f) => {
      if (!f.has_tests) {
        recommended.push(`\`${f.name}\` has the highest cost-of-delay in this scan (urgency x${f.urgency_multiplier}) and no test evidence — sequence it first; every sprint it ships untested compounds risk exposure.`);
      }
    });
    return { rows, recommended_changes: recommended };
  }

  // Weighted Scoring Model (default / explicit fallback)
  const rows = features.map((f) => {
    const score = Math.round((f.relevance * 0.4 + f.efficiency * 0.3 + f.repeatability * 0.3) * 100) / 100;
    return { ...f, framework_score: score, framework_label: "Weighted score (0.4 relevance + 0.3 efficiency + 0.3 repeatability)" };
  });
  rows.sort((a, b) => b.framework_score - a.framework_score);
  const byFileCount = [...features].sort((a, b) => b.file_count - a.file_count);
  return { rows, recommended_changes: diffRankingChanges(rows, byFileCount, "weighted score", "apparent dev investment (file count)") };
}

function productTree(features) {
  if (!features.length) return [];
  const sortedCounts = [...features.map((f) => f.file_count)].sort((a, b) => a - b);
  const median = sortedCounts[Math.floor(features.length / 2)];
  return features.map((f) => {
    let placement;
    if (f.tier === "core" && f.layers.length > 1) placement = "Trunk (core infra — app breaks or is unusable without it)";
    else if (f.tier === "core" || (f.tier === "supporting" && f.file_count >= median)) placement = "Branch (major functional area, extends the trunk)";
    else placement = "Leaf (small enhancement on a branch)";
    return { name: f.name, placement, file_count: f.file_count, category: f.category };
  });
}

const PERSONAS = {
  "End user": (f) => f.relevance * 0.6 + f.repeatability * 0.4,
  "Growth / marketing": (f) => (["search", "notification", "checkout", "ai", "analytics"].includes(f.category) ? f.relevance : f.relevance * 0.4) + f.repeatability * 0.2,
  "Security / compliance": (f) => (["auth", "payments", "database"].includes(f.category) ? 10 : 3) + (f.has_tests ? 0 : 2),
  "Engineering / platform": (f) => f.efficiency * 0.7 + f.relevance * 0.3
};

function buyAFeature(features) {
  if (!features.length) return { allocations: [], ranking: [], possible_overinvestment: [] };

  const personaTotals = {};
  const rawScores = {};
  Object.entries(PERSONAS).forEach(([persona, scorer]) => {
    personaTotals[persona] = 0;
    features.forEach((f) => {
      rawScores[f.name] = rawScores[f.name] || {};
      const value = Math.max(0, scorer(f));
      rawScores[f.name][persona] = value;
      personaTotals[persona] += value;
    });
  });

  const allocations = features.map((f) => {
    const personaBudgets = {};
    let total = 0;
    Object.keys(PERSONAS).forEach((persona) => {
      const denom = personaTotals[persona] || 1;
      const units = Math.round((100 * rawScores[f.name][persona]) / denom * 10) / 10;
      personaBudgets[persona] = units;
      total += units;
    });
    return { name: f.name, persona_budgets: personaBudgets, total_demand_units: Math.round(total * 10) / 10 };
  });

  const ranking = [...allocations].sort((a, b) => b.total_demand_units - a.total_demand_units);

  const overinvestment = [];
  const byFileCount = [...features].sort((a, b) => b.file_count - a.file_count);
  features.forEach((f) => {
    const demandRank = ranking.findIndex((a) => a.name === f.name);
    const effortRank = byFileCount.findIndex((x) => x.name === f.name);
    if (effortRank <= 1 && demandRank >= Math.max(3, features.length - 2)) {
      overinvestment.push(`\`${f.name}\` is among the most-built features (top file-count) but ranks near the bottom of simulated Buy-a-Feature demand (${f.category} category, market comparable: ${FEATURE_MARKET_PLAYBOOK[f.category].marketComparable}) — verify against real usage analytics before investing further.`);
    }
  });
  return { allocations, ranking, possible_overinvestment: overinvestment };
}

function evaluateTechAlternatives(inventory) {
  return TECH_ALTERNATIVE_RULES.filter((rule) => {
    try {
      return rule.detect(inventory);
    } catch {
      return false;
    }
  });
}

function classifyTestCoverage(inventory) {
  const testFiles = inventory.quality.tests.files || [];
  const foundTypes = {};
  TEST_TYPE_PATTERNS.forEach(([label]) => (foundTypes[label] = []));
  const unclassified = [];
  testFiles.forEach((path) => {
    const lower = path.toLowerCase();
    let matched = false;
    for (const [label, keywords] of TEST_TYPE_PATTERNS) {
      if (keywords.some((kw) => lower.includes(kw))) {
        foundTypes[label].push(path);
        matched = true;
        break;
      }
    }
    if (!matched) unclassified.push(path);
  });
  if (unclassified.length) foundTypes["unit (assumed, unlabeled)"] = unclassified;

  const missing = TEST_TYPE_PATTERNS.map(([label]) => label).filter((label) => !(foundTypes[label] || []).length);
  const byType = {};
  Object.entries(foundTypes).forEach(([k, v]) => {
    if (v.length) byType[k] = v.slice(0, 5);
  });
  return {
    by_type: byType,
    missing_types: missing,
    exploratory_note: "Exploratory and variability/edge-case testing cannot be verified from static file evidence; treat as unknown and recommend a manual exploratory pass regardless of automated coverage.",
    total_test_files: testFiles.length
  };
}

function bucketFor(score) {
  for (const [ceiling, key] of SCALE_BUCKETS) {
    if (score < ceiling) return key;
  }
  return "1m-to-100m";
}

function compositeScoreAndScale(scorecard, features, tagCounts) {
  const dimensionScores = scorecard.map((item) => item.score);
  let featureDepth, featureDepthNote;
  if (features.length) {
    featureDepth = Math.round((features.reduce((sum, f) => sum + f.composite, 0) / features.length) * 100) / 100;
    featureDepthNote = `Averaged across ${features.length} segmented features; evidence-based.`;
  } else {
    featureDepth = 5.0;
    featureDepthNote = "No segmentable features were found in the scan; neutral default score used.";
  }
  dimensionScores.push(featureDepth);

  const composite = Math.round((dimensionScores.reduce((a, b) => a + b, 0) / dimensionScores.length) * 100) / 100;
  const currentTier = bucketFor(composite);

  const uplift = Math.min(2.5, (tagCounts["fix-now"] || 0) * 0.3 + (tagCounts["fix-before-next-tier"] || 0) * 0.15);
  const projected = Math.round(Math.min(10.0, composite + uplift) * 100) / 100;
  const projectedTier = bucketFor(projected);

  const triggered = features.filter((f) => f.category !== "generic" && FEATURE_MARKET_PLAYBOOK[f.category].efficiencyTier === "high");
  let tokenReductionPct = 0;
  let tokenNote;
  if (triggered.length) {
    const filesBefore = triggered.reduce((sum, f) => sum + f.file_count, 0);
    const managedFootprint = 3 * triggered.length;
    tokenReductionPct = Math.max(0, Math.round(100 * (1 - managedFootprint / Math.max(filesBefore, managedFootprint + 1))));
    const categories = Array.from(new Set(triggered.map((f) => f.category))).sort().join(", ");
    tokenNote = `Estimated from static evidence only: ${triggered.length} feature(s) in high-leverage categories (${categories}) currently span ${filesBefore} files. A managed-service swap for those categories typically needs roughly 3 files each (~${managedFootprint} files total), an approximate ${tokenReductionPct}% reduction in the file surface an agentic coding tool must read/edit for the same outcome. This is a file-count proxy for context size, not a measured token count — actual savings depend on the coding agent and task.`;
  } else {
    tokenNote = "No high-leverage build-vs-buy category was detected with enough file evidence to estimate a token/context reduction.";
  }

  return {
    dimension_scores: dimensionScores,
    feature_depth_score: featureDepth,
    feature_depth_note: featureDepthNote,
    composite_score: composite,
    current_ready_tier: currentTier,
    projected_score_after_fixes: projected,
    projected_ready_tier: projectedTier,
    estimated_token_reduction_pct: tokenReductionPct,
    token_reduction_note: tokenNote
  };
}

function countTaskTags(tasks) {
  const counts = {};
  tasks.forEach((task) => {
    const match = task.match(/^- \[([^\]]+)\]/);
    if (match) counts[match[1]] = (counts[match[1]] || 0) + 1;
  });
  return counts;
}

function scoreInventory(inventory) {
  const arch = inventory.architecture;
  const infra = inventory.infra;
  const quality = inventory.quality;
  const hasFrontend = Boolean(arch.frontend.paths.length || arch.frontend.frameworks.length);
  const hasBackend = Boolean(arch.backend.paths.length || arch.backend.frameworks.length);
  const hasApi = Boolean(arch.api.routes.length);
  const hasDb = Boolean(arch.databases.length);
  const hasCi = Boolean(infra.ci_cd.length);
  const hasTests = Boolean(quality.tests.present);
  const hasLockfile = Boolean(quality.dependency_health.lockfiles.length);
  const hasEnvSample = Boolean(quality.security.env_samples_present);
  const committedEnv = Boolean(quality.security.committed_runtime_env_files.length);

  return [
    {
      category: "Architecture soundness",
      score: clamp(5 + Number(hasFrontend) + Number(hasBackend) + Number(hasApi) + Number(hasCi) - Number(inventory.repo.app_type === "ambiguous")),
      justification: evidence("Separation is inferred from frontend/backend/API file layout.", [...arch.frontend.paths.slice(0, 2), ...arch.backend.paths.slice(0, 2), ...arch.api.routes.slice(0, 2)], "Limited modularity evidence from file inventory."),
      standard: "Twelve-Factor codebase/config guidance and framework deployment docs favor clear app boundaries."
    },
    {
      category: "Code quality and maintainability",
      score: clamp(4 + Number(hasTests) + Number(quality.tests.coverage_signal) + Number(hasCi) + Math.min(Math.floor(inventory.files.count / 1000), 2)),
      justification: evidence("Maintainability score is driven by tests, coverage, CI, and project structure signals.", [...quality.tests.files.slice(0, 3), ...infra.ci_cd.slice(0, 2).map((item) => item.path)], "No strong test or CI signal was found in the scanned files."),
      standard: "Framework docs and common CI practice expect automated tests before scaling changes."
    },
    {
      category: "Security posture",
      score: clamp(6 + Number(quality.security.auth_signal.length > 0) + Number(hasEnvSample) - 3 * Number(committedEnv) - Number(quality.security.secret_like_filenames.length > 0)),
      justification: securityJustification(quality.security),
      standard: "OWASP Top 10/ASVS and Twelve-Factor config guidance: protect secrets, validate inputs, and make auth explicit."
    },
    {
      category: "Database design",
      score: clamp(5 + Number(hasDb) - Number(!hasDb) - Number(arch.databases.includes("SQLite") && hasBackend)),
      justification: arch.databases.length ? `Detected ${join(arch.databases)}; browser scan cannot prove indexes or N+1 safety without schema/query inspection.` : "No database/ORM dependency or schema signal was detected, so database design is under-specified.",
      standard: "PostgreSQL and major framework docs expect indexed access paths and production-suitable storage."
    },
    {
      category: "API design",
      score: clamp(5 + Number(hasApi) + Number(arch.api.frameworks.length > 0) - Number(!hasApi)),
      justification: evidence("API routes/frameworks were detected from conventional route files.", arch.api.routes.slice(0, 5), "No API route evidence was found; API design cannot be deeply assessed."),
      standard: "REST/framework conventions favor explicit route structure, validation, and rate limits."
    },
    {
      category: "Dependency health",
      score: clamp(5 + Number(hasLockfile) + Math.min(quality.dependency_health.manifest_count, 2) - Number(!hasLockfile)),
      justification: hasLockfile ? `Dependency manifests detected (${join(inventory.stack.manifests.slice(0, 3))}) with lockfile(s): ${join(quality.dependency_health.lockfiles.slice(0, 3))}.` : `Dependency manifests detected (${join(inventory.stack.manifests.slice(0, 3)) || "none"}), but no lockfile was found.`,
      standard: "Package-manager lockfiles and ecosystem audit tools are baseline supply-chain hygiene."
    }
  ];
}

function renderApp(inventory, analysis, report, agentPrompt, inputs) {
  emptyState.classList.add("hidden");
  overviewContent.classList.remove("hidden");
  document.querySelector("#detected-app").textContent = `${inventory.repo.app_type}; ${join(inventory.stack.frameworks) || "no major framework detected"}`;
  document.querySelector("#ready-tier").textContent = readyTier(analysis.scores);
  document.querySelector("#first-bottleneck").textContent = firstBottleneck(inventory);
  renderScores(analysis.scores);
  renderScaleTable(inputs.currentHost);
  inventoryJson.textContent = JSON.stringify(inventory, null, 2);
  reportMarkdown.textContent = report;
  renderTasks(analysis.tasks);
  if (agentPromptMarkdown) agentPromptMarkdown.textContent = agentPrompt;
  renderBusinessAndFeatures(analysis);
  renderFrameworkPanel(analysis);
}

function renderBusinessAndFeatures(analysis) {
  if (businessContent) {
    const ctx = analysis.businessContext;
    let liveHtml;
    if (ctx.live_search_evidence && ctx.live_search_evidence.results.length) {
      liveHtml = `
        <h4>Live SERP evidence (Bright Data)</h4>
        <p class="note">For "${escapeHtml(ctx.live_search_evidence.query)}" — verify relevance yourself before treating any of these as a confirmed competitor:</p>
        <ul>${ctx.live_search_evidence.results.slice(0, 5).map((item) => `<li><strong>${escapeHtml(item.source || item.title)}</strong> — <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener">${escapeHtml(item.title)}</a>: ${escapeHtml(item.description)}</li>`).join("")}</ul>
      `;
    } else if (ctx.live_search_attempted) {
      liveHtml = `<p class="note">Live SERP evidence: Bright Data returned no results, or the browser blocked the cross-origin request (CORS).</p>`;
    } else {
      liveHtml = `<p class="note">Live SERP evidence: not fetched. Fill in the Bright Data API key + zone fields to enable.</p>`;
    }
    businessContent.innerHTML = `
      <p><strong>Problem</strong> (${escapeHtml(ctx.confidence)} confidence): ${escapeHtml(ctx.problem_statement)}</p>
      <p><strong>Target customers:</strong> ${escapeHtml(ctx.target_customers)}</p>
      <p><strong>Industry / sub-domain:</strong> ${escapeHtml(ctx.industry)} / ${escapeHtml(ctx.sub_domain)}</p>
      <p><strong>Potential competitors:</strong> ${escapeHtml(join(ctx.potential_competitors) || "none surfaced from static evidence")}</p>
      <p class="note">Inferred from README/description/keyword text and dependency signals only — verify with the product owner.</p>
      ${liveHtml}
    `;
  }
  if (featureList) {
    featureList.innerHTML = "";
    if (!analysis.features.length) {
      featureList.innerHTML = "<p>No segmentable product features were found from route/page/component file layout.</p>";
    } else {
      analysis.features.forEach((f) => {
        const row = document.createElement("article");
        row.className = "feature-card";
        row.innerHTML = `
          <h4>\`${escapeHtml(f.name)}\` <span class="note">(${escapeHtml(f.category)})</span></h4>
          <p>Relevance ${f.relevance}/10 · Repeatability ${f.repeatability}/10 · Efficiency ${f.efficiency}/10 · Composite ${f.composite}</p>
          <p class="note">${escapeHtml(f.risk_if_missing)}</p>
        `;
        featureList.appendChild(row);
      });
    }
  }
}

function renderFrameworkPanel(analysis) {
  if (!frameworkContent) return;
  const choice = analysis.frameworkChoice;
  const applied = analysis.frameworkApplied;
  let rowsHtml = "";
  if (applied.rows.length) {
    rowsHtml = `
      <table>
        <thead><tr><th>Feature</th><th>${escapeHtml(applied.rows[0].framework_label)}</th></tr></thead>
        <tbody>
          ${applied.rows.map((r) => `<tr><td>\`${escapeHtml(r.name)}\`</td><td>${escapeHtml(String(r.framework_score))}</td></tr>`).join("")}
        </tbody>
      </table>
    `;
  }
  const changes = applied.recommended_changes.length
    ? `<ul>${applied.recommended_changes.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}</ul>`
    : "<p>No re-prioritization changes recommended.</p>";
  frameworkContent.innerHTML = `
    <p><strong>Framework selected: ${escapeHtml(choice.framework)}.</strong> ${escapeHtml(choice.reasoning)}</p>
    ${rowsHtml}
    <h4>Recommended re-prioritization changes</h4>
    ${changes}
    <h4>Composite benchmark</h4>
    <p>Score ${analysis.composite.composite_score}/10 → \`${analysis.composite.current_ready_tier}\`. Projected after fixes: ${analysis.composite.projected_score_after_fixes}/10 → \`${analysis.composite.projected_ready_tier}\`.</p>
    <p class="note">${escapeHtml(analysis.composite.token_reduction_note)}</p>
  `;
}

function renderScores(scores) {
  scoreGrid.innerHTML = "";
  scores.forEach((item) => {
    const article = document.createElement("article");
    article.className = "score-card";
    const tone = item.score >= 7 ? "good" : item.score >= 5 ? "warn" : "bad";
    const toneLabel = tone === "good" ? "Solid" : tone === "warn" ? "Watch" : "At risk";
    article.innerHTML = `
      <div class="score-top">
        <h3>${escapeHtml(item.category)}</h3>
        <div class="gauge ${tone}" style="--pct:${item.score * 10}">
          <span class="gauge-value">${item.score}</span>
          <span class="gauge-max">/10</span>
        </div>
      </div>
      <span class="tone-label ${tone}">${toneLabel}</span>
      <p>${escapeHtml(item.justification)}</p>
      <span class="standard">${escapeHtml(item.standard)}</span>
    `;
    scoreGrid.appendChild(article);
  });
}

function renderScaleTable(currentHost) {
  scaleTable.innerHTML = `
    <thead>
      <tr>
        <th>Tier</th>
        <th>Users/load</th>
        <th>Est. monthly cost</th>
        <th>Likely first bottleneck</th>
        <th>Minimum fix</th>
        <th>Cost unit</th>
      </tr>
    </thead>
    <tbody>
      ${TIER_ESTIMATES.map((tier) => `
        <tr>
          <td>${tier.label}</td>
          <td>${escapeHtml(tier.usersLoad)}</td>
          <td>${escapeHtml(tier.monthlyCost)} as of ${today}${currentHost ? ` (${escapeHtml(currentHost)} noted)` : ""}</td>
          <td>${escapeHtml(tier.bottleneck)}</td>
          <td>${escapeHtml(tier.minimumFix)}</td>
          <td>${escapeHtml(tier.costUnit)}</td>
        </tr>
      `).join("")}
    </tbody>
  `;
}

function renderTasks(tasks) {
  taskList.innerHTML = "";
  tasks.forEach((task) => {
    const item = document.createElement("div");
    item.className = "task-item";
    item.innerHTML = escapeHtml(task).replace(/^\- \[([^\]]+)\]/, "<strong>[$1]</strong>");
    taskList.appendChild(item);
  });
}

function renderMarkdownReport(inventory, analysis, inputs) {
  const { scores, tasks } = analysis;
  const frameworks = join(inventory.stack.frameworks) || "no major framework detected";
  const dbs = join(inventory.architecture.databases) || "no database signal detected";
  const budgetSentence = inputs.budget ? ` The stated budget ceiling is $${Number(inputs.budget).toLocaleString()}/month, so compare that against the tier rows before upgrading managed services.` : "";
  const targetSentence = inputs.targetScale ? ` The requested target tier is \`${inputs.targetScale}\`; tasks below prioritize reaching that tier.` : "";
  const warnings = inventory.repo.warnings.length ? ` ${inventory.repo.warnings.join(" ")}` : "";
  const summary = `This repository was classified as ${inventory.repo.app_type} with ${frameworks}; database evidence: ${dbs}. Based on static repository evidence, it looks architecturally ready for roughly the ${readyTier(scores)} stage, not hyperscale. The first likely break point is ${firstBottleneck(inventory)}. The cost numbers below are estimated ranges, not quotes, because exact spend depends on traffic shape, region, data transfer, and managed-service plan choices. The strongest immediate improvements are the ones that create proof: tests, CI, explicit env samples, dependency audits, database indexes, caching, and rate limits.${warnings}${budgetSentence}${targetSentence}`;

  return [
    "# Stack Auditor Report",
    `Audited repo: ${inventory.repo.full_name || `${inventory.repo.owner}/${inventory.repo.name}`} on branch/tag \`${inventory.repo.branch}\``,
    "## Executive summary",
    summary,
    "## 1. Business context",
    businessContextSection(analysis.businessContext),
    "## 2. Product feature inventory & ranking",
    featureRankingSection(analysis.features),
    "## 3. Prioritization framework",
    frameworkSection(analysis.frameworkChoice, analysis.frameworkApplied),
    "## 4. Product Tree & Buy-a-Feature (trajectory / ROI)",
    productTreeSection(analysis.tree, analysis.baf),
    "## 5-9. Technical deep dive & tooling benchmark",
    techDeepDiveSection(inventory, analysis.features, analysis.techAlternatives, analysis.testTaxonomy),
    "## Tech stack & code quality scorecard",
    markdownScoreTable(scores),
    "## Scalability/cost table",
    markdownScaleTable(),
    "## Infrastructure efficiency notes",
    infraNotes(inventory),
    "## Security posture benchmark",
    securityBenchmarkSection(inventory),
    "## 10. Composite benchmark score & scale readiness",
    compositeSection(analysis.composite, analysis.tagCounts),
    "## Remediation task list",
    tasks.join("\n"),
    "## Sources consulted",
    SOURCES.map(([name, url]) => `- ${name}: ${url} (accessed ${today})`).join("\n")
  ].join("\n\n") + "\n";
}

function businessContextSection(ctx) {
  const lines = [
    `- **Problem statement** (${ctx.confidence} confidence): ${ctx.problem_statement}`,
    `- **Target customers** (inferred): ${ctx.target_customers}`,
    `- **Industry** (inferred): ${ctx.industry}`,
    `- **Sub-domain** (inferred): ${ctx.sub_domain}`,
    `- **Potential competitors** (curated static mapping, not a market study): ${join(ctx.potential_competitors) || "none surfaced from static evidence"}`,
    `- Evidence used: README found=${ctx.evidence.readme_found}, package description found=${ctx.evidence.package_description_found}, keyword count=${ctx.evidence.keyword_count}, industry keyword hits=${ctx.evidence.industry_keyword_hits}.`,
    "- This section is inferred from README/package-description/keyword text and dependency signals only. Treat it as a starting hypothesis to verify with the product owner, not a market-research finding."
  ];
  lines.push(...liveSearchEvidenceLines(ctx));
  return lines.join("\n");
}

function liveSearchEvidenceLines(ctx) {
  if (ctx.live_search_evidence && ctx.live_search_evidence.results.length) {
    const lines = [`\n**Live SERP evidence (Bright Data)** for "${ctx.live_search_evidence.query}" — real search results, source-labeled by Bright Data's parser; verify relevance yourself before treating any of these as a confirmed competitor:`];
    ctx.live_search_evidence.results.slice(0, 5).forEach((item) => lines.push(`  - **${item.source || item.title}** — [${item.title}](${item.link}): ${item.description}`));
    return lines;
  }
  if (ctx.live_search_attempted) {
    return ["\n- Live SERP evidence: Bright Data was configured but returned no results (or the browser blocked the cross-origin request — CORS restrictions can prevent this call from a static page)."];
  }
  return ["\n- Live SERP evidence: not fetched (fill in the Bright Data API key + zone fields to enable)."];
}

function featureRankingSection(features) {
  if (!features.length) {
    return "No segmentable product features were found from route/page/component file layout. This usually means the repo is a library, a very small app, or uses an unconventional file structure this scanner doesn't recognize.";
  }
  const rows = [
    "| Feature | Category | Relevance (core-logic dependency) | Repeatability (file-touchpoint proxy) | Efficiency (build-vs-buy leverage) | Composite | Risk if missing |",
    "|---|---|---:|---:|---:|---:|---|"
  ];
  features.forEach((f) => rows.push(`| \`${f.name}\` | ${f.category} | ${f.relevance}/10 | ${f.repeatability}/10 | ${f.efficiency}/10 | ${f.composite} | ${f.risk_if_missing} |`));
  const note = "\nRelevance answers \"is core logic non-implementable without it, and how much effort/risk would replacing it cost\". Repeatability is a static proxy (file-touchpoint count across the codebase), not real navigation telemetry — verify against product analytics. Efficiency reflects build-vs-buy leverage from `reference/feature_market_playbook.md`.";
  return rows.join("\n") + "\n" + note;
}

function frameworkSection(choice, applied) {
  const lines = [`**Framework selected: ${choice.framework}.** ${choice.reasoning}`];
  if (choice.runners_up.length) lines.push(`Runner-up frameworks considered: ${join(choice.runners_up)}.`);
  if (applied.rows.length) {
    lines.push("");
    lines.push(`| Feature | ${applied.rows[0].framework_label} |`);
    lines.push("|---|---:|");
    applied.rows.forEach((row) => lines.push(`| \`${row.name}\` | ${row.framework_score} |`));
  }
  if (applied.recommended_changes.length) {
    lines.push("\n**Recommended re-prioritization changes:**");
    applied.recommended_changes.forEach((c) => lines.push(`- ${c}`));
  } else {
    lines.push("\nNo re-prioritization changes are recommended — current file-count-implied investment roughly tracks the framework's ranking.");
  }
  return lines.join("\n");
}

function productTreeSection(tree, baf) {
  if (!tree.length) return "No features were available to place on a Product Tree or run through Buy-a-Feature.";
  const lines = ["### Product Tree placement", "", "| Feature | Placement | Category |", "|---|---|---|"];
  tree.forEach((item) => lines.push(`| \`${item.name}\` | ${item.placement} | ${item.category} |`));
  lines.push("", "### Buy-a-Feature (simulated persona demand, ROI signal)", "");
  lines.push("Four personas (End user, Growth/marketing, Security/compliance, Engineering/platform) each allocate a 100-unit hypothetical budget across features by simulated interest. This is a static-evidence simulation, not real user research.");
  lines.push("");
  lines.push("| Feature | Total demand units | End user | Growth/marketing | Security/compliance | Engineering/platform |");
  lines.push("|---|---:|---:|---:|---:|---:|");
  baf.ranking.forEach((row) => {
    const pb = row.persona_budgets;
    lines.push(`| \`${row.name}\` | ${row.total_demand_units} | ${pb["End user"]} | ${pb["Growth / marketing"]} | ${pb["Security / compliance"]} | ${pb["Engineering / platform"]} |`);
  });
  if (baf.possible_overinvestment.length) {
    lines.push("\n**Honest call-outs (possible over-investment relative to simulated demand):**");
    baf.possible_overinvestment.forEach((note) => lines.push(`- ${note}`));
  }
  return lines.join("\n");
}

function techDeepDiveSection(inventory, features, techAlternatives, testTaxonomy) {
  const lines = ["### Per-feature technical mapping"];
  if (features.length) {
    lines.push("");
    lines.push("| Feature | Layers touched | Files | Tests found | Evidence paths |");
    lines.push("|---|---|---:|---|---|");
    features.forEach((f) => lines.push(`| \`${f.name}\` | ${join(f.layers) || "unknown"} | ${f.file_count} | ${f.has_tests ? "yes" : "no"} | ${join(f.evidence_paths)} |`));
  } else {
    lines.push("No features segmented; see stack scorecard below for whole-repo signal instead.");
  }

  lines.push("\n### Architecture, frontend, and backend/database tooling benchmark");
  if (techAlternatives.length) {
    lines.push("");
    lines.push("| Area | Signal | Fits at | Breaks at | Recommended alternative | Why it reduces agent token/context load |");
    lines.push("|---|---|---|---|---|---|");
    techAlternatives.forEach((rule) => lines.push(`| ${rule.area} | ${rule.signal} | ${rule.fitsAt} | ${rule.breaksAt} | ${rule.alternative} | ${rule.tokenNote} |`));
  } else {
    lines.push("\nNo tooling-alternative triggers fired against `reference/tech_alternatives.md` — no evidence-backed swap to recommend from this static scan.");
  }

  lines.push("\n### Test coverage benchmark");
  if (testTaxonomy.total_test_files) {
    lines.push(`\n${testTaxonomy.total_test_files} test file(s) found. Classified by conventional test type (filename/path heuristic):\n`);
    lines.push("| Test type | Example files |");
    lines.push("|---|---|");
    Object.entries(testTaxonomy.by_type).forEach(([label, sample]) => lines.push(`| ${label} | ${join(sample)} |`));
    if (testTaxonomy.missing_types.length) {
      lines.push(`\n**Missing test types (no file-naming evidence found):** ${join(testTaxonomy.missing_types)}.`);
    }
  } else {
    lines.push("\nNo test files were found at all. Unit, integration, sanity, and regression coverage are all unverified.");
  }
  lines.push(`\n${testTaxonomy.exploratory_note}`);
  return lines.join("\n");
}

function securityBenchmarkSection(inventory) {
  const security = inventory.quality.security;
  const arch = inventory.architecture;
  const ports = join(security.exposed_ports.map((p) => `${p.port}${p.service ? ` (${p.service})` : ""} in ${p.path}`)) || "none detected";
  const secretHits = join(security.secret_scan_hits.map((h) => `${h.pattern} in ${h.path}`)) || "none detected";
  return [
    `- **Auth**: ${join(security.auth_signal) || "no auth library/dependency detected"}.`,
    `- **Env samples**: ${security.env_samples_present ? "present" : "not found"}; **committed runtime env files** (risk if secrets are inside): ${join(security.committed_runtime_env_files) || "none detected"}.`,
    `- **External/third-party APIs used**: ${join(arch.third_party_services) || "none detected"}.`,
    `- **CORS dependency**: ${join(security.cors_signal) || "none detected"}. **Rate-limit dependency**: ${join(security.rate_limit_signal) || "none detected"}.`,
    `- **System ports exposed** (Dockerfile \`EXPOSE\` / compose port mappings): ${ports}`,
    `- **Secret-management evidence**: secret-like filenames: ${join(security.secret_like_filenames) || "none"}; grep-based high-signal secret pattern hits (AWS/Stripe/Google/private-key/Slack/GitHub token formats only, not a full scanner): ${secretHits}`,
    "- This is a static, non-exploitative check (regex pattern match + dependency/file presence only). It is not a substitute for a dedicated secret scanner (gitleaks/trufflehog), SAST tool, or a real penetration test."
  ].join("\n");
}

function compositeSection(composite, tagCounts) {
  return [
    `- **Composite benchmark score**: ${composite.composite_score}/10 (scorecard dimensions + feature-depth score ${composite.feature_depth_score}/10 — ${composite.feature_depth_note}).`,
    `- **Current user-scale readiness**: \`${composite.current_ready_tier}\` (${TIER_USERS_LOAD[composite.current_ready_tier]}).`,
    `- **Projected score after fix-now/fix-before-next-tier remediation**: ${composite.projected_score_after_fixes}/10 → projected readiness \`${composite.projected_ready_tier}\` (${TIER_USERS_LOAD[composite.projected_ready_tier]}), based on ${tagCounts["fix-now"] || 0} fix-now and ${tagCounts["fix-before-next-tier"] || 0} fix-before-next-tier task(s) in the remediation list below.`,
    `- **Estimated agent token/context reduction from recommended swaps**: ~${composite.estimated_token_reduction_pct}%. ${composite.token_reduction_note}`
  ].join("\n");
}

function renderAgentPromptMarkdown(inventory, analysis, inputs) {
  const repo = inventory.repo;
  const ctx = analysis.businessContext;
  const lines = [
    "# Agent task: implement Stack Auditor recommendations",
    "",
    "You are an agentic coding IDE (Claude Code, Codex, or similar) picking up the output of a " +
      "static repository audit. Everything below is already-decided analysis — do not re-derive it. " +
      "Your job is to implement the changes. Work in priority order (fix-now, then fix-before-next-tier, " +
      "then future-proofing). Install any packages you need yourself instead of asking. Batch your reads " +
      "and edits per task (open each affected file once, make all edits for that task, then move to the " +
      "next task) to minimize tool calls before producing your final summary. Preserve existing behavior " +
      "and add or update tests for any changed path. If a task cannot be verified from this repo, say so " +
      "explicitly in your final summary instead of guessing.",
    "",
    `Repo: \`${repo.source}\` (branch: \`${repo.branch || "default"}\`), classified as ${repo.app_type}.`,
    "",
    "## Business context (inferred, verify with product owner if it matters for a decision)",
    `- Problem: ${ctx.problem_statement}`,
    `- Target customers: ${ctx.target_customers}`,
    `- Industry / sub-domain: ${ctx.industry} / ${ctx.sub_domain}`,
    `- Confidence: ${ctx.confidence}`,
    "",
    `## Prioritization framework in use: ${analysis.frameworkChoice.framework}`,
    analysis.frameworkChoice.reasoning
  ];

  if (analysis.frameworkApplied.recommended_changes.length) {
    lines.push("\nRe-prioritization changes to reflect in backlog/issue tracker (not code):");
    analysis.frameworkApplied.recommended_changes.forEach((c) => lines.push(`- ${c}`));
  }

  if (analysis.techAlternatives.length) {
    lines.push("\n## Technical swaps to implement (install packages as needed)");
    analysis.techAlternatives.forEach((rule) => lines.push(`- **${rule.area}**: ${rule.signal} → ${rule.alternative}. ${rule.tokenNote}`));
  }

  lines.push("\n## Task list (do these, in order)");
  analysis.tasks.forEach((task) => lines.push(task));

  const composite = analysis.composite;
  lines.push(
    "",
    "## Success criteria",
    `- Composite benchmark score before: ${composite.composite_score}/10 (\`${composite.current_ready_tier}\` readiness).`,
    `- Target after this pass: ${composite.projected_score_after_fixes}/10 (\`${composite.projected_ready_tier}\` readiness).`,
    "- Re-run the Stack Auditor (CLI or web tool) after your changes to confirm the fix-now items no longer appear in the remediation list.",
    "",
    "## Constraints",
    "- Do not fabricate pricing, benchmark, or capacity numbers; if you need one, cite a source or label it estimated.",
    "- Keep diffs scoped to the tasks above; do not refactor unrelated code.",
    "- Minimize tool calls: prefer one pass of reads before a batch of edits per task over interleaving many small reads and edits."
  );
  return lines.join("\n") + "\n";
}

function markdownScoreTable(scores) {
  const rows = ["| Category | Score | One-line justification | Standard/convention applied |", "|---|---:|---|---|"];
  scores.forEach((item) => rows.push(`| ${item.category} | ${item.score}/10 | ${item.justification} | ${item.standard} |`));
  return rows.join("\n");
}

function markdownScaleTable() {
  const rows = ["| Tier | Users/load definition | Est. monthly cost | Likely first bottleneck | Minimum fix | Cost unit |", "|---|---|---|---|---|---|"];
  TIER_ESTIMATES.forEach((tier) => rows.push(`| ${tier.label} | ${tier.usersLoad} | ${tier.monthlyCost} as of ${today} | ${tier.bottleneck} | ${tier.minimumFix} | ${tier.costUnit} |`));
  return rows.join("\n");
}

function infraNotes(inventory) {
  const signals = inventory.infra.signals.map((item) => `${item.type} (${item.path})`).join(", ") || "none detected";
  const cdn = inventory.infra.signals.some((item) => ["Vercel", "Netlify"].includes(item.type)) ? "Vercel/Netlify-style edge hosting signal detected" : "no explicit CDN/edge caching config detected";
  const stateless = inventory.architecture.background_jobs.length ? "background jobs are present; verify workers are separate from request handlers" : "likely stateless from repository signals";
  const dbNote = join(inventory.architecture.databases) || "no database detected, so query cost/indexing cannot be evaluated from repo evidence";
  return [
    `- Hosting/infra signals: ${signals}.`,
    "- Compute efficiency: unknown until runtime metrics exist; start right-sized at tiers 0 -> 100 and autoscale only after CPU/memory/request metrics justify it.",
    `- Data layer efficiency: ${dbNote}; assume low cache hit rate until CDN/server cache configuration is visible.`,
    "- Latency under load: not benchmarked by this static tool; add load tests before the 100 -> 10K tier.",
    `- Horizontal scaling readiness: ${stateless}; verify file uploads, sessions, and scheduled jobs do not rely on local disk or a single instance.`,
    `- CDN/edge caching: ${cdn}.`,
    "- Autoscaling configuration: no autoscaling proof unless Terraform/Pulumi/cloud config explicitly defines it."
  ].join("\n");
}

function remediationTasks(inventory, scores, targetScale) {
  const tasks = [];
  const arch = inventory.architecture;
  const infra = inventory.infra;
  const quality = inventory.quality;
  if (quality.security.committed_runtime_env_files.length) {
    tasks.push("- [fix-now] Remove committed runtime env files from version control, add sanitized `.env.example`, rotate any exposed secrets, and document required variables. Likely files: `.env*`, README/deploy docs. Benefit: reduces credential leakage risk and matches OWASP/Twelve-Factor config guidance.");
  }
  if (!quality.tests.present) {
    tasks.push("- [fix-now] Add a minimal automated test suite for the highest-risk user flows and wire it into CI. Likely files: `tests/`, `__tests__/`, `.github/workflows/*`. Benefit: lets future Codex changes catch regressions before scaling work.");
  }
  if (!infra.ci_cd.length) {
    tasks.push("- [fix-now] Add CI that installs dependencies, runs lint/type checks, runs tests, and builds the app on every pull request. Likely files: `.github/workflows/ci.yml`, package/test config. Benefit: improves maintainability and deploy confidence.");
  }
  if (!quality.dependency_health.lockfiles.length) {
    tasks.push("- [fix-now] Commit the ecosystem lockfile and add a dependency audit command to CI (`npm audit`, `pip-audit`, `bundler audit`, or equivalent). Likely files: lockfile plus CI workflow. Benefit: repeatable installs and visible supply-chain risk.");
  }
  if (arch.databases.length && !arch.databases.includes("SQLite")) {
    tasks.push("- [fix-before-next-tier] Identify the top read/write queries, add indexes for common filters/joins, and add regression tests for N+1 query paths. Likely files: migrations/schema files, ORM models, API handlers. Benefit: delays the first database bottleneck at the 100 -> 10K tier.");
  } else if (arch.databases.includes("SQLite")) {
    tasks.push("- [fix-before-next-tier] Plan migration from SQLite to managed Postgres before multi-user production traffic. Likely files: database config, migrations, deployment env. Benefit: safer concurrency, backups, and operational tooling.");
  } else {
    tasks.push("- [fix-before-next-tier] Make the data model explicit: document the chosen database, schema ownership, backup policy, and indexing plan. Likely files: schema/migration directory, README, deployment docs. Benefit: prevents hidden data-layer cost and reliability surprises.");
  }
  if (!arch.background_jobs.length) {
    tasks.push("- [fix-before-next-tier] Move slow email, payment webhook, AI, file-processing, or notification work out of request handlers into a queue/worker. Likely files: API route handlers, worker module, queue config. Benefit: keeps request latency stable as traffic grows.");
  }
  tasks.push("- [fix-before-next-tier] Add request validation, rate limiting, and structured error responses to public API endpoints. Likely files: API routes/controllers/middleware. Benefit: protects app servers and databases from accidental or abusive traffic spikes.");
  tasks.push("- [future-proofing] Add CDN/cache headers for static assets and read-heavy public pages, then measure cache hit rate. Likely files: framework config, route handlers, hosting config such as `vercel.json`/`netlify.toml`. Benefit: lowers per-request compute cost.");
  tasks.push("- [future-proofing] Add basic observability: request latency, error rate, database query latency, queue depth, and monthly cost dashboard. Likely files: app middleware, logging config, hosting/provider dashboards. Benefit: makes scale and spend decisions evidence-based.");
  if (["10k-to-1m", "1m-to-100m"].includes(targetScale)) {
    tasks.push("- [future-proofing] Run a load test for the target tier and record p50/p95 latency, saturation point, and cost assumptions in the repo. Likely files: `tests/load/`, docs, CI/manual runbook. Benefit: replaces rough estimates with measured capacity.");
  }
  return tasks;
}

async function fetchManifest(owner, repo, branch, path, token) {
  const text = await fetchFileText(owner, repo, branch, path, token);
  return parseManifest(path, text);
}

async function fetchFileText(owner, repo, branch, path, token) {
  try {
    const data = await githubJson(`https://api.github.com/repos/${owner}/${repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`, token);
    return decodeBase64(data.content || "");
  } catch (error) {
    if (token) throw error;
    return fetchRawFile(owner, repo, branch, path);
  }
}

async function fetchRawFile(owner, repo, branch, path) {
  const url = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${encodePath(path)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("GitHub API rate limit or permission error while reading a file. Add a token and try again.");
  }
  return response.text();
}

function parseManifest(path, text) {
  const name = basename(path);
  const manifest = { path, dependencies: {} };
  if (name === "package.json") {
    try {
      const data = JSON.parse(text);
      ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"].forEach((key) => Object.assign(manifest.dependencies, data[key] || {}));
      manifest.scripts = data.scripts || {};
      manifest.name = data.name || "";
      manifest.description = data.description || "";
      manifest.keywords = data.keywords || [];
    } catch {
      manifest.error = "invalid package.json";
    }
  } else if (name === "requirements.txt") {
    text.split(/\r?\n/).forEach((line) => {
      const clean = line.trim();
      if (!clean || clean.startsWith("#")) return;
      const dep = clean.split(/[<>=~!;\[]/)[0].trim().toLowerCase();
      if (dep) manifest.dependencies[dep] = clean;
    });
  } else if (name === "pyproject.toml") {
    const descMatch = text.match(/(?:^|\n)\s*description\s*=\s*"([^"]+)"/);
    manifest.description = descMatch ? descMatch[1] : "";
    const kwMatch = text.match(/(?:^|\n)\s*keywords\s*=\s*\[([^\]]*)\]/s);
    manifest.keywords = kwMatch ? [...kwMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]) : [];
    [...text.matchAll(/"([A-Za-z0-9_.-]+)(?:[<>=~!][^"]*)?"/g)].forEach((match) => {
      manifest.dependencies[match[1].toLowerCase()] = match[0].replaceAll('"', "");
    });
  } else {
    text.split(/\r?\n/).forEach((line) => {
      const clean = line.trim();
      const match = clean.match(/(?:gem ['"]([^'"]+)|([A-Za-z0-9_.@/-]+)\s*[:=])/);
      if (match) manifest.dependencies[(match[1] || match[2]).toLowerCase()] = clean;
    });
  }
  return manifest;
}

function manifestPaths(files) {
  const names = new Set(["package.json", "requirements.txt", "pyproject.toml", "Pipfile", "poetry.lock", "Gemfile", "go.mod", "Cargo.toml", "composer.json", "pubspec.yaml"]);
  return files.filter((path) => names.has(basename(path)));
}

function detectInfra(files) {
  const signals = [];
  files.forEach((path) => {
    const name = basename(path);
    if (name === "Dockerfile" || name.endsWith(".Dockerfile")) signals.push({ type: "Dockerfile", path });
    if (["docker-compose.yml", "docker-compose.yaml"].includes(name)) signals.push({ type: "Docker Compose", path });
    if (path.includes(".github/workflows/")) signals.push({ type: "GitHub Actions", path });
    if (name === "vercel.json") signals.push({ type: "Vercel", path });
    if (name === "netlify.toml") signals.push({ type: "Netlify", path });
    if (name.endsWith(".tf")) signals.push({ type: "Terraform", path });
    if (path.toLowerCase().includes("pulumi")) signals.push({ type: "Pulumi", path });
    if (["serverless.yml", "serverless.yaml"].includes(name)) signals.push({ type: "Serverless Framework", path });
  });
  return uniqueSignals(signals);
}

function detectTests(files, manifests) {
  const testFiles = files.filter((path) => basename(path).toLowerCase().includes("test") || path.includes("/tests/") || path.startsWith("tests/"));
  const scripts = manifests.flatMap((manifest) => manifest.scripts?.test ? [{ path: manifest.path, script: manifest.scripts.test }] : []);
  return {
    present: Boolean(testFiles.length || scripts.length),
    files: testFiles.slice(0, 50),
    scripts,
    coverage_signal: files.some((path) => path.toLowerCase().includes("coverage")) || scripts.some((item) => item.script.includes("coverage"))
  };
}

function detectSecurity(files, envFiles, auth, cors = [], rateLimit = [], exposedPorts = [], secretHits = []) {
  return {
    auth_signal: auth,
    env_samples_present: envFiles.some((path) => path.toLowerCase().includes("example") || path.toLowerCase().includes("sample")),
    committed_runtime_env_files: envFiles.filter((path) => [".env", ".env.local", ".env.production"].includes(basename(path))),
    secret_like_filenames: files.filter((path) => /(secret|credential|service-account|private-key)/i.test(path)).slice(0, 20),
    cors_signal: cors,
    rate_limit_signal: rateLimit,
    exposed_ports: exposedPorts,
    secret_scan_hits: secretHits
  };
}

function stripAllSuffixes(name) {
  let stem = name;
  while (true) {
    const idx = stem.lastIndexOf(".");
    if (idx <= 0) break;
    stem = stem.slice(0, idx);
  }
  return stem;
}

function segmentFeatures(files, testFiles, frameworks) {
  const hasFrontendFramework = frameworks.some((f) => FRONTEND_FRAMEWORKS.has(f));
  const roots = FEATURE_ROOTS.filter(([prefix]) => !["app/", "pages/", "components/"].includes(prefix) || hasFrontendFramework);
  const groups = new Map();

  files.forEach((rel) => {
    for (const [prefix, layer] of roots) {
      if (!rel.startsWith(prefix)) continue;
      const remainder = rel.slice(prefix.length);
      const parts = remainder.split("/");
      const head = parts[0];
      let name = (parts.length === 1 ? stripAllSuffixes(head) : head).toLowerCase();
      name = name.replace(/^[[(].*[\])]$/, "");
      if (!name || NOISE_FEATURE_NAMES.has(name) || name.startsWith("_") || name.startsWith(".")) break;
      if (!groups.has(name)) groups.set(name, { name, paths: new Set(), layers: new Set() });
      const entry = groups.get(name);
      entry.paths.add(rel);
      entry.layers.add(layer);
      break;
    }
  });

  const features = Array.from(groups.values()).map((entry) => {
    const paths = Array.from(entry.paths).sort();
    const hasTests = testFiles.some((t) => t.toLowerCase().includes(entry.name));
    return {
      name: entry.name,
      paths: paths.slice(0, 12),
      file_count: paths.length,
      layers: Array.from(entry.layers).sort(),
      has_tests: hasTests
    };
  });
  features.sort((a, b) => b.file_count - a.file_count);
  return features.slice(0, 20);
}

function detectFrontend(files, frameworks) {
  const frontendFrameworks = frameworks.filter((name) => ["Next.js", "React", "Vue", "Nuxt", "Svelte", "Angular"].includes(name));
  const paths = files.filter((path) => /^(pages|app|src|components)\//.test(path) && [".js", ".jsx", ".ts", ".tsx", ".vue", ".svelte"].some((suffix) => path.endsWith(suffix))).slice(0, 100);
  return { frameworks: frontendFrameworks, paths };
}

function detectApi(files, frameworks) {
  const routes = files.filter((path) => path.startsWith("pages/api/") || path.startsWith("app/api/") || path.includes("/routes/") || path.endsWith("urls.py") || path.endsWith("views.py") || path.includes("controllers")).slice(0, 100);
  return {
    style: routes.length ? "REST-like routes inferred from file layout" : "no API route evidence found",
    routes,
    frameworks: frameworks.filter((name) => ["Express", "FastAPI", "Django", "Flask", "NestJS", "Next.js"].includes(name))
  };
}

function detectBackend(files, frameworks, api) {
  const paths = files.filter((path) => /^(api|server|backend|app)\//.test(path) || ["manage.py", "settings.py", "urls.py"].includes(basename(path)));
  return {
    frameworks: frameworks.filter((name) => ["Express", "FastAPI", "Django", "Flask", "NestJS"].includes(name)),
    paths: Array.from(new Set([...paths, ...api.routes])).slice(0, 100)
  };
}

function classifyApp(files, frameworks, manifests) {
  if (frameworks.some((name) => ["Next.js", "React", "Vue", "Nuxt", "Svelte", "Angular"].includes(name))) {
    if (frameworks.some((name) => ["Express", "FastAPI", "Django", "Flask"].includes(name)) || files.some((path) => path.startsWith("pages/api/") || path.includes("/api/"))) {
      return "web app (full-stack or hybrid)";
    }
    return "web app (frontend)";
  }
  if (frameworks.some((name) => ["Django", "Flask", "FastAPI", "Express", "NestJS"].includes(name))) return "web app (backend/API)";
  if (manifests.some((path) => ["setup.py", "pyproject.toml"].includes(basename(path)))) return "ambiguous";
  return "ambiguous";
}

function detectPackageManagers(files) {
  const markers = {
    "package-lock.json": "npm",
    "yarn.lock": "Yarn",
    "pnpm-lock.yaml": "pnpm",
    "requirements.txt": "pip",
    "poetry.lock": "Poetry",
    "Pipfile.lock": "Pipenv",
    "Gemfile.lock": "Bundler",
    "go.sum": "Go modules",
    "Cargo.lock": "Cargo"
  };
  return Array.from(new Set(files.map((path) => markers[basename(path)]).filter(Boolean))).sort();
}

function countLanguages(files) {
  const counts = {};
  files.forEach((path) => {
    const suffix = extension(path);
    const language = LANG_BY_SUFFIX[suffix];
    if (language) counts[language] = (counts[language] || 0) + 1;
  });
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]));
}

function detectNamed(dependencies, mapping) {
  return Array.from(new Set(Object.entries(mapping).filter(([dep]) => dependencies.has(dep.toLowerCase())).map(([, label]) => label))).sort();
}

async function githubJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  if (!response.ok) {
    const text = await response.text();
    if (response.status === 403) throw new Error("GitHub API rate limit or permission error. Add a token and try again.");
    if (response.status === 404) throw new Error("Repository, branch, or file not found. Check the URL and branch.");
    throw new Error(`GitHub API error ${response.status}: ${text.slice(0, 180)}`);
  }
  return response.json();
}

function parseGithubUrl(url) {
  const match = url.match(/^https:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+)(?:[/?#].*)?$/);
  if (!match) throw new Error("Enter a GitHub repository URL like https://github.com/owner/repo.");
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

function repoSlug(url) {
  const { owner, repo } = parseGithubUrl(url);
  return `${owner}/${repo}`;
}

function readyTier(scores) {
  const avg = scores.reduce((sum, item) => sum + item.score, 0) / scores.length;
  if (avg < 6) return "1 -> 100";
  if (avg < 8) return "100 -> 10K";
  return "10K -> 1M";
}

function firstBottleneck(inventory) {
  if (!inventory.quality.tests.present) return "low change confidence because tests are missing";
  if (!inventory.architecture.databases.length) return "unknown data-layer behavior because no database signal was detected";
  if (!inventory.architecture.background_jobs.length) return "database and request latency once slow work runs inline";
  return "database query efficiency and cache strategy";
}

function securityJustification(security) {
  const parts = [];
  if (security.auth_signal.length) parts.push(`auth detected: ${join(security.auth_signal)}`);
  if (security.env_samples_present) parts.push("env sample present");
  if (security.committed_runtime_env_files.length) parts.push(`runtime env file committed: ${join(security.committed_runtime_env_files)}`);
  if (security.secret_like_filenames.length) parts.push(`secret-like filenames: ${join(security.secret_like_filenames.slice(0, 3))}`);
  return parts.length ? parts.join("; ") : "No auth, env-sample, or secret-management evidence was found in the static scan.";
}

function evidence(prefix, items, fallback) {
  return items.length ? `${prefix} Evidence: ${join(items.slice(0, 5))}.` : fallback;
}

function setBusy(isBusy, message) {
  scanButton.disabled = isBusy;
  scanButton.classList.toggle("busy", isBusy);
  scanButton.innerHTML = isBusy
    ? `<span class="spinner" aria-hidden="true"></span> Analyzing...`
    : `<span class="button-icon" aria-hidden="true">&gt;</span> Analyze repository`;
  if (message) setStatus(message);
}

function setStatus(message, tone = "") {
  statusTextEl.textContent = message;
  statusEl.dataset.tone = tone || "idle";
}

function enableActions(enabled) {
  [copyReportButton, downloadReportButton, copyTasksButton, copyAgentPromptButton, downloadAgentPromptButton].forEach((button) => {
    if (button) button.disabled = !enabled;
  });
}

async function copyText(text, successMessage) {
  await navigator.clipboard.writeText(text);
  setStatus(successMessage, "good");
}

function decodeBase64(value) {
  const cleaned = value.replace(/\s/g, "");
  const binary = atob(cleaned);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

function isSkipped(path) {
  return path.split("/").some((part) => SKIP_DIRS.has(part));
}

function basename(path) {
  return path.split("/").pop();
}

function extension(path) {
  const name = basename(path);
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index) : "";
}

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function join(items) {
  return items && items.length ? items.join(", ") : "";
}

function clamp(value) {
  return Math.max(1, Math.min(10, Math.trunc(value)));
}

function uniqueSignals(signals) {
  const seen = new Set();
  return signals.filter((item) => {
    const key = `${item.type}:${item.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
