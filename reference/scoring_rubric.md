# Stack Auditor Scoring Rubric

Use this rubric to keep scores repeatable. Scores are evidence-based and should cite concrete files, manifests, or missing signals from the scan inventory.

## Score Bands

- 1-2: critical gaps; unsuitable for real users without immediate remediation.
- 3-4: prototype quality; useful for demos but fragile under production traffic or team changes.
- 5-6: early production; can serve small traffic with operational discipline, but important gaps remain.
- 7-8: growth-ready; strong conventions, tests, and operational signals with some scale work still needed.
- 9-10: mature; clear boundaries, automated verification, explicit security controls, observable operations, and scale-ready infrastructure.

## Categories

### Architecture soundness

Consider separation of frontend/backend/API, modularity, framework conventions, coupling, statelessness, and deployment boundaries.

### Code quality and maintainability

Consider naming/structure signals, automated tests, coverage signals, CI, lint/type-check scripts, error handling conventions, and size/scope clarity.

### Security posture

Consider committed secrets, env samples, auth libraries, input validation hints, dependency audit posture, OWASP Top 10/ASVS concerns, and production framework security docs.

### Database design

Consider detected database/ORM, schema/migrations, indexing evidence, production readiness, backup implications, and likely N+1 query risks.

### API design

Consider explicit routes/controllers, REST/GraphQL conventions, validation, versioning, rate limiting, error responses, and public/private API separation.

### Dependency health

Consider manifests, lockfiles, ecosystem audit support, abandoned package risk, version pinning, and license review signals.

## Consistency Rules

- Do not award high scores for claims that cannot be tied to repo evidence.
- If a section lacks signal, say so and score conservatively.
- Do not claim a vulnerability exists without concrete evidence or a tool report.
- Before flagging a best-practice issue, corroborate the principle using at least two source types when available: official docs/standards plus framework docs or high-reputation engineering guidance.
