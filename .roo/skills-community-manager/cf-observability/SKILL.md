---
name: cf-observability
description: Monitors cyberdeck.club Cloudflare Workers infrastructure health using the Cloudflare Observability MCP server — queries request logs, error rates, latency metrics, Worker status for both production and beta environments, and generates infrastructure health reports.
---

# Cloudflare Observability

## When to Use

- Admin or community manager asks for an **infrastructure health check**
- Investigating **errors, latency spikes, or traffic anomalies** on cyberdeck.club
- Generating a **Cloudflare infrastructure report**
- Checking **Worker deployment status** for prod or beta
- Analyzing **request logs** or **error patterns** by route
- Comparing **prod vs beta** performance

## When NOT to Use

- **D1 database queries or schema changes** → use `wrangler d1` CLI or Drizzle tools
- **R2 storage management** → use Cloudflare Dashboard
- **DNS, WAF, rate limiting, or Turnstile config** → use Cloudflare Dashboard
- **Deploying code** → use GitHub Actions (see `docs/DEPLOYMENT.md`)
- **Cache purging** → use `wrangler` CLI or Cloudflare Dashboard
- **Community moderation tasks** → use the `moderation-queue` or `safety-management` skills

## Prerequisites

- The **Cloudflare Observability MCP server** must be configured and connected (remote SSE at `observability.mcp.cloudflare.com`)
- All MCP tools are prefixed with `cloudflare--` in the tool namespace (e.g., `cloudflare--query_worker_observability`)

## cyberdeck.club Infrastructure

| Resource | Name | Domain / Binding | Notes |
|----------|------|-------------------|-------|
| Worker (prod) | `cyberdeck-club` | `cyberdeck.club` | Astro SSR, manual workflow dispatch deploy |
| Worker (beta) | `cyberdeck-club-beta` | `beta.cyberdeck.club` | Astro SSR, auto-deployed on push to `main` |
| D1 (prod) | `cyberdeck-db` | binding `DB` | SQLite at edge |
| D1 (beta) | `cyberdeck-db-beta` | binding `DB` | SQLite at edge |
| R2 Bucket | `cyberdeck-club-media` | binding `MEDIA` | User uploads, feedback screenshots |
| Turnstile | — | — | CAPTCHA for guidelines acceptance |
| Observability | Logs enabled | — | 100% sampling rate, traces disabled |

Reference file: `wrangler.jsonc` — contains Worker names, D1 bindings, R2 bindings, and observability config.

## MCP Tools

All tools are under the `cloudflare--` prefix. Use the prefixed form in tool calls.

| Tool | Purpose |
|------|---------|
| `accounts_list` | List Cloudflare accounts |
| `set_active_account` | Set active account for subsequent calls |
| `workers_list` | List all Workers in the account |
| `workers_get_worker` | Get details for a specific Worker |
| `workers_get_worker_code` | Get deployed source code of a Worker |
| `query_worker_observability` | Query Worker logs and metrics (events/invocations/calculations) |
| `observability_keys` | Discover available log field keys |
| `observability_values` | Discover values for a specific log field |
| `search_cloudflare_documentation` | Semantic search of Cloudflare docs |

## Workflow

### Step 1 — Account Setup (required every session)

1. Call `cloudflare--accounts_list` to identify the cyberdeck.club Cloudflare account.
2. Call `cloudflare--set_active_account` with the correct account ID.
3. Confirm the account is set before proceeding.

### Step 2 — Worker Health Check

1. Call `cloudflare--workers_list` and verify both `cyberdeck-club` and `cyberdeck-club-beta` are present.
2. Call `cloudflare--workers_get_worker` for each Worker. Check:
   - Deployment status
   - Last deployment time
   - Routes/domains configured
3. Report any Workers that appear missing or misconfigured.

### Step 3 — Error Monitoring

1. Call `cloudflare--query_worker_observability` with:
   - `view: "events"`
   - Filter for errors (`$metadata.error exists` or HTTP status >= 500)
   - Time range: **last 1 hour** (default), or custom range if admin specifies
2. Query **both** prod (`cyberdeck-club`) and beta (`cyberdeck-club-beta`) Workers.
3. For each error found, report:
   - Timestamp
   - Request path/URL
   - Error message/type
   - HTTP status code
   - Which Worker produced it
4. **Redact sensitive data** — never include auth tokens, session cookies, or user email addresses in reports.

### Step 4 — Traffic & Performance Metrics

1. Call `cloudflare--query_worker_observability` with:
   - `view: "calculations"`
   - Calculation: `count` for request volume
   - Calculation: `p99` on wall time for latency
   - GroupBy: Worker name (to compare prod vs beta)
   - Time range: **last 24 hours**
2. Report:
   - Total requests per Worker
   - Request rate trends
   - P50/P99 latency
   - Success vs error rate ratio

### Step 5 — Route Analysis (if requested)

Filter `cloudflare--query_worker_observability` by specific API routes:

| Route Pattern | Section |
|---------------|---------|
| `/api/auth/*` | Authentication |
| `/api/builds/*` | Build submission/review |
| `/api/forum/*` | Forum activity |
| `/api/wiki/*` | Wiki operations |
| `/api/admin/*` | Admin operations |

This identifies which parts of the application are experiencing issues.

### Step 6 — Log Field Discovery (for investigation)

1. Call `cloudflare--observability_keys` to discover available log fields.
2. Call `cloudflare--observability_values` on specific fields to understand possible values.
3. Use this when investigating unfamiliar log patterns or building new queries.

### Step 7 — Documentation Lookup (when needed)

Call `cloudflare--search_cloudflare_documentation` for Cloudflare-specific questions:
- D1 limits and quotas
- R2 storage limits
- Worker CPU time limits
- Error codes and their meanings

### Step 8 — Generate Infrastructure Report

Format the final report using this template:

```markdown
# ☁️ Cloudflare Infrastructure Report — [Date]

## Account
- **Account:** [account name]
- **Workers:** [count]

## Worker Status

### Production: `cyberdeck-club`
| Metric | Value | Status |
|--------|-------|--------|
| Domain | cyberdeck.club | ✅/⚠️ |
| Last Deploy | [date] | — |
| Requests (24h) | [count] | — |
| Error Rate | [%] | ✅/⚠️/🔴 |
| P99 Latency | [ms] | ✅/⚠️/🔴 |

### Beta: `cyberdeck-club-beta`
| Metric | Value | Status |
|--------|-------|--------|
| Domain | beta.cyberdeck.club | ✅/⚠️ |
| Last Deploy | [date] | — |
| Requests (24h) | [count] | — |
| Error Rate | [%] | ✅/⚠️/🔴 |
| P99 Latency | [ms] | ✅/⚠️/🔴 |

## Recent Errors (Last Hour)
| Time | Worker | Path | Status | Error |
|------|--------|------|--------|-------|
| ... | ... | ... | ... | ... |

## Traffic by Route (Top 10)
| Route | Requests | Avg Latency |
|-------|----------|-------------|
| ... | ... | ... |

## Infrastructure Notes
- D1/R2/Turnstile status requires Cloudflare Dashboard (not available via MCP)
- [any concerns or recommendations]

## Recommendations
1. [prioritized items]
```

## Status Thresholds

| Metric | ✅ Healthy | ⚠️ Warning | 🔴 Critical |
|--------|-----------|------------|-------------|
| Error Rate | < 1% | 1–5% | > 5% |
| P99 Latency | < 500ms | 500ms–2s | > 2s |
| Requests/min | Normal range | 2× normal | 5× normal (possible attack) |

## Limitations

This skill is **read-only** — it queries observability data but does NOT modify infrastructure.

The Cloudflare Observability MCP covers **logs and metrics only**. It cannot:

| What | Use Instead |
|------|-------------|
| D1 database size/health | `wrangler d1 info` CLI or CF Dashboard |
| R2 storage usage | CF Dashboard |
| DNS record management | CF Dashboard or Terraform |
| WAF / rate limiting | CF Dashboard |
| Turnstile settings | CF Dashboard |
| Trigger deployments | GitHub Actions (`docs/DEPLOYMENT.md`) |
| Purge cache | `wrangler` CLI or CF Dashboard |

## Key Reference Files

- `wrangler.jsonc` — Worker names, D1 bindings, R2 bindings, observability config
- `docs/DEPLOYMENT.md` — Deployment workflow and CI/CD
- `src/lib/r2.ts` — R2 storage usage patterns
- `src/lib/turnstile.ts` — Turnstile integration
