---
name: security-audit
description: Reviews PAT token inventory, analyzes API usage logs for suspicious patterns, audits role distribution and changes, checks scope compliance, and reviews banned user records for cyberdeck.club. Use for regular security check-ins, after suspicious activity reports, when reviewing token revocations, or when auditing role changes and bans.
---

# Security Audit

## When to Use

- Regular security check-ins (weekly recommended)
- After suspicious activity is reported
- When reviewing whether to revoke tokens
- When auditing role changes or bans
- When a new user reports unauthorized access
- When the admin asks about security posture

## When NOT to Use

- **Community health metrics** (user counts, content activity) → use the `community-metrics` skill
- **Moderation actions** (approving/rejecting builds) → use the `moderation-queue` skill
- **Content guideline checking** → use the `guidelines-compliance` skill
- **Safety incidents** (harassment, active bans) → use the `safety-management` skill
- **Creating content pages** → use the `content-page-builder` skill

## Nature of This Skill

This is a **read-only** skill. It analyzes security posture and produces a report with recommendations. It does NOT revoke tokens, ban users, or change roles. Any remediation actions are presented as recommendations requiring explicit user confirmation.

**Privacy rule:** Never expose full token values in output. Show only token IDs and name/label fields.

## MCP Tools Required

| Tool | Source File | Purpose | Params |
|------|------------|---------|--------|
| `list_all_tokens` | `mcp-server/src/tools/admin.ts` | PAT inventory enumeration | `page`, `pageSize`, `userId` |
| `list_token_logs` | `mcp-server/src/tools/admin.ts` | API usage log analysis | `page`, `limit`, `userId`, `tokenId` |
| `list_users` | `mcp-server/src/tools/admin.ts` | User and role data | `page`, `limit` |
| `get_user` | `mcp-server/src/tools/admin.ts` | Individual user deep-dive when anomalies found | `userId` |

> All tools above are **read-only** and require ADMIN role. No user confirmation needed before calling.

## Workflow

### Step 1: PAT Token Inventory

1. Call `list_all_tokens` with `pageSize: 100`. Paginate through all pages to get the full token list.
2. Categorize each token by status: **active**, **revoked**, **expired**.
3. For each active token, call `list_token_logs` with `tokenId` to check last usage.
4. Flag these concerns:
   - **Stale tokens:** Active but unused for 90+ days (or never used)
   - **Overly broad scopes:** Tokens with `*` (full access) scope, especially on non-admin users
   - **Tokens on banned users:** Active tokens where the owning user has `bannedAt` set
5. Report token count per user and total by status category.

### Step 2: API Usage Analysis

1. Call `list_token_logs` with `limit: 100`. Paginate through recent pages to get sufficient log data.
2. Analyze for suspicious patterns:
   - **High volume:** Unusually high request count from a single token (compare against average)
   - **Failed requests:** 4xx status codes — may indicate probing or misconfigured clients
   - **Scope violations:** Access attempts to admin endpoints from non-admin tokens (should be blocked by middleware, but worth flagging)
   - **Unusual patterns:** Clusters of activity at unusual times, or sudden spikes
3. Report top API consumers by request volume.

### Step 3: Role Distribution Audit

1. Call `list_users` with `limit: 50`. Paginate through all pages.
2. Count users by role. Map role strings to display names:

   | DB Value | Display Name | Level |
   |----------|-------------|-------|
   | *(null/missing)* | Visitor | 0 |
   | `member` | Member | 10 |
   | `maker` | Maker | 20 |
   | `trusted_maker` | Trusted Maker | 30 |
   | `moderator` | Moderator | 40 |
   | `admin` | Admin | 50 |

3. Verify distribution follows expected pyramid (many members, fewer makers, very few admins).
4. Check for anomalies:
   - Users with Maker role but `acceptedBuildCount` of 0 (role may have been manually assigned)
   - Users who appear to have skipped expected progression steps
   - Multiple admin accounts (currently expected to be sole admin)
   - Moderators without mod nomination records (`isModNominated` false but role is moderator)

> Reference: [`src/lib/roles.ts`](../../../src/lib/roles.ts) for role constants and [`src/lib/promotion.ts`](../../../src/lib/promotion.ts) for promotion logic.

### Step 4: Scope Compliance Check

1. For each active token from Step 1, compare the token's scopes against the owner's current role.
2. Use the min-role requirements from [`src/lib/token-scopes.ts`](../../../src/lib/token-scopes.ts):

   | Scope | Min Role |
   |-------|----------|
   | `builds:read` | Visitor (0) |
   | `builds:write` | Member (10) |
   | `wiki:read` | Visitor (0) |
   | `wiki:write` | Maker (20) |
   | `forum:read` | Visitor (0) |
   | `forum:write` | Maker (20) |
   | `meetups:read` | Visitor (0) |
   | `meetups:write` | Trusted Maker (30) |
   | `profile:read` | Member (10) |
   | `profile:write` | Member (10) |
   | `moderation:read` | Trusted Maker (30) |
   | `moderation:write` | Trusted Maker (30) |
   | `admin:read` | Admin (50) |
   | `admin:write` | Admin (50) |
   | `*` | Member (10) |

3. Flag any token whose scopes exceed the user's current role level (e.g., user was demoted but token retains old scopes — middleware blocks at runtime, but the token itself is a mismatch).
4. Note: The `*` scope has `minRole: MEMBER` at creation, but grants unrestricted access. Flag any non-admin user holding a `*` scope token.

### Step 5: Banned User Review

1. From the user list in Step 3, filter users where `bannedAt` is not null.
2. For each banned user, report:
   - Ban reason (`banReason`) and who issued it (`bannedBy`)
   - Ban timestamp (`bannedAt`)
   - Whether the user holds any active (non-revoked) tokens — these should be effectively blocked by middleware but are worth noting
   - Any patterns across banned users (similar ban reasons, clustering of ban dates)
3. If no banned users exist, report "No banned users found."

### Step 6: Authentication System Health

This step is a **code review checklist** — read source files and report on configuration.

1. Read [`src/lib/auth.ts`](../../../src/lib/auth.ts) — check:
   - Magic link token expiry settings (recommended: 15 minutes)
   - Session cookie configuration (should be HTTP-only, secure, SameSite)
2. Read [`src/middleware.ts`](../../../src/middleware.ts) — check:
   - PAT authentication enforcement in middleware
   - CSRF protection status
   - Whether banned user checks happen at the middleware level
3. Read [`src/lib/pat-auth.ts`](../../../src/lib/pat-auth.ts) — check:
   - Token validation flow (hash comparison, expiry, revocation checks)
   - Whether usage is logged on every request
4. Report any configuration concerns or deviations from best practices.

### Step 7: Generate Security Report

Format all findings as structured markdown using the output template below. Include:
- Timestamp and audit scope in the header
- Executive summary with severity-classified finding counts
- Severity indicators: 🔴 Critical, 🟡 Warning, 🟢 Info
- Detailed sections for each audit area (never skip a section — report "No issues found" for clean areas)
- Recommendations prioritized by severity

## Output Template

```markdown
# 🔒 Security Audit Report — {YYYY-MM-DD}

## Executive Summary
- 🔴 Critical Issues: {N}
- 🟡 Warnings: {N}
- 🟢 Informational: {N}

## PAT Token Inventory
| Status | Count |
|--------|-------|
| Active | {N} |
| Revoked | {N} |
| Expired | {N} |
| **Total** | **{N}** |

### ⚠️ Token Flags
| Concern | Count | Details |
|---------|-------|---------|
| Full access (`*`) tokens | {N} | {user list} |
| Stale tokens (unused 90+ days) | {N} | {token IDs} |
| Tokens on banned users | {N} | {token IDs} |

### Tokens Per User
| User | Active | Revoked | Total |
|------|--------|---------|-------|
| {displayName} | {N} | {N} | {N} |

## API Usage Analysis
| Metric | Value |
|--------|-------|
| Total API calls (recent) | {N} |
| Unique tokens used | {N} |
| Failed requests (4xx) | {N} |
| Server errors (5xx) | {N} |

### Top API Consumers
| Token ID | User | Request Count |
|----------|------|---------------|
| {id} | {name} | {N} |

### Suspicious Patterns
- {List any unusual activity, or "None detected"}

## Role Distribution
| Role | Count | % of Total | Expected? |
|------|-------|------------|-----------|
| Admin | {N} | {%} | ✅/⚠️ |
| Moderator | {N} | {%} | ✅/⚠️ |
| Trusted Maker | {N} | {%} | ✅/⚠️ |
| Maker | {N} | {%} | ✅/⚠️ |
| Member | {N} | {%} | ✅/⚠️ |
| **Total** | **{N}** | **100%** | — |

### Role Anomalies
- {List any anomalies, or "None detected"}

## Scope Compliance
| Token ID | User | User Role | Flagged Scopes | Concern |
|----------|------|-----------|---------------|---------|
| {id} | {name} | {role} | {scopes} | {reason} |

## Banned Users
| User | Banned At | Reason | Banned By | Active Tokens? |
|------|-----------|--------|-----------|----------------|
| {name} | {date} | {reason} | {admin} | {yes/no} |

## Auth System Health
| Check | Status | Notes |
|-------|--------|-------|
| Magic link expiry | ✅/⚠️ | {details} |
| Session cookie config | ✅/⚠️ | {details} |
| CSRF protection | ✅/⚠️ | {details} |
| Banned user middleware check | ✅/⚠️ | {details} |
| PAT usage logging | ✅/⚠️ | {details} |

## Recommendations
1. 🔴 {critical items first}
2. 🟡 {warnings}
3. 🟢 {informational improvements}
```

## Key Reference Files

Read these files **only when you need deeper context** during the audit:

| File | When to Read |
|------|-------------|
| [`src/lib/roles.ts`](../../../src/lib/roles.ts) | If unsure about role name mappings or level values |
| [`src/lib/token-scopes.ts`](../../../src/lib/token-scopes.ts) | If unsure about scope-to-role min requirements |
| [`src/lib/pat-auth.ts`](../../../src/lib/pat-auth.ts) | For Step 6 — understanding PAT validation flow |
| [`src/lib/auth.ts`](../../../src/lib/auth.ts) | For Step 6 — magic link and session configuration |
| [`src/middleware.ts`](../../../src/middleware.ts) | For Step 6 — middleware auth enforcement |
| [`src/lib/promotion.ts`](../../../src/lib/promotion.ts) | If checking whether role progression anomalies are genuine |
| [`src/db/schema.ts`](../../../src/db/schema.ts) | If MCP response fields are unclear (ban fields, role columns) |
| [`docs/PAT-API-TOKENS.md`](../../../docs/PAT-API-TOKENS.md) | For PAT system design reference |
| [`AGENTS.md`](../../../AGENTS.md) §5 | For full role permission matrix |
| [`mcp-server/src/tools/admin.ts`](../../../mcp-server/src/tools/admin.ts) | If MCP tool params need clarification |

## Troubleshooting

- **MCP tool returns 401:** Token expired or revoked. Ask the user to regenerate at `/settings`.
- **MCP tool returns 403:** Token lacks admin scope. This skill requires ADMIN role and `admin:read` scope.
- **Empty token list:** May be legitimate — the PAT system may have no tokens yet. Report as "No PATs issued."
- **Empty user list:** Paginate — default limit is 50. Check if `page` param needs incrementing.
- **No banned users:** Not an error — report "No banned users found" in that section.
- **Auth source files not found:** File paths may have changed. Use `search_files` to locate `requireRole`, `validatePat`, or `magicLink` functions.
