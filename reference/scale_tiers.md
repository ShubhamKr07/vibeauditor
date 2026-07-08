# Stack Auditor Scale Tiers

All cost ranges are estimated and must be validated against current provider pricing pages, selected regions, traffic shape, and workload measurements.

| Tier | Load definition | Typical reference architecture | Typical bottlenecks | Estimated monthly cost |
|---|---|---|---|---|
| 0 -> 1 | Pre-launch / first users | Free/hobby web hosting, local/dev database or tiny managed DB, manual deploy | Missing deploy hygiene, secrets, no logs | $0-$25 |
| 1 -> 100 | Early adopters | Managed app hosting plus small managed DB, object storage if needed | Hobby DB limits, cold starts, missing backups | $0-$100 |
| 100 -> 10K | Product-market fit stage | Paid app hosting, managed Postgres/MySQL, CDN, basic queue, monitoring | Database indexes, inline jobs, uncached assets/pages | $100-$1,500 |
| 10K -> 1M | Growth stage | Horizontally scaled app, read replicas/cache, queue workers, CDN, observability | Database read/write scaling, rate limits, third-party latency | $1,500-$50,000+ |
| 1M -> 100M | Hyperscale | Multi-region/edge architecture, partitioned data, mature platform operations | Data locality, cost controls, SLOs, incident response | $50,000-$1,000,000+ |

## Modeling Assumptions

- Unit costs improve as utilization and cache hit rate improve.
- Static/front-end-heavy apps can stay cheap much longer than write-heavy, media-heavy, AI-heavy, or real-time apps.
- Serverless can be efficient at low/variable traffic but can become expensive with high sustained compute or chatty API/database patterns.
- Managed databases are usually worth the cost through early growth because backups, patching, and recovery matter more than raw instance price.
- CDN/edge caching is one of the largest cost levers for static assets and read-heavy public pages.
