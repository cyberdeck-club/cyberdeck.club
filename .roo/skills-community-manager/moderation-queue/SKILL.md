---
name: moderation-queue
description: Walks through pending builds, flagged content, and reported posts in the cyberdeck.club moderation queue. Reviews content against community guidelines and auto-review results, checks author context, and produces approve/reject/needs-edit recommendations with reasoning.
---

# Moderation Queue

## When to Use

- When the admin wants to process the build moderation queue
- When checking if any builds are waiting for review
- When a specific build needs detailed review
- When investigating why a build was auto-rejected
- When the admin asks "what's in the mod queue?"

## When NOT to Use

- **Community health metrics** (user counts, content activity) → use the `community-metrics` skill
- **Security audits** (PAT tokens, role distribution) → use the `security-audit` skill
- **Content guideline sweeps** (forum posts, wiki, comments) → use the `guidelines-compliance` skill
- **Safety incidents** (harassment reports, bans) → use the `safety-management` skill
- **Creating content** (wiki articles, build showcases) → use the `content-page-builder` skill

## Nature of This Skill

This skill involves **read operations and recommendation generation**. It does NOT approve or reject builds directly. All recommendations are presented to the admin for confirmation. Actual approval/rejection must be executed through the admin UI at `/admin/builds/` or via the review API endpoint.

**Tone rule:** Rejection feedback must follow the project's tone — warm, constructive, specific, non-punitive. Reference `DESIGN.md` §7 for copy tone guidelines.

## MCP Tools Required

| Tool | Source File | Purpose | Key Params |
|------|-----------|---------|------------|
| `list_builds` | `mcp-server/src/tools/builds.ts` | Queue inventory — filter by status | `page`, `status`, `category` |
| `get_build` | `mcp-server/src/tools/builds.ts` | Full build details for review | `slug` |
| `list_build_comments` | `mcp-server/src/tools/builds.ts` | Check existing discussion on a build | `slug` |
| `list_users` | `mcp-server/src/tools/admin.ts` | Author lookup and context | `page`, `limit` |

> All tools above are **read-only**. No user confirmation needed before calling.
>
> **Note:** There is no `get_user` MCP tool. To look up a specific author, call `list_users` and filter by user ID from the build's author data. There is also no `review_build` MCP tool — approvals/rejections must go through the admin UI or API.

## Workflow

### Step 1: Queue Inventory

1. Call `list_builds` with `status: "pending_human"` to find builds awaiting human review. Paginate through all pages.
2. Call `list_builds` with `status: "rejected_auto"` to find auto-rejected items that may need manual override.
3. Report:
   - Total queue depth (pending_human + rejected_auto counts)
   - Age of oldest pending item (calculate from submission date)
   - If both queues are empty, report "Queue is clear — no items pending review" and stop.

### Step 2: Gather Build Context (for each pending build)

For each item from Step 1:

1. Call `get_build` with the build's `slug` to get full details:
   - Title, description, content (markdown body)
   - Hero image URL
   - Author ID and display name
   - `autoReviewResult` field (JSON — the LLM auto-review output)
   - `status` and submission timestamp
2. Call `list_build_comments` with the build's `slug` to check for existing reviewer discussion.
3. Call `list_users` and locate the author by their user ID. Note:
   - Current role (member / maker / trusted_maker / moderator / admin)
   - `acceptedBuildCount` — number of previously approved builds
   - `firstBuildPublishedAt` — when their first build was published (if ever)
   - `bannedAt` — whether the author is currently banned
   - `createdAt` — account age
   - Whether they've accepted community guidelines (if available in response)

> **Role display mapping:** Use [`src/lib/roles.ts`](../../../src/lib/roles.ts) values:
> | DB Value | Display | Level |
> |----------|---------|-------|
> | `member` | Member | 10 |
> | `maker` | Maker | 20 |
> | `trusted_maker` | Trusted Maker | 30 |
> | `moderator` | Moderator | 40 |
> | `admin` | Admin | 50 |

### Step 3: Content Review Checklist

For each build, evaluate against ALL of these criteria:

| # | Criterion | What to Check |
|---|-----------|---------------|
| 1 | **Content Safety** | No harassment, hate speech, slurs, or harmful content |
| 2 | **Spam Check** | Not promotional, not AI-generated slop, genuine build content |
| 3 | **On-Topic** | Actually about a cyberdeck or related maker project |
| 4 | **Image Appropriateness** | Hero image URL looks legitimate and relevant (not spam/placeholder) |
| 5 | **Quality Threshold** | Description and content are substantive, not placeholder text |
| 6 | **Community Values** | Celebrates aesthetic expression, uses inclusive language |
| 7 | **Auto-Review Alignment** | Does the `autoReviewResult` make sense? Flag any discrepancies between auto-review and your assessment |

Rate each criterion: ✅ Pass, ⚠️ Borderline, ❌ Fail.

> Reference [`src/lib/moderation.ts`](../../../src/lib/moderation.ts) for the auto-review pipeline logic and [`src/lib/guidelines.ts`](../../../src/lib/guidelines.ts) for community guidelines definitions.

### Step 4: Generate Recommendations

For each queued item, produce exactly one recommendation:

- **✅ APPROVE** — Content passes all checks.
  - Include brief justification citing which criteria were evaluated.

- **❌ REJECT** — Content fails one or more checks.
  - List which criteria failed with specific evidence.
  - Draft a rejection reason (warm, constructive tone per `DESIGN.md` §7).
  - Draft a feedback message for the author. Use "you/your" language, be specific about what needs to change, and frame suggestions positively.

- **✏️ NEEDS EDIT** — Content is close but needs minor fixes before approval.
  - Specify exactly what needs to change.
  - Draft suggested feedback for the author.
  - Note: minor fixes could be made via `update_build` MCP tool if the admin agrees.

- **⚠️ ESCALATE** — Edge case requiring admin policy decision.
  - Explain why this is an edge case.
  - Identify which policy question it raises.
  - Do NOT make a recommendation — present the trade-offs.

**Author context matters:** A banned author's build should be flagged for escalation. A first-time submitter's build should get extra care in feedback tone. A Trusted Maker's build with auto-review failure is unusual and worth flagging.

### Step 5: Queue Summary Report

Format the full review as structured markdown:

```markdown
# 📋 Moderation Queue Review — {YYYY-MM-DD}

## Queue Summary
| Status | Count |
|--------|-------|
| Pending Human Review | {N} |
| Auto-Rejected (review needed) | {N} |
| Total Items Reviewed | {N} |
| Oldest Item Age | {N days} |

## Item Reviews

### 1. "{Build Title}" by {Author Display Name}
- **Slug:** `{slug}`
- **Submitted:** {date}
- **Author Role:** {role} | Accepted Builds: {count} | Member Since: {date}
- **Auto-Review:** PASS/FAIL — {summary of autoReviewResult}
- **Content Review:**
  - Content Safety: ✅/⚠️/❌ — {explanation}
  - Spam Check: ✅/⚠️/❌ — {explanation}
  - On-Topic: ✅/⚠️/❌ — {explanation}
  - Image: ✅/⚠️/❌ — {explanation}
  - Quality: ✅/⚠️/❌ — {explanation}
  - Community Values: ✅/⚠️/❌ — {explanation}
  - Auto-Review Alignment: ✅/⚠️/❌ — {explanation}
- **Recommendation:** ✅ APPROVE / ❌ REJECT / ✏️ NEEDS EDIT / ⚠️ ESCALATE
- **Reasoning:** {brief justification}
- **Draft Feedback:** {if reject or needs-edit — warm, constructive message}

### 2. ...

## Recommended Actions
1. {Prioritized action items — e.g., "Approve build X via admin UI"}
2. {Next action}

## How to Execute
- **Admin UI:** Navigate to `/admin/builds/` to approve or reject builds
- **API endpoint:** `POST /api/builds/{slug}/review` — see `src/pages/api/builds/[slug]/review.ts`
- **Note:** No `review_build` MCP tool exists yet. Execute actions through the admin UI or recommend adding the tool to the MCP server.
```

### Step 6: Action Execution (with confirmation)

After presenting the report:

1. **Wait for explicit user confirmation** before noting any actions. NEVER auto-execute approvals or rejections.
2. If the user approves recommendations:
   - For APPROVE/REJECT: Direct the admin to execute via the admin UI at `/admin/builds/` or the API endpoint at [`src/pages/api/builds/[slug]/review.ts`](../../../src/pages/api/builds/%5Bslug%5D/review.ts).
   - For NEEDS EDIT with minor fixes: Offer to call `update_build` to apply the fix (with confirmation), then re-recommend for approval.
   - For ESCALATE: Record the policy question for future discussion.
3. After each approval, note the promotion implications:
   - First published build that stays live for 7+ days → auto-promotes Member to Maker
   - 3rd accepted build → auto-promotes Maker to Trusted Maker
   - Reference [`src/lib/promotion.ts`](../../../src/lib/promotion.ts) for promotion logic.

## Key Reference Files

Read these files **only when you need deeper context** during the review:

| File | When to Read |
|------|-------------|
| [`src/lib/moderation.ts`](../../../src/lib/moderation.ts) | If unsure what the auto-review checks (title length, spam heuristics) |
| [`src/lib/guidelines.ts`](../../../src/lib/guidelines.ts) | If checking what guidelines the author accepted |
| [`src/lib/promotion.ts`](../../../src/lib/promotion.ts) | If checking how an approval affects the author's role progression |
| [`src/lib/roles.ts`](../../../src/lib/roles.ts) | If unsure about role name mappings or level values |
| [`src/db/schema.ts`](../../../src/db/schema.ts) | If build response fields are unclear (status enum, auto-review schema) |
| [`src/pages/api/builds/[slug]/review.ts`](../../../src/pages/api/builds/%5Bslug%5D/review.ts) | If explaining the full approve/reject API flow |
| [`src/pages/admin/builds/index.astro`](../../../src/pages/admin/builds/index.astro) | If explaining what the admin UI shows |
| [`AGENTS.md`](../../../AGENTS.md) §5.4 | For the full build moderation pipeline spec |
| [`DESIGN.md`](../../../DESIGN.md) §7 | For copy tone guidelines when drafting rejection feedback |
| [`mcp-server/src/tools/builds.ts`](../../../mcp-server/src/tools/builds.ts) | If MCP tool params need clarification |

## Troubleshooting

- **MCP tool returns 401:** Token expired or revoked. Ask the user to regenerate at `/settings`.
- **MCP tool returns 403:** Token lacks required scope. `list_builds` and `get_build` require `builds:read`; `list_users` requires `admin:read` (ADMIN role).
- **No pending builds:** Queue is clear — report "No items pending review" and stop. This is not an error.
- **Build has no `autoReviewResult`:** The auto-review may not have run (e.g., build was created by a Maker+ role and skipped moderation). Note this in the review and evaluate manually.
- **Author not found in `list_users`:** Paginate through all pages. If still not found, the account may have been deleted — flag as ⚠️ ESCALATE.
- **Empty `list_build_comments`:** Normal for new submissions. Note "No existing discussion" and proceed.
