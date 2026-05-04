---
name: content-builder
description: Creates and edits wiki articles, build showcases, meetup pages, static content pages, and forum announcements for cyberdeck.club following the site's design system and copy tone — plainspoken, warm, inclusive, encouraging, and specific.
---

# Content Page Builder

## When to Use

- When creating new wiki articles about cyberdeck topics, build guides, or reference material
- When editing or improving existing wiki content
- When setting up meetup event pages
- When creating build showcase entries
- When drafting forum announcements for community-wide communications
- When creating or updating static pages (about, guidelines, etc.)
- When the admin says "write a wiki article about…" or "create a meetup for…" or "announce…"

## When NOT to Use

- **Moderation queue processing** (pending builds, approvals) → use the `moderation-queue` skill
- **Community metrics** (user counts, activity stats, growth) → use the `community-metrics` skill
- **Safety incidents** (harassment reports, bans) → use the `safety-management` skill
- **Security audits** (PAT tokens, role distribution) → use the `security-audit` skill
- **Guidelines compliance sweeps** (proactive content review) → use the `guidelines-check` skill

## Nature of This Skill

This is the **only community-manager skill that writes data**. All write operations (creating or editing content) require **explicit admin confirmation** before execution. NEVER auto-publish.

Content MUST follow the copy tone from [`DESIGN.md`](../../../DESIGN.md) §7. Read it before drafting any content.

## Copy Tone Rules

All content produced by this skill MUST follow these rules:

1. **Plainspoken over jargon** — Assume the reader picked up a soldering iron last week. Define every acronym. Delete every "just" and "simply."
2. **Warm over clinical** — Use "you" and "your build." Celebrate the builder, not just the build.
3. **Inclusive language** — No gendered assumptions. No "guys." Use "folks," "y'all," "everyone," "builders."
4. **Encouraging** — Frame challenges as opportunities. "This takes some patience" not "this is hard."
5. **Specific** — "Solder the GPIO pins to the breakout board" not "connect the components."

The community celebrates cyberdecks as **aesthetic expression** — builds in Polly Pocket toys, dinosaur toys, purses, clamshell compacts — not just utilitarian Pelican case builds. Content should reflect this diversity.

## MCP Tools

### Read Tools (research phase — no confirmation needed)

| Tool | Purpose | Key Params |
|------|---------|------------|
| `list_wiki_articles` | Check existing wiki content, find categories | `category?`, `page?` |
| `get_wiki_article` | Read a specific article for editing or context | `id` |
| `get_wiki_article_history` | Review past revisions before editing | `id` |
| `list_forum_threads` | Check for duplicate announcements | `category?`, `page?` |
| `list_meetups` | Check existing meetup events | `page?` |
| `list_builds` | Browse existing builds | `page?`, `status?`, `category?` |
| `get_build` | Read a specific build for editing | `slug` |

### Write Tools (publish phase — admin confirmation REQUIRED)

| Tool | Purpose | Key Params |
|------|---------|------------|
| `create_wiki_article` | Create new wiki article | `categoryId`, `title`, `slug`, `content` |
| `update_wiki_article` | Edit existing wiki article (creates revision) | `id`, `content`, `editSummary?` |
| `create_forum_thread` | Create forum thread/announcement | `categoryId`, `title`, `content` |
| `create_forum_post` | Reply to existing forum thread | `threadId`, `content` |
| `create_meetup` | Create meetup event | `title`, `slug?`, `description?`, `content?`, `location?`, `startsAt?` (Unix ts), `endsAt?` (Unix ts) |
| `create_build` | Create build showcase entry | `title`, `description?`, `content?`, `imageUrl?` |
| `update_build` | Edit existing build | `slug`, `title?`, `description?`, `content?`, `imageUrl?` |

> **Static pages** do not have MCP tools. Direct the admin to the admin UI at [`src/pages/admin/static/index.astro`](../../../src/pages/admin/static/index.astro), or use the API endpoints at [`src/pages/api/admin/static-pages/index.ts`](../../../src/pages/api/admin/static-pages/index.ts) and [`src/pages/api/admin/static-pages/[id].ts`](../../../src/pages/api/admin/static-pages/%5Bid%5D.ts).

## Workflow

### Step 1: Content Request Intake

1. Ask the admin what type of content to create or edit:
   - **Wiki article** — Informational content, build guides, reference material
   - **Build showcase** — Featured build content (typically user-submitted, but admin can create)
   - **Meetup page** — Event listing for community gatherings
   - **Forum announcement** — Community-wide announcements via forum thread
   - **Static page** — Site pages like about, guidelines (no MCP tool — admin UI only)
2. Clarify: target audience, purpose, and key information to include.
3. If editing existing content, get the article ID, build slug, or thread ID.

### Step 2: Research & Duplicate Check

1. Check for existing content to avoid duplication:
   - Wiki: call `list_wiki_articles` (filter by `category` if known)
   - Meetups: call `list_meetups`
   - Forum: call `list_forum_threads` (filter by `category` if known)
   - Builds: call `list_builds`
2. If editing, call the appropriate `get_*` tool to read the current content.
3. For wiki edits, call `get_wiki_article_history` to review revision history.
4. Read [`DESIGN.md`](../../../DESIGN.md) §7 for copy tone before drafting.

### Step 3: Draft Content

Draft based on content type. All content uses markdown.

#### Wiki Articles

- Structure: clear title → introduction → body with headings → conclusion/further reading
- Include practical information (how-to steps, reference tables, guides)
- Celebrate diversity of cyberdeck aesthetics — not just Pelican case builds
- Provide image placeholder URLs with descriptive alt text where relevant
- Generate a URL-friendly slug from the title (lowercase, hyphens, no special chars)

#### Build Showcases

- Focus on the **story**: what inspired it, challenges faced, what was learned
- Lead with what makes this build unique or interesting
- Include: title, short description, full content (markdown), hero image URL
- Celebrate unconventional builds — Polly Pocket cases, purses, toys, art pieces

#### Meetup Pages

- Include: title, description, full content, location (physical or virtual), start/end times
- Start/end times must be **Unix timestamps** (seconds since epoch)
- Include logistics: how to join, what to bring, accessibility info
- Add a code of conduct reminder
- Use welcoming language that makes newcomers feel invited

#### Forum Announcements

- Clear, concise subject line
- Body: what happened/is happening, why it matters, what action (if any) members should take
- Warm and inclusive tone throughout
- Include a category ID for the appropriate forum section

#### Static Pages

- Draft the content in markdown
- Note that publishing requires the admin UI — present the content for the admin to paste

### Step 4: Present Draft for Review

1. Show the **complete** content draft to the admin.
2. Highlight any tone or guideline decisions made.
3. Show the exact MCP tool call that will be made (tool name + params).
4. Ask for explicit approval before publishing.
5. **NEVER auto-publish.** Wait for the admin to say "yes" / "approved" / "publish it."

### Step 5: Publish Content

After receiving explicit admin approval, call the appropriate MCP tool:

- **New wiki article:** `create_wiki_article` with `categoryId`, `title`, `slug`, `content`
- **Wiki edit:** `update_wiki_article` with `id`, `content`, `editSummary`
- **New forum thread:** `create_forum_thread` with `categoryId`, `title`, `content`
- **Forum reply:** `create_forum_post` with `threadId`, `content`
- **New meetup:** `create_meetup` with `title` and optional fields
- **New build:** `create_build` with `title` and optional fields
- **Build edit:** `update_build` with `slug` and changed fields
- **Static page:** Direct admin to the UI at `/admin/static/` — no MCP tool available

### Step 6: Post-Publish Verification

1. After publishing, verify the content is live:
   - Wiki: call `get_wiki_article` with the returned ID
   - Build: call `get_build` with the slug
   - Meetup: call `list_meetups` and confirm the new entry appears
   - Forum: call `list_forum_threads` and confirm the new thread appears
2. Report the published content details (ID, slug, title) to the admin.
3. Suggest follow-up actions if appropriate:
   - Cross-post announcement to forum for new wiki articles
   - Create a forum thread to discuss a new meetup
   - Share on social media channels

## Key Reference Files

Read these **only when you need deeper context** during content creation:

| File | When to Read |
|------|-------------|
| [`DESIGN.md`](../../../DESIGN.md) §7 | **Always read before drafting** — copy tone rules |
| [`DESIGN.md`](../../../DESIGN.md) §4-6 | When creating content that references design patterns |
| [`src/pages/guidelines.astro`](../../../src/pages/guidelines.astro) | To reflect community values in content |
| [`src/db/schema.ts`](../../../src/db/schema.ts) | To understand content schemas (wiki categories, build fields, meetup fields) |
| [`AGENTS.md`](../../../AGENTS.md) §5 | For role permissions — who can create what content |
| [`src/lib/wiki.ts`](../../../src/lib/wiki.ts) | For wiki content handling details |
| [`src/lib/forum.ts`](../../../src/lib/forum.ts) | For forum post structure details |
| [`src/lib/meetups.ts`](../../../src/lib/meetups.ts) | For meetup data handling details |

## Troubleshooting

- **MCP tool returns 401:** Token expired or revoked. Ask the admin to regenerate at `/settings`.
- **MCP tool returns 403:** Token lacks required scope or user role is insufficient. `create_wiki_article` requires MAKER role or higher. `create_meetup` requires TRUSTED_MAKER or higher.
- **Category ID unknown:** Call `list_wiki_articles` or `list_forum_threads` to discover available categories from existing content.
- **Slug conflict on wiki article:** The slug may already be taken. Try appending a disambiguator (e.g., `-guide`, `-2026`) or choose a different slug.
- **Meetup times look wrong:** Ensure `startsAt` and `endsAt` are Unix timestamps in **seconds** (not milliseconds). Convert from human-readable dates before calling `create_meetup`.
- **Static page creation:** No MCP tool exists. Direct the admin to the admin UI at `/admin/static/` or the API at `/api/admin/static-pages/`.
- **Content doesn't match tone:** Re-read the Copy Tone Rules section above. Check for jargon, gendered language, discouraging framing, or vague instructions.
