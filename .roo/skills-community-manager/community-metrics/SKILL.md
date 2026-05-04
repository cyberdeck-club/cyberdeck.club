---
name: community-metrics
description: Gathers and reports community health metrics for cyberdeck.club — user counts by role, content activity across builds/forum/wiki/meetups, moderation queue depth, promotion pipeline status, and API adoption metrics. Use when the admin asks how the community is doing, for weekly/monthly health check-ins, or when preparing stakeholder reports.
---

# Community Metrics & Reporting

## When to Use

- The admin asks "how is the community doing?"
- Weekly or monthly community health check-ins
- Preparing reports for stakeholders
- Investigating whether engagement is growing or declining
- Checking moderation queue depth or promotion pipeline status

## When NOT to Use

- **Moderation actions** (approving/rejecting builds) → use the `moderation-queue` skill
- **Security auditing** (PAT abuse, role audit) → use the `security-audit` skill
- **Content creation** (wiki articles, builds, meetups) → use the `content-page-builder` skill
- **Safety incidents** (harassment, bans) → use the `safety-management` skill

## Nature of This Skill

This is a **read-only** skill. It gathers data and produces a report. It does NOT modify any data.

## MCP Tools Required

| Tool | Source File | Purpose |
|------|------------|---------|
| `list_users` | `mcp-server/src/tools/admin.ts` | User enumeration with role data. Params: `page`, `limit` |
| `list_builds` | `mcp-server/src/tools/builds.ts` | Build listings with status filter. Params: `page`, `status`, `category` |
| `list_forum_threads` | `mcp-server/src/tools/forum.ts` | Forum thread enumeration. Params: `category`, `page` |
| `list_forum_posts` | `mcp-server/src/tools/forum.ts` | Forum post enumeration. Params: `threadId`, `page` |
| `list_wiki_articles` | `mcp-server/src/tools/wiki.ts` | Wiki article enumeration. Params: `category`, `page` |
| `list_meetups` | `mcp-server/src/tools/meetups.ts` | Meetup enumeration. Params: `page` |
| `list_all_tokens` | `mcp-server/src/tools/admin.ts` | PAT inventory (admin only). Params: `page`, `pageSize`, `userId` |
| `list_token_logs` | `mcp-server/src/tools/admin.ts` | API usage logs (admin only). Params: `page`, `limit`, `userId`, `tokenId` |

> All tools above are **read-only** and require no user confirmation before calling.

## Workflow

### Step 1: Gather User Population

1. Call `list_users` with `limit: 50`. Paginate through all pages to get the full user list.
2. For each user, read the `role` field (string: `member`, `maker`, `trusted_maker`, `moderator`, `admin`).
3. Count users by role. Map role strings to display names using this table:

   | DB Value | Display Name | Level |
   |----------|-------------|-------|
   | *(null/missing)* | Visitor | 0 |
   | `member` | Member | 10 |
   | `maker` | Maker | 20 |
   | `trusted_maker` | Trusted Maker | 30 |
   | `moderator` | Moderator | 40 |
   | `admin` | Admin | 50 |

4. Count total registered users, active (non-banned) users, and banned users (where `bannedAt` is not null).

> Reference: [`src/lib/roles.ts`](../../../src/lib/roles.ts) for role definitions.

### Step 2: Gather Content Activity

1. Call `list_builds` with **no status filter** to get total builds. Then call with `status: "published"` to count published builds. Also call with `status: "pending_human"` and `status: "rejected"` for queue/rejection counts.
2. Call `list_forum_threads` to count total forum threads.
3. Call `list_forum_posts` for active threads to gauge forum activity volume.
4. Call `list_wiki_articles` to count wiki articles.
5. Call `list_meetups` to count meetups.

For each content type, note the total count and identify recent activity from timestamps in the response data.

### Step 3: Check Moderation Queue Depth

1. Call `list_builds` with `status: "pending_human"` — these are builds awaiting human review.
2. Call `list_builds` with `status: "rejected_auto"` — these were auto-rejected and may need review.
3. For each pending build, note the `createdAt` timestamp to calculate queue aging (how long each item has been waiting).
4. Flag any items older than 48 hours as stale.

### Step 4: Analyze Promotion Pipeline

Using the user data from Step 1, identify:

1. **Members near Maker promotion:** Members where `firstBuildPublishedAt` is set. Calculate days since that date. If ≥ 7 days, they should have been promoted (may indicate a promotion check issue). If < 7 days, report days remaining.

2. **Makers near Trusted Maker promotion:** Makers where `acceptedBuildCount >= 2`. At 3+ they qualify for promotion.

3. **Pending moderator nominations:** Users where `isModNominated` is true but role is not yet `moderator`.

> Reference: [`src/lib/promotion.ts`](../../../src/lib/promotion.ts) for promotion thresholds:
> - member → maker: first build published ≥ 7 days ago
> - maker → trusted_maker: `acceptedBuildCount >= 3`

### Step 5: Check API Adoption (if PAT system is active)

1. Call `list_all_tokens` to get all PATs. Count active (non-revoked, non-expired) tokens.
2. Count unique users who hold active tokens.
3. Call `list_token_logs` to check recent API usage volume. Note total calls and unique tokens used.
4. If no tokens exist or the call fails with 404, report "PAT system not yet active" and skip this section.

### Step 6: Generate Report

Format all gathered data as a structured markdown report using the template below. Include:
- A timestamp header
- Summary dashboard with key numbers at a glance
- Detailed sections with markdown tables
- A recommendations section with prioritized action items
- Flags for concerning patterns (large queue, stale nominations, stalled promotions)

## Output Template

```markdown
# 📊 Community Metrics Report — {YYYY-MM-DD}

## Dashboard
| Metric | Count | Status |
|--------|-------|--------|
| Total Registered Users | {N} | — |
| Active Users | {N} | — |
| Banned Users | {N} | {⚠️ if > 0, else ✅} |
| Mod Queue Depth | {N} | {⚠️ if > 5, 🔴 if > 10, else ✅} |
| Stale Queue Items (>48h) | {N} | {⚠️ if > 0} |
| Pending Promotions | {N} | {⚠️ if overdue} |
| Active PATs | {N} | — |

## User Population
| Role | Count | % of Total |
|------|-------|------------|
| Admin | {N} | {%} |
| Moderator | {N} | {%} |
| Trusted Maker | {N} | {%} |
| Maker | {N} | {%} |
| Member | {N} | {%} |
| **Total** | **{N}** | **100%** |

Banned users: {N}

## Content Activity
| Content Type | Total | Published/Active |
|-------------|-------|-----------------|
| Builds | {N} | {N} published |
| Forum Threads | {N} | — |
| Wiki Articles | {N} | — |
| Meetups | {N} | — |

## Moderation Queue
| Status | Count | Oldest Item |
|--------|-------|-------------|
| Pending Human Review | {N} | {date or "—"} |
| Auto-Rejected (needs review) | {N} | {date or "—"} |
| Recently Rejected (human) | {N} | — |

## Promotion Pipeline
### Members → Maker
| User | First Build Published | Days Ago | Status |
|------|----------------------|----------|--------|
| {name} | {date} | {N} | {⏳ waiting / ⚠️ overdue} |

### Makers → Trusted Maker
| User | Accepted Builds | Needed | Status |
|------|----------------|--------|--------|
| {name} | {N} | 3 | {⏳ N to go / ✅ eligible} |

### Pending Mod Nominations
| User | Nominated By | Nominated At |
|------|-------------|-------------|
| {name} | {name} | {date} |

## API Adoption
| Metric | Value |
|--------|-------|
| Active PATs | {N} |
| Users with Tokens | {N} |
| Recent API Calls (7d) | {N} |

## Recommendations
1. {Prioritized action items based on findings}
2. {e.g., "Process 3 stale builds in moderation queue"}
3. {e.g., "Review 1 overdue maker promotion"}
```

## Key Reference Files

Read these files **only when you need deeper context** during report generation:

| File | When to Read |
|------|-------------|
| [`src/lib/roles.ts`](../../../src/lib/roles.ts) | If unsure about role name mappings |
| [`src/lib/promotion.ts`](../../../src/lib/promotion.ts) | If unsure about promotion thresholds |
| [`src/db/schema.ts`](../../../src/db/schema.ts) | If MCP response fields are unclear |
| [`AGENTS.md`](../../../AGENTS.md) §5 | For full role permission matrix |
| [`mcp-server/src/tools/admin.ts`](../../../mcp-server/src/tools/admin.ts) | If MCP tool params need clarification |

## Troubleshooting

- **MCP tool returns 401:** Token expired or revoked. Ask the user to regenerate at `/settings`.
- **MCP tool returns 403:** Token lacks admin scope. This skill requires ADMIN role.
- **Empty user list:** Paginate — default limit is 50. Check if `page` param needs incrementing.
- **No PAT data:** The PAT system may not be active. Skip the API Adoption section gracefully.
- **Promotion candidates look wrong:** Cross-reference with [`src/lib/promotion.ts`](../../../src/lib/promotion.ts) — promotions are one-step-at-a-time (member→maker first, then maker→trusted_maker on next check).
