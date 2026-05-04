---
name: safety-management
description: Handles harassment and safety incidents for cyberdeck.club end-to-end — evidence gathering across content surfaces, pattern analysis of harmful behavior, severity assessment on a 4-level scale, enforcement recommendations (warnings, bans), and draft communications following community tone guidelines.
---

# Safety Incident Management

## When to Use

- When a harassment or safety report is received
- When investigating a pattern of behavior from a specific user
- When deciding whether to ban or warn a user
- When drafting enforcement communication (warnings, ban notifications)
- When reviewing the effectiveness of past enforcement actions
- When a moderator needs guidance on how to handle a sensitive situation
- When the admin says "someone reported…" or "I noticed this user…"

## When NOT to Use

- **Proactive content sweeps** (no specific incident) → use the `guidelines-check` skill
- **Moderation queue processing** (pending builds, approvals) → use the `moderation-queue` skill
- **Community metrics** (user counts, growth, activity stats) → use the `community-metrics` skill
- **Security audits** (PAT tokens, role distribution, access control) → use the `security-audit` skill
- **Creating content** (wiki articles, build showcases) → use the `content-page-builder` skill

## Nature of This Skill

This is an **investigation and recommendation** skill. It gathers evidence, analyzes patterns, assesses severity, and drafts communications — but it does **NOT** execute bans, send messages, or delete content directly. All enforcement actions require explicit admin confirmation before execution.

**Privacy:** NEVER expose email addresses, auth tokens, or other PII in reports. Use display names and user IDs only.

**Harm reduction:** When quoting harmful content as evidence, **redact slurs and doxxed information** in the report. The goal is to document the violation, not amplify the harm.

**Guardrail:** NEVER recommend hard-deletion of user accounts. Only soft-ban via `banned_at` timestamp per project rules ([`AGENTS.md`](../../../AGENTS.md) §10).

## MCP Tools Required

| Tool | Purpose | Key Params |
|------|---------|------------|
| `list_users` | Look up subject/reporter accounts, check ban status, roles | `page`, `limit` |
| `list_forum_threads` | Find threads started by subject | `page`, `limit` |
| `list_forum_posts` | Find forum posts by subject, review interactions | `page`, `limit` |
| `list_builds` | Find builds submitted by subject | `page`, `status` |
| `get_build` | Examine specific build content in detail | `slug` |
| `list_build_comments` | Review comment behavior on builds | `slug` |
| `list_wiki_articles` | Check subject's wiki contributions | `page`, `limit` |
| `get_wiki_article_history` | Check for wiki vandalism by subject | `id` |

> All tools above are **read-only**. No user confirmation needed before calling.
>
> **Note:** Banning a user (`banned_at`, `banned_by`, `ban_reason` fields) is done through the admin UI at [`src/pages/admin/users/[id].astro`](../../../src/pages/admin/users/%5Bid%5D.astro). There is no `ban_user` MCP tool yet. The skill recommends the ban and provides field values, then directs the admin to the UI.

## Workflow

### Step 1: Incident Intake

1. Ask the admin for context:
   - What was reported? (specific content, behavior pattern, or general concern)
   - Who reported it? (display name, or "admin-initiated" if self-discovered)
   - Who is the subject? (display name or user ID)
   - Where did it happen? (forum thread, build comment, wiki edit, etc.)
   - When did it happen? (approximate date/timeframe)
2. If a specific user is named, call `list_users` and filter by name/ID to look up their profile.
3. Document the initial report details before proceeding.

### Step 2: Evidence Gathering

Systematically gather the subject's content across **all** surfaces:

1. Call `list_forum_posts` — paginate through all pages, filter for posts by the subject.
2. Call `list_forum_threads` — find threads the subject started.
3. Call `list_builds` — find builds submitted by the subject.
4. For each build found, call `list_build_comments` to review their comment behavior.
5. Call `list_wiki_articles` — check wiki contributions. For suspicious articles, call `get_wiki_article_history`.

**Look for patterns:**
- Escalating hostility over time (tone shifting from borderline to hostile)
- Targeting specific users or groups (repeated negative interactions with the same people)
- Coordinated harassment (multiple accounts with similar patterns, timing, or language)
- Dogwhistles or coded language (terms that seem innocuous but carry hostile meaning in context)
- Boundary testing (pushing limits of guidelines incrementally, retreating when called out, then pushing again)

### Step 3: Context Analysis

**Subject account context:**
- Account age and current role level (use role system from [`AGENTS.md`](../../../AGENTS.md) §5)
- Previous warnings or moderation actions (check `banned_at`, `ban_reason` fields)
- Ban history — has this user been banned before?
- Positive contributions — builds published, helpful forum posts, wiki edits (context for proportional response)

**Reporter context** (if applicable):
- Credibility of the report (does the reported content exist? does it match the description?)
- Previous reports filed by this person (pattern of reporting?)
- Relationship to subject (any history of interactions between reporter and subject?)

### Step 4: Severity Assessment

Classify the incident on a 4-level scale:

| Level | Name | Description | Typical Response |
|-------|------|-------------|------------------|
| 1 | **Low** | Unintentional guideline violation, first offense, likely doesn't know the norms | Educational DM, no enforcement |
| 2 | **Medium** | Repeated minor violations or single significant violation | Formal warning citing specific behavior |
| 3 | **High** | Targeted harassment, hate speech, or persistent violations after warning | Temporary ban (soft-ban via `banned_at`) |
| 4 | **Critical** | Doxxing, threats, coordinated harassment, illegal content | Immediate permanent ban, potential law enforcement referral |

**Assessment factors:**
- Severity of the content itself (slur vs. tone issue)
- Pattern vs. isolated incident
- Impact on targeted individuals and the broader community
- Subject's history (first offense vs. repeat violator)
- Whether the subject holds a position of trust (Maker+, Moderator)

### Step 5: Enforcement Recommendations

Based on severity, recommend specific actions:

**Level 1 — Educational:**
- Draft an educational message explaining community norms
- Reference the specific content and why it's a concern
- Assume good intent — frame as "you may not have realized"
- No enforcement action needed

**Level 2 — Formal Warning:**
- Draft a formal warning citing specific violations and the relevant guidelines
- Set clear expectations for future behavior
- Note explicitly that further violations will result in escalation
- Document the warning for future reference

**Level 3 — Temporary Ban:**
- Recommend soft-ban via admin UI at [`src/pages/admin/users/[id].astro`](../../../src/pages/admin/users/%5Bid%5D.astro)
- Draft a ban notification with specific ban duration
- Provide values for `ban_reason` field
- Recommend locking any related threads
- Recommend removing/editing harmful content

**Level 4 — Permanent Ban:**
- Recommend immediate soft-ban via admin UI
- Draft ban notification
- Document evidence preservation steps (screenshots, timestamps, exact content)
- Note if external reporting is warranted (threats → law enforcement, platform ToS violations)
- Recommend locking all related threads and removing harmful content

### Step 6: Draft Communications

All communications MUST follow the project's tone (see [`DESIGN.md`](../../../DESIGN.md) §7):

- **Plainspoken** — Clear, direct, no corporate jargon or legalistic language
- **Warm** — Acknowledge the person's humanity even in enforcement
- **Specific** — Cite exact content/behavior, not vague accusations
- **Non-punitive framing** — "This behavior isn't compatible with our community values" not "You are bad"
- **Inclusive** — Remember the community centers historically excluded groups; enforcement protects them

**Draft these communications as applicable:**

#### Educational Message (Level 1)
```
Hi {name}, I'm reaching out about some content you posted recently in {location}.

{Specific description of what was flagged and why it's a concern.}

Our community guidelines ask that {relevant guideline}. We know norms vary across spaces, and we appreciate you being here — we just want to make sure everyone feels welcome.

If you have questions about the guidelines, feel free to reply. We're glad to have you building with us.
```

#### Formal Warning (Level 2)
```
Hi {name}, I'm reaching out about {specific behavior/content} in {location}.

{Description of the violation with specific quotes/references.}

This conflicts with our community guidelines around {specific guideline category}. {Explanation of impact on others.}

Going forward, we ask that {clear expectation}. Continued violations may result in restrictions on your account.

We value your contributions to the community and hope we can move forward positively. If you have questions, please reply.
```

#### Ban Notification (Level 3–4)
```
Hi {name}, after reviewing recent activity on your account, we've made the difficult decision to {temporarily restrict / permanently suspend} your access to cyberdeck.club.

This is in response to {specific behavior — cite incidents without naming other users}.

{For temporary:} This restriction will last {duration}. After that period, your access will be restored.
{For permanent:} This decision was not made lightly.

If you believe this was made in error, you can reach us at {contact method}.
```

#### Reporter Acknowledgment
```
Thank you for bringing this to our attention. We take reports like this seriously — keeping our community safe for everyone is a priority.

We've reviewed the situation and taken appropriate action. For privacy reasons, we can't share the specifics of any actions taken regarding another member's account.

If you experience any further issues, please don't hesitate to reach out.
```

### Step 7: Generate Incident Report

Format the complete investigation as:

```markdown
# 🚨 Safety Incident Report — {YYYY-MM-DD}

## Incident Summary
- **Reported by:** {display name or "admin-initiated"}
- **Subject:** {display name} (ID: {id}, Role: {role})
- **Date reported:** {date}
- **Severity:** Level {1-4} — {Low/Medium/High/Critical}

## Evidence
### Content Timeline
| Date | Surface | Content | Concern |
|------|---------|---------|---------|
| {date} | {Forum/Build/Wiki/Comment} | {excerpt — redact harmful terms} | {specific issue} |

### Pattern Analysis
{Narrative of behavioral patterns observed — escalation, targeting, coordination, boundary testing}

## Subject Account Context
- **Account age:** {X days}
- **Role:** {role name} (level {N})
- **Builds published:** {count}
- **Forum posts:** {count}
- **Wiki edits:** {count}
- **Previous warnings:** {count}
- **Previous bans:** {count — with dates and reasons if any}

## Reporter Context
- **Reporter:** {display name or "admin-initiated"}
- **Report credibility:** {assessment}
- **Previous reports by this person:** {count}

## Severity Assessment
{Detailed justification for severity level, referencing specific evidence and assessment factors}

## Recommended Actions
1. {Specific enforcement action — e.g., "Soft-ban user via admin UI"}
2. {Communication action — e.g., "Send Level 2 warning message"}
3. {Content action — e.g., "Lock thread ID xxx via admin UI"}
4. {Follow-up action — e.g., "Monitor for 30 days after warning"}

## Draft Communications
### To Subject
{Draft message from Step 6}

### To Reporter
{Acknowledgment draft from Step 6}

## Follow-Up
- [ ] {Execute enforcement action via admin UI}
- [ ] {Send communication to subject}
- [ ] {Send acknowledgment to reporter}
- [ ] {Document in enforcement log}
- [ ] {Set monitoring reminder for {date}}
```

## Key Reference Files

Read these files **only when you need deeper context** during investigation:

| File | When to Read |
|------|-------------|
| [`src/lib/guidelines.ts`](../../../src/lib/guidelines.ts) | To understand current guidelines definitions for violation mapping |
| [`src/pages/guidelines.astro`](../../../src/pages/guidelines.astro) | To read the actual community guidelines text shown to users |
| [`src/lib/moderation.ts`](../../../src/lib/moderation.ts) | If checking what automated moderation checks exist |
| [`src/db/schema.ts`](../../../src/db/schema.ts) | If content response fields are unclear or to verify ban-related fields |
| [`src/lib/roles.ts`](../../../src/lib/roles.ts) | If unsure about role name mappings or level values |
| [`src/pages/admin/users/[id].astro`](../../../src/pages/admin/users/%5Bid%5D.astro) | To understand the admin UI for ban execution |
| [`DESIGN.md`](../../../DESIGN.md) §7 | For copy tone guidelines when drafting communications |
| [`AGENTS.md`](../../../AGENTS.md) §5 | For role system, ban rules, and the "no hard-delete" guardrail |

## Troubleshooting

- **MCP tool returns 401:** Token expired or revoked. Ask the user to regenerate at `/settings`.
- **MCP tool returns 403:** Token lacks required scope. `list_users` requires `admin:read` (ADMIN role). Other listing tools require appropriate read scopes.
- **No content returned for subject:** The user may have very little activity, or content may have already been removed. Note gaps in the evidence section.
- **Subject not found in `list_users`:** Paginate through all pages. If still not found, the account may have been deleted — note "subject not found" and ask the admin for more context.
- **Reporter and subject accounts appear linked:** Flag as potential coordinated behavior or self-reporting. Do not dismiss the report — investigate both accounts.
- **Severity is ambiguous:** Default to the higher severity level. It's easier to de-escalate than to under-respond to a safety threat.
- **No `ban_user` MCP tool available:** Direct the admin to execute the ban through the web admin UI at `/admin/users/{id}`. Provide the exact values for `ban_reason`.
