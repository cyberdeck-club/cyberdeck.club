---
name: feedback-impl
description: Implements bugfixes or features based on cyberdeck.club GitHub feedback issues — reads the issue for context, writes an implementation plan comment, executes the code changes following project conventions, then posts a completion summary with files changed and testing notes back to the issue. Use when asked to implement, fix, or build something from a GitHub feedback issue number.
---

# Feedback Implementation

## When to use

- Implementing a bugfix or feature from a GitHub feedback issue (e.g., "implement #42")
- Working through the full lifecycle: issue intake → plan → implement → summary
- Any task that starts with a GitHub issue number and ends with code changes

## When NOT to use

- **Triaging** feedback issues (categorizing, labeling, prioritizing) — use the `feedback-triage` skill in community-manager mode
- Creating feedback issues — the in-app widget handles that
- Issues unrelated to cyberdeck.club (different repo or non-code tasks)
- Pure refactoring or tasks not driven by a feedback issue

## Repository

| Field | Value |
|-------|-------|
| Owner | `cyberdeck-club` |
| Repo | `cyberdeck.club` |
| Project | `1` (org-level ProjectV2) |

## MCP Tools

All tools use the **GitHub MCP server** (prefixed `github--`).

**Read:**
- `get_issue` — Full issue details, comments, labels, screenshots
- `search_issues` — Find related issues
- `list_issues` — List issues with filters

**Write (require confirmation):**
- `add_issue_comment` — Post implementation plan and completion summary
- `update_issue` — Update labels and state after completion

## Issue Format Reference

Feedback issues from the widget contain:
- **Labels:** `feedback`, `from-widget`, `user:<sanitized_username>`, plus triage labels (`bug`, `feature-request`, `ux-improvement`, `priority:p0`–`priority:p3`)
- **Body fields:** `**Page:**` (URL), `**Reporter:**` (display name + email), `### Description`, `### Auto-captured Screenshot`, `### User-provided Screenshots`

⚠️ Issues may contain PII (reporter email). **Do NOT reproduce PII in plan or summary comments.**

## Workflow

### 1. Issue Intake

The user provides a GitHub issue number (e.g., `#42`).

Use `get_issue` on `cyberdeck-club/cyberdeck.club` to read:
- Full issue body (page URL, description, screenshots)
- Labels (category: `bug`, `feature-request`, `ux-improvement`, etc.)
- Priority label if present (`priority:p0` through `priority:p3`)
- Existing comments (prior triage, discussion)

Parse the feedback report:
- **Page URL** — which route is affected
- **Description** — what the user reported
- **Screenshots** — visual context
- **Reporter** — display name only (no email)

### 2. Analyze the Problem

**Read `AGENTS.md` before any analysis** — it contains critical guardrails.

Map the page URL to source files:
- Route file in `src/pages/` (URL → file path)
- Layout used (`BaseLayout`, `WikiLayout`, `ForumLayout`, `BuildLayout`, `MeetupLayout`)
- Components involved (check imports in the page file)
- API endpoints called (if data-related)
- Database schema (`src/db/schema.ts`) if relevant
- Library files in `src/lib/`

Read the relevant source files. Identify root cause (bugs) or feature gap (requests).

If the issue involves UI/styling, **read `DESIGN.md`** before proceeding.

### 3. Post Implementation Plan

Draft a plan and post it to the issue using `add_issue_comment`:

```markdown
## 🔧 Implementation Plan

**Issue:** #[number] — [title]
**Type:** Bug Fix / Feature / UX Improvement
**Estimated Scope:** Small / Medium / Large

### Problem Analysis
[What's happening and why]

### Proposed Solution
[How we'll fix/implement it]

### Files to Modify
- `src/pages/[path]` — [what changes]
- `src/components/[path]` — [what changes]
- `src/lib/[path]` — [what changes]

### New Files (if any)
- `src/[path]` — [purpose]

### Testing Plan
- [ ] [specific test case 1]
- [ ] [specific test case 2]
- [ ] [verify no regression on related features]

### Guardrails Check
- [ ] Follows AGENTS.md conventions
- [ ] Follows DESIGN.md design system (if UI change)
- [ ] No forbidden patterns (see AGENTS.md §10)
- [ ] TypeScript strict mode compatible
- [ ] Drizzle ORM for all DB queries (no raw SQL)

```

**⏸️ STOP — Wait for admin confirmation before implementing.**

### 4. Implement the Changes

After admin approval, execute the plan. Adhere to ALL project conventions:

- **TypeScript:** strict mode, no `any` — use `unknown` and narrow
- **Tailwind v4:** CSS-first config — NO `tailwind.config.js`, no raw palette colors (`bg-zinc-*`), no arbitrary hex (`bg-[#abc]`), no `dark:` prefixes
- **Design tokens:** from `DESIGN.md` and `src/styles/global.css` only
- **Class helper:** `cn()` from `src/lib/utils.ts` for conditional classes
- **Database:** Drizzle ORM only — no raw SQL; schema changes via `drizzle-kit generate`
- **Roles:** `>=` comparisons via `requireRole()` — never `===`
- **Layouts:** WikiLayout for wiki pages (never swap to BaseLayout)
- **Theme:** CSS-variable theming via `data-theme` attribute only

If schema changes are needed, note that migrations go through `drizzle-kit generate` (never hand-edit migration files).

### 5. Post Completion Summary

After implementation, post a summary using `add_issue_comment`:

```markdown
## ✅ Implementation Complete

### Changes Made

| File | Change Type | Description |
|------|------------|-------------|
| `src/pages/[path]` | Modified | [what changed] |
| `src/components/[path]` | Modified | [what changed] |
| `src/lib/[path]` | New | [what it does] |

### Summary
[Brief narrative of what was done and why]

### Testing Notes
- [x] [test case 1 — verified]
- [x] [test case 2 — verified]
- [specific notes about edge cases]

### Guardrails Verified
- [x] AGENTS.md conventions followed
- [x] DESIGN.md design system applied (if UI change)
- [x] TypeScript strict — no `any`, proper types
- [x] No forbidden patterns

### Deployment Notes
[Migrations needed, env vars, or other deployment considerations — or "None"]
```

### 6. Update Issue Labels

Propose label/state changes to the admin:
- Add label: `implemented`
- If admin wants to close: update state to `closed`

**⏸️ Wait for confirmation before making label/state changes.**

## Key Reference Files

- [`AGENTS.md`](AGENTS.md) — Project conventions and guardrails (**MUST read before implementing**)
- [`DESIGN.md`](DESIGN.md) — Design system for UI changes (**MUST read for UI work**)
- [`src/db/schema.ts`](src/db/schema.ts) — Database schema
- [`src/lib/github-feedback.ts`](src/lib/github-feedback.ts) — Feedback issue format reference
- [`src/styles/global.css`](src/styles/global.css) — Tailwind v4 theme tokens
- [`src/lib/utils.ts`](src/lib/utils.ts) — `cn()` class helper
- [`src/lib/auth.ts`](src/lib/auth.ts) — Auth + role system
