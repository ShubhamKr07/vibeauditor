# Feature Market Playbook

This table backs the Product Tree / Buy-a-Feature and feature-efficiency sections of the
report. Each row names a well-known managed alternative for a feature category and a
qualitative, generally-known industry rationale for why teams buy it instead of building it.
No specific market-share, revenue, or adoption percentages are asserted here; those numbers
change constantly and would violate the project's non-fabrication rule. `stack_auditor/business.py`
and `web/app.js` embed this same table as a constant so it can be cited without a network call.

| Category | Typical market alternative | Why teams buy instead of build (qualitative, real pattern) | Risk/effort if hand-rolled |
|---|---|---|---|
| Authentication | Auth0, Clerk, Supabase Auth, Firebase Auth, NextAuth/Auth.js | Session/password/OAuth handling is security-critical and easy to get subtly wrong (token storage, rotation, password hashing cost factors); managed providers absorb OWASP ASVS-level correctness and ongoing patching. | Custom auth requires ongoing security maintenance; a single missed rotation/hash upgrade is a direct breach vector. |
| Payments / billing | Stripe, Braintree, Paddle, Lemon Squeezy | Handling card data directly pulls a company into PCI-DSS compliance scope; hosted checkout/Elements keeps raw card data off the app's servers. | Homegrown card handling multiplies compliance audit scope and breach liability. |
| Checkout / cart | Stripe Checkout, Shopify Checkout, Snipcart | Cart/checkout flows are conversion-sensitive; providers continuously A/B-test and localize the flow so merchants don't have to. | Custom checkout carries ongoing conversion-rate and tax/localization maintenance burden. |
| Search | Algolia, Elasticsearch/OpenSearch, Typesense, Meilisearch | Relevance ranking, typo tolerance, and query latency at scale are hard problems; `LIKE`/ORM-filter search degrades quickly as data volume and query complexity grow. | In-house SQL search commonly hits a relevance and latency ceiling that forces a rewrite later. |
| Email / notifications | Resend, SendGrid, Postmark, Twilio | Deliverability depends on IP reputation, SPF/DKIM/DMARC upkeep, and bounce/complaint handling that mail providers manage continuously. | Self-hosted SMTP commonly lands in spam folders without dedicated deliverability operations. |
| SMS / voice | Twilio, Vonage, MessageBird | Carrier relationships, number provisioning, and compliance (10DLC, opt-out handling) are jurisdiction-specific and change often. | Direct carrier integration is high-effort and easy to get non-compliant. |
| Background jobs / queue | Managed Redis + BullMQ/Sidekiq, AWS SQS, Upstash, Celery+broker | Reliable retry/backoff, dead-letter handling, and visibility into stuck jobs are non-trivial to build correctly the first time. | Inline or naive worker code risks silent job loss and duplicate side effects under retries. |
| CDN / edge caching | Cloudflare, Vercel Edge Network, Fastly, CloudFront | Edge PoPs and cache invalidation logic are capital- and operations-intensive; this is one of the largest per-request cost levers available. | Serving static/read-heavy content from origin compute inflates both latency and compute cost. |
| Observability / monitoring | Sentry, Datadog, New Relic, Honeycomb | Correlating errors, traces, and logs across services is a dedicated engineering discipline; ad hoc `console.log`/print debugging does not scale past a few services. | Blind spots in production delay incident detection and root-causing. |
| Feature flags / rollout | LaunchDarkly, Unleash, Flagsmith, GrowthBook | Progressive rollout and kill-switches reduce blast radius of bad deploys; hand-rolled flags usually lack targeting/segmentation and audit trails. | All-or-nothing deploys raise the cost of a bad release. |
| AI / ML inference | OpenAI, Anthropic, Google Gemini APIs | Training and hosting competitive foundation models is capital-intensive; API access lets teams ship model-backed features without owning GPU infrastructure. | Self-hosting comparable model quality is a multi-million-dollar undertaking for most teams. |
| File storage / uploads | AWS S3, Cloudflare R2, Supabase Storage | Durable, versioned, access-controlled object storage with signed URLs is a solved problem with strong SLAs. | Disk-backed uploads on a single app server do not survive instance replacement or scale horizontally. |
| Analytics / product usage | PostHog, Amplitude, Mixpanel, GA4 | Event pipelines, retention/funnel computation, and privacy-regulation (GDPR/CCPA) handling are ongoing work independent of the core product. | Home-grown analytics tables usually go stale or become their own maintenance burden. |
| Database / ORM | Managed Postgres (RDS, Supabase, Neon), Prisma/SQLAlchemy | Managed services absorb backup, patching, failover, and point-in-time recovery; ORMs reduce hand-written SQL surface area an agent or engineer must review. | Self-managed DB operations (backup/failover) are a common cause of unrecoverable data loss incidents. |
| Generic / uncategorized feature | N/A | No strong market-comparable pattern detected from static evidence; evaluate case by case. | Not enough signal to estimate build-vs-buy risk from this scan. |

## Source note

This table encodes generally known, durable industry patterns (why PCI scope, deliverability,
and search relevance are hard problems) rather than dated pricing or market-share figures. It
should be treated as directional reasoning to justify a Buy-a-Feature ranking, not as a citation
for any specific number. Verify current provider fit and pricing directly with the vendor before
committing.
