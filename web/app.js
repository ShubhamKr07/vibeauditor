const form = document.querySelector("#audit-form");
const statusEl = document.querySelector("#status");
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

let latestReport = "";
let latestTasks = [];
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

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    document.querySelector(`#${tab.dataset.tab}`).classList.add("active");
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setBusy(true, "Parsing repository URL...");
  try {
    const inputs = getInputs();
    latestRepoName = repoSlug(inputs.repoUrl).replace("/", "-");
    const inventory = await scanGithubRepo(inputs);
    const scores = scoreInventory(inventory);
    const tasks = remediationTasks(inventory, scores, inputs.targetScale);
    const report = renderMarkdownReport(inventory, scores, tasks, inputs);
    latestReport = report;
    latestTasks = tasks;
    renderApp(inventory, scores, report, tasks, inputs);
    setStatus(`Audit complete. Scanned ${inventory.files.count} files and ${inventory.stack.manifests.length} manifest(s).`, "good");
    enableActions(true);
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Audit failed.", "bad");
  } finally {
    setBusy(false);
  }
});

copyReportButton.addEventListener("click", () => copyText(latestReport, "Report copied."));
copyTasksButton.addEventListener("click", () => copyText(latestTasks.join("\n"), "Remediation tasks copied."));
loadDemoButton.addEventListener("click", () => {
  const inputs = {
    repoUrl: "https://github.com/demo/next-saas",
    branch: "main",
    budget: "250",
    targetScale: "100-to-10k",
    currentHost: "Vercel",
    token: ""
  };
  const inventory = demoInventory();
  const scores = scoreInventory(inventory);
  const tasks = remediationTasks(inventory, scores, inputs.targetScale);
  const report = renderMarkdownReport(inventory, scores, tasks, inputs);
  latestRepoName = "demo-next-saas";
  latestReport = report;
  latestTasks = tasks;
  renderApp(inventory, scores, report, tasks, inputs);
  setStatus("Demo audit loaded. Enter a GitHub URL to scan a real repo.", "good");
  enableActions(true);
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

function getInputs() {
  return {
    repoUrl: document.querySelector("#repo-url").value.trim(),
    branch: document.querySelector("#branch").value.trim(),
    budget: document.querySelector("#budget").value.trim(),
    targetScale: document.querySelector("#target-scale").value,
    currentHost: document.querySelector("#current-host").value.trim(),
    token: document.querySelector("#github-token").value.trim()
  };
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
  const inventory = buildInventory({
    owner,
    repo,
    branch,
    repoUrl: inputs.repoUrl,
    repoMeta,
    files: allFiles,
    treeTruncated: tree.truncated,
    manifests: manifestData
  });
  return inventory;
}

function buildInventory({ owner, repo, branch, repoUrl, repoMeta, files, treeTruncated, manifests }) {
  const dependencies = new Set();
  manifests.forEach((manifest) => Object.keys(manifest.dependencies || {}).forEach((dep) => dependencies.add(dep.toLowerCase())));
  const frameworks = detectNamed(dependencies, FRAMEWORK_DEPENDENCIES);
  const databases = detectNamed(dependencies, DB_DEPENDENCIES);
  const auth = detectNamed(dependencies, AUTH_DEPENDENCIES);
  const backgroundJobs = detectNamed(dependencies, QUEUE_DEPENDENCIES);
  const thirdPartyServices = detectNamed(dependencies, THIRD_PARTY_DEPENDENCIES);
  const languages = countLanguages(files);
  const infraSignals = detectInfra(files);
  const envFiles = files.filter((path) => basename(path).startsWith(".env") || ["env.example", ".env.example"].includes(basename(path)));
  const frontend = detectFrontend(files, frameworks);
  const api = detectApi(files, frameworks);
  const backend = detectBackend(files, frameworks, api);
  const tests = detectTests(files, manifests);
  const security = detectSecurity(files, envFiles, auth);
  const appType = classifyApp(files, frameworks, manifests.map((item) => item.path));
  const warnings = [];
  if (treeTruncated) warnings.push("GitHub tree response was truncated; scan may be incomplete.");
  if (appType === "ambiguous") warnings.push("Repository may not be a standalone app; no clear app framework was detected.");

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
    }
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

function renderApp(inventory, scores, report, tasks, inputs) {
  emptyState.classList.add("hidden");
  overviewContent.classList.remove("hidden");
  document.querySelector("#detected-app").textContent = `${inventory.repo.app_type}; ${join(inventory.stack.frameworks) || "no major framework detected"}`;
  document.querySelector("#ready-tier").textContent = readyTier(scores);
  document.querySelector("#first-bottleneck").textContent = firstBottleneck(inventory);
  renderScores(scores);
  renderScaleTable(inputs.currentHost);
  inventoryJson.textContent = JSON.stringify(inventory, null, 2);
  reportMarkdown.textContent = report;
  renderTasks(tasks);
}

function renderScores(scores) {
  scoreGrid.innerHTML = "";
  scores.forEach((item) => {
    const article = document.createElement("article");
    article.className = "score-card";
    const tone = item.score >= 7 ? "good" : item.score >= 5 ? "warn" : "bad";
    article.innerHTML = `
      <div class="score-top">
        <h3>${escapeHtml(item.category)}</h3>
        <span class="score ${tone}">${item.score}/10</span>
      </div>
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

function renderMarkdownReport(inventory, scores, tasks, inputs) {
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
    "## Tech stack & code quality scorecard",
    markdownScoreTable(scores),
    "## Scalability/cost table",
    markdownScaleTable(),
    "## Infrastructure efficiency notes",
    infraNotes(inventory),
    "## Remediation task list",
    tasks.join("\n"),
    "## Sources consulted",
    SOURCES.map(([name, url]) => `- ${name}: ${url} (accessed ${today})`).join("\n")
  ].join("\n\n") + "\n";
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
  let text = "";
  try {
    const data = await githubJson(`https://api.github.com/repos/${owner}/${repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`, token);
    text = decodeBase64(data.content || "");
  } catch (error) {
    if (token) throw error;
    text = await fetchRawManifest(owner, repo, branch, path);
  }
  return parseManifest(path, text);
}

async function fetchRawManifest(owner, repo, branch, path) {
  const url = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${encodePath(path)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("GitHub API rate limit or permission error while reading manifests. Add a token and try again.");
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

function detectSecurity(files, envFiles, auth) {
  return {
    auth_signal: auth,
    env_samples_present: envFiles.some((path) => path.toLowerCase().includes("example") || path.toLowerCase().includes("sample")),
    committed_runtime_env_files: envFiles.filter((path) => [".env", ".env.local", ".env.production"].includes(basename(path))),
    secret_like_filenames: files.filter((path) => /(secret|credential|service-account|private-key)/i.test(path)).slice(0, 20)
  };
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
  scanButton.textContent = isBusy ? "Analyzing..." : "Analyze repository";
  if (message) setStatus(message);
}

function setStatus(message, tone = "") {
  statusEl.textContent = message;
  statusEl.style.borderColor = tone === "bad" ? "var(--danger)" : tone === "warn" ? "var(--warn)" : tone === "good" ? "var(--good)" : "var(--line)";
}

function enableActions(enabled) {
  [copyReportButton, downloadReportButton, copyTasksButton].forEach((button) => {
    button.disabled = !enabled;
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
