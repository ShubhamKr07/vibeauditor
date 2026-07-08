# Tech Alternatives Benchmark

Used by the architecture/frontend/backend/database benchmark sections. Each row only fires
when the scan finds concrete evidence (a detected framework/dependency); the report never
recommends swapping a tool that wasn't detected. `stack_auditor/business.py` and `web/app.js`
embed this table as a constant.

The "agent token-load impact" column is the static-evidence-based reasoning used for the
"reduce token utilization" recommendations: fewer hand-written files/boilerplate an agentic
coding tool must read and edit to accomplish the same outcome means fewer tool calls and less
context per task, independent of any specific model or pricing.

| Detected signal | Stage where it fits well | When it becomes a bottleneck | Suggested alternative | Agent token-load impact |
|---|---|---|---|---|
| Create React App (`react-scripts` dependency) | Learning projects, tiny prototypes | Unmaintained since 2023; no first-party fix for slow builds or modern bundling | Vite + React, or Next.js if SSR/routing is needed | Vite's convention-based config replaces hand-rolled webpack/CRA overrides, shrinking the config surface an agent has to read before editing build behavior. |
| Custom hand-rolled auth (session/password code present, no `AUTH_DEPENDENCIES` match) | Educational/demo only | Any real user data; security-critical code with no dedicated maintainer | Managed auth (Auth0/Clerk/Supabase Auth/NextAuth) | Replacing bespoke auth files with a provider SDK call collapses many security-sensitive files into a handful of configuration/callback files, reducing both review burden and per-change context size. |
| SQLite detected alongside a backend framework | 0 -> 1 prototyping, local dev | Multi-user concurrent writes, backups, horizontal scaling | Managed Postgres (RDS/Supabase/Neon) with the same ORM already in use | Migration is schema/config-level, not a rewrite; an ORM already in use (Prisma/SQLAlchemy) means the model layer an agent edits does not change shape. |
| No ORM detected alongside raw SQL query strings | Small, single-developer backend | Query duplication, N+1 risk, and injection risk grow with route count | Adopt the ecosystem-standard ORM/query builder (Prisma for Node, SQLAlchemy for Python, ActiveRecord for Rails) | An ORM's declarative model files are far more compact than hand-written SQL scattered across route handlers, so an agent changing a field touches one model file instead of every query site. |
| No background job/queue dependency, but third-party services (Stripe/OpenAI/Twilio/email) are present | Any stage with external API calls in request handlers | Slow/failing third-party calls block user-facing request latency | Managed queue (BullMQ+Redis, Celery, SQS) | Queue/worker boilerplate is a small, well-documented pattern; it is far smaller than the surface of a custom retry/backoff implementation an agent would otherwise need to write and re-verify. |
| No CDN/edge hosting signal (`Vercel`/`Netlify`/CDN config) for a frontend-heavy app | Any stage serving static assets or read-heavy pages | Origin compute serves cacheable content on every request | Deploy static/read-heavy routes behind Vercel/Netlify/Cloudflare edge caching | Edge caching config is a few lines of hosting config versus custom cache-control/invalidation logic written and tested by hand. |
| No CI workflow detected | Any stage | Regressions ship unnoticed as the codebase grows past what one person can manually verify | GitHub Actions (or equivalent) running lint/type-check/test/build on every PR | A standard CI template is copy-once; without it, an agent must be re-told the verification steps every session instead of them running automatically. |
| No lockfile committed | Any stage | Non-reproducible installs; "works on my machine" drift | Commit the ecosystem lockfile (`package-lock.json`/`pnpm-lock.yaml`/`poetry.lock`/etc.) | A committed lockfile means an agent's `install` step is deterministic and doesn't require re-resolving/re-verifying dependency versions each run. |
| MongoDB detected with clearly relational data shape (foreign-key-like fields, join-heavy route names) | Document-shaped, schema-flexible data | Relational integrity, multi-table joins, and transactional consistency needs | PostgreSQL with JSONB columns for the flexible parts | Relational schema plus migrations gives an agent one source of truth for shape/constraints instead of implicit conventions enforced only in application code. |
| No rate limiting or CORS dependency on a public API | Internal-only or pre-launch APIs | Public traffic, abuse, or scraping once the API is reachable from the internet | `express-rate-limit`/`django-ratelimit`/`slowapi` plus explicit CORS allow-list | These are drop-in middleware; adding them is a few lines versus custom throttling logic an agent would need to write and load-test. |

## Source note

Framework-lifecycle claims (e.g., Create React App maintenance status) reflect the tool's
publicly documented status as of this reference's last review; verify current status before
acting. Everything else in this table is general, durable engineering guidance (ORM vs raw SQL,
queue vs inline third-party calls, CDN vs origin compute) corroborated by the same standards
already cited in `reference/scoring_rubric.md` (OWASP, Twelve-Factor, framework deployment docs).
