---
name: feedback-triage
description: Reviews, categorizes, labels, and prioritizes user feedback issues on the cyberdeck.club GitHub repository. Triages feedback from the in-app widget into bugs, feature requests, and UX issues, updates labels and project board status, and generates feedback summary reports. Use when asked to triage feedback, review feedback issues, categorize user reports, or generate a feedback summary.
---

# Feedback Triage

## When to use

- Triaging open feedback issues from the in-app widget
- Categorizing and prioritizing user-reported bugs, feature requests, or UX issues
- Generating a feedback summary or triage report
- Identifying duplicate feedback issues
- Applying labels or triage comments to feedback issues

## When NOT to use

- Managing forum threads, wiki edits, or build moderation — use the appropriate community-manager skill instead
- Creating feedback issues (the widget handles that automatically)
- Anything requiring the cyberdeck.club MCP server — this skill uses the **GitHub MCP server** (`github--` prefixed tools) exclusively

## Repository

| Field | Value |
|-------|-------|
| Owner | `cyberdeck-club` |
| Repo | `cyberdeck.club` |
| Project | `1` (org-level ProjectV2) |

## MCP Tools

All tools use the **GitHub MCP server** (prefixed `github--`).

**Read:**
- `search_issues` — Search with GitHub syntax
- `get_issue` — Full issue details, comments, labels
- `list_issues` — List with state/label filters

**Write (require confirmation):**
- `update_issue` — Update labels, title, body, state, assignees
- `add_issue_comment` — Post triage comments

## Issue Format Reference

Feedback issues created by the widget have:
- **Labels:** `feedback`, `from-widget`, `user:<sanitized_username>`
- **Body fields:** `**Submitted:**`, `**Page:**` (URL), `**Reporter:**` (name + email), `**Admin link:**`, `### Description`, `### Auto-captured Screenshot`, `### User-provided Screenshots`

⚠️ Issues contain PII (reporter email, admin links). **Do NOT reproduce PII in triage reports or comments.**

## Workflow

### 1. Fetch open feedback

Use `search_issues` with query:
```
repo:cyberdeck-club/cyberdeck.club label:feedback is:open sort:created-asc
```

Count total open issues and note the date range. If zero results, report **"Inbox zero 🎉"** and stop.

### 2. Review each issue

For each issue, use `get_issue` to read full details. Extract:
- **Page:** from `**Page:**` field in body
- **Issue description:** from `### Description` section
- **Screenshots:** check for image links
- **Reporter:** from `user:*` label (do NOT use the email from the body)
- **Age:** from `created_at`
- **Existing comments:** check comment count

### 3. Categorize

Assign exactly one category label per issue:

| Label | Criteria |
|-------|----------|
| `bug` | Something is broken or not working as expected |
| `feature-request` | User wants new functionality |
| `ux-improvement` | Existing feature works but could be better |
| `content-issue` | Problem with content (wiki, builds, etc.) not code |
| `question` | User is confused or needs help, not a bug |
| `duplicate` | Already reported — link to original |
| `wont-fix` | Not actionable or out of scope |

### 4. Prioritize

Assign exactly one priority label per issue:

| Label | Criteria |
|-------|----------|
| `priority:p0` | **Critical** — site broken, data loss, security, auth failures |
| `priority:p1` | **High** — feature broken, blocks user flow, multiple users affected |
| `priority:p2` | **Medium** — UX confusion, cosmetic, nice-to-have improvements |
| `priority:p3` | **Low** — edge cases, minor polish, long-term wishlist |

### 5. Apply labels and comments (with confirmation)

For each triaged issue, **present a summary table to the admin** showing:
- Issue number and title
- Proposed category label
- Proposed priority label
- Affected area (auth, builds, forum, wiki, meetups, admin, feedback, etc.)
- One-line assessment

**Wait for explicit admin confirmation before making any changes.**

After confirmation:
1. Use `update_issue` to add the category and priority labels (preserve existing labels)
2. Use `add_issue_comment` to post a triage comment:

```markdown
## 🏷️ Triage Assessment

**Category:** [category]
**Priority:** [priority]
**Affected area:** [area]

### Summary
[Brief description of the issue and its impact]

### Suggested next steps
- [actionable items]
```

### 6. Handle duplicates

When duplicate issues are found:
1. Comment on the duplicate linking to the original issue
2. Propose adding the `duplicate` label and closing the issue
3. **Wait for confirmation** before closing

### 7. Generate triage report

After processing all issues, output a report in this format:

```markdown
# 📬 Feedback Triage Report — [Date]

## Summary
| Metric | Count |
|--------|-------|
| Total Open Feedback | X |
| Newly Triaged | X |
| Bugs | X |
| Feature Requests | X |
| UX Improvements | X |
| Duplicates Found | X |

## Priority Distribution
| Priority | Count | Oldest |
|----------|-------|--------|
| 🔴 P0 Critical | X | [date] |
| 🟠 P1 High | X | [date] |
| 🟡 P2 Medium | X | [date] |
| 🟢 P3 Low | X | [date] |

## Issue Details

### 🔴 P0 — Critical
- **#[number]** — [title] — [category] — [affected area]

### 🟠 P1 — High
- **#[number]** — [title] — [category] — [affected area]

### 🟡 P2 — Medium
- **#[number]** — [title] — [category] — [affected area]

### 🟢 P3 — Low
- **#[number]** — [title] — [category] — [affected area]

## Patterns & Trends
- [common themes across feedback]
- [most affected areas]
- [user sentiment summary]

## Recommendations
1. [prioritized action items]
```

Omit empty priority sections. Do NOT include reporter emails, admin links, or other PII.

## Key Reference Files

- [`src/lib/github-feedback.ts`](src/lib/github-feedback.ts) — Issue creation and project board integration
- [`src/components/feedback/FeedbackWidget.tsx`](src/components/feedback/FeedbackWidget.tsx) — Widget UI and submission flow
- [`src/pages/api/feedback.ts`](src/pages/api/feedback.ts) — Feedback API endpoint
- [`src/pages/my-feedback.astro`](src/pages/my-feedback.astro) — User feedback history page
