---
name: guidelines-check
description: Sweeps recent forum posts, wiki edits, build descriptions, and comments across cyberdeck.club for compliance with community guidelines — checking for welcoming tone, inclusive language, on-topic content, and spam — and categorizes findings by severity.
---

# Guidelines Compliance Check

## When to Use

- Regular community content compliance sweeps ("check the vibe")
- When a specific piece of content has been reported for guideline issues
- When the community guidelines have been updated and existing content needs review
- When onboarding a new moderator and demonstrating how to evaluate content
- When the admin asks "how's the community health?" or "any guideline violations lately?"

## When NOT to Use

- **Moderation queue processing** (pending builds, approvals/rejections) → use the `moderation-queue` skill
- **Community metrics** (user counts, growth, activity stats) → use the `community-metrics` skill
- **Security audits** (PAT tokens, role distribution, access control) → use the `security-audit` skill
- **Safety incidents** (harassment reports, bans, enforcement actions) → use the `safety-management` skill
- **Creating content** (wiki articles, build showcases, static pages) → use the `content-page-builder` skill

## Nature of This Skill

This is a **read-only, analytical** skill. It identifies guideline issues and recommends actions but does NOT delete/edit content or ban users. All findings are presented to the admin for decision-making.

**Harm reduction:** When quoting content that contains slurs, hate speech, or other harmful language, **redact the harmful terms** in the report. The goal is to identify the issue, not amplify the harm.

**Tone rule:** When drafting suggested responses for guideline violations, follow the project's tone — warm, specific, non-punitive, assumes good intent first. Reference [`DESIGN.md`](../../../DESIGN.md) §7 for copy tone guidelines.

## MCP Tools Required

| Tool | Purpose | Key Params |
|------|---------|------------|
| `list_forum_threads` | Enumerate recent forum threads | `page`, `limit`, `category` |
| `list_forum_posts` | Get recent posts across threads | `page`, `limit` |
| `list_wiki_articles` | Get recent wiki articles | `page`, `limit` |
| `get_wiki_article` | Full article content for deep review | `id` |
| `get_wiki_article_history` | Check recent edits for vandalism | `id` |
| `list_builds` | Get published builds for content review | `page`, `status` |
| `get_build` | Full build content for deep review | `slug` |
| `list_build_comments` | Review build comments for tone | `slug` |
| `list_users` | Author context lookup | `page`, `limit` |

> All tools above are **read-only**. No user confirmation needed before calling.

## Workflow

### Step 1: Load Guidelines Context

1. Read [`src/lib/guidelines.ts`](../../../src/lib/guidelines.ts) to understand the current community guidelines definitions and versioning.
2. Read [`DESIGN.md`](../../../DESIGN.md) §7 (Copy & Tone) for tone standards.
3. Read [`AGENTS.md`](../../../AGENTS.md) §5 for role system context (who can post where).
4. Establish the review criteria:

| # | Criterion | What Constitutes a Violation |
|---|-----------|------------------------------|
| 1 | **Welcoming tone** | Gatekeeping, dismissive language, assuming expertise levels |
| 2 | **Inclusive language** | Slurs, deadnaming, misgendering, exclusionary terminology |
| 3 | **On-topic** | Content unrelated to cyberdecks, maker culture, or community topics |
| 4 | **No spam** | Promotional content, affiliate links, AI-generated slop, not genuine contributions |
| 5 | **Constructive** | Personal attacks, unconstructive criticism, pile-ons |
| 6 | **Safe space** | Harassment, doxxing, intimidation, sharing private information |

### Step 2: Scan Forum Activity

1. Call `list_forum_threads` to enumerate recent threads. Paginate through all pages.
2. Call `list_forum_posts` to get recent posts across threads. Paginate through all pages.
3. For each post, evaluate against all six guideline criteria.
4. Pay special attention to:
   - **New member first posts** — may not know community norms yet (educational response, not punitive)
   - **Threads with high reply counts** — heated discussions are more likely to escalate
   - **Posts in categories that tend toward debate** — technical disagreements can turn exclusionary (e.g., "real cyberdecks" gatekeeping)

### Step 3: Scan Wiki Edits

1. Call `list_wiki_articles` to get recent articles. Paginate through all pages.
2. For articles with recent edits, call `get_wiki_article_history` to review edit history.
3. Check article content and edit summaries for:
   - **Vandalism or malicious edits** — blanking content, inserting spam
   - **Gatekeeping language** — e.g., "real cyberdecks" dismissing aesthetic builds
   - **Accuracy issues** in technical content
   - **Bias or exclusionary framing** — assuming audience gender, expertise, etc.
4. Flag edits by new makers (maker for < 30 days) per [`AGENTS.md`](../../../AGENTS.md) §5.5 wiki safety rules.

### Step 4: Scan Build Submissions

1. Call `list_builds` with `status: "published"` to review recent published builds. Paginate through all pages.
2. For builds with concerning descriptions, call `get_build` for full content.
3. Call `list_build_comments` for builds with comments to review comment tone.
4. Check build descriptions and comments for:
   - Guidelines compliance across all six criteria
   - Toxic interactions in comment threads
   - Gatekeeping responses to non-traditional builds (Polly Pocket, dinosaur toy, purse builds, etc.)

### Step 5: Categorize Findings

For each finding, classify by severity:

| Severity | Label | Examples | Response Type |
|----------|-------|----------|---------------|
| 🔴 | **Critical** | Harassment, hate speech, doxxing, safety threats | Requires immediate action |
| 🟠 | **High** | Gatekeeping, exclusionary language, personal attacks | Requires prompt response |
| 🟡 | **Medium** | Off-topic content, mild spam, unconstructive criticism | Address when convenient |
| 🟢 | **Low** | Tone suggestions, minor guideline awareness opportunities | Educational moment |

**Distinguishing educational vs enforcement responses:**
- "Didn't know the norms" (new member, first offense, language suggests unawareness) → educational response: gentle, informative, welcoming
- "Knowingly violating" (repeat behavior, warned before, deliberately hostile) → enforcement response: clear, firm, references specific guideline

### Step 6: Generate Compliance Report

Format the full review as structured markdown:

```markdown
# 📜 Community Guidelines Compliance Report — {YYYY-MM-DD}

## Summary
| Severity | Count |
|----------|-------|
| 🔴 Critical | X |
| 🟠 High | X |
| 🟡 Medium | X |
| 🟢 Low | X |
| ✅ No Issues | X surfaces clean |

## Findings

### 🔴 Critical Issues
#### {Content Type} — {Location}
- **Author:** {display name} (ID: {id}, Role: {role})
- **Content:** {relevant excerpt — redact harmful terms}
- **Guideline Violated:** {specific criterion from Step 1}
- **Recommended Action:** {specific recommendation}
- **Draft Response:** {if communication needed — warm, non-punitive tone}

### 🟠 High Priority
#### {Content Type} — {Location}
- **Author:** {display name} (ID: {id}, Role: {role})
- **Content:** {relevant excerpt}
- **Guideline Violated:** {specific criterion}
- **Recommended Action:** {specific recommendation}
- **Draft Response:** {if needed}

### 🟡 Medium Priority
#### {Content Type} — {Location}
- **Author:** {display name} (ID: {id}, Role: {role})
- **Content:** {relevant excerpt}
- **Concern:** {description}
- **Recommended Action:** {specific recommendation}

### 🟢 Low Priority / Educational
- {Minor observations and tone suggestions}

## Overall Community Health Assessment
{Narrative summary of community tone and trends — what's going well, what patterns are emerging, any systemic concerns}

## Recommendations
1. {Prioritized action items}
2. {Next action}
```

If no findings in a severity category, omit that section entirely. If all content is clean, report a positive summary.

## Key Reference Files

Read these files **only when you need deeper context** during the review:

| File | When to Read |
|------|-------------|
| [`src/lib/guidelines.ts`](../../../src/lib/guidelines.ts) | To understand current guidelines definitions and versioning |
| [`src/pages/guidelines.astro`](../../../src/pages/guidelines.astro) | To read the actual community guidelines text shown to users |
| [`DESIGN.md`](../../../DESIGN.md) §7 | For copy tone guidelines when drafting responses |
| [`AGENTS.md`](../../../AGENTS.md) §5 | For role system, permissions, and wiki safety rules |
| [`src/lib/moderation.ts`](../../../src/lib/moderation.ts) | If checking what automated content checks already exist |
| [`src/lib/roles.ts`](../../../src/lib/roles.ts) | If unsure about role name mappings or level values |
| [`src/db/schema.ts`](../../../src/db/schema.ts) | If content response fields are unclear |

## Troubleshooting

- **MCP tool returns 401:** Token expired or revoked. Ask the user to regenerate at `/settings`.
- **MCP tool returns 403:** Token lacks required scope. Content listing tools require appropriate read scopes; `list_users` requires `admin:read` (ADMIN role).
- **No content returned:** The platform may be new or have very little content. Report "No content to review" — this is not an error.
- **Author not found in `list_users`:** Paginate through all pages. If still not found, the account may have been deleted — note "author unknown" in the finding.
- **Guidelines file not found:** The guidelines may not be implemented yet. Fall back to the six criteria defined in Step 1 and note the missing file in the report.
