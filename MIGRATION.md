# Architecture Migration: EmDash → Astro SSR + Auth.js + Drizzle + D1

**Status:** Planned
**Target branch:** `main` (in-place migration)
**Last updated:** 2026-04-21

## Context

cyberdeck.club currently runs on Astro 6 + EmDash CMS, with two custom EmDash plugins (`emdash-plugin-wiki`, `emdash-plugin-forum`) handling the interactive community features. Development of these plugins has hit systemic issues — EmDash is a v0.1.x beta and the plugin authoring surface is immature.

This migration removes EmDash entirely and replaces it with a native Astro SSR application using:

- **Astro 6** — same framework, now running without the EmDash integration layer
- **Cloudflare Workers** — native deployment via `@astrojs/cloudflare`, no adapter gymnastics
- **Auth.js** — via `auth-astro`, with a magic link email provider backed by Resend
- **Drizzle ORM** — typed SQL layer against Cloudflare D1
- **Cloudflare D1** — SQLite at the edge
- **Markdown** — all wiki/forum rich text stored as Markdown strings, rendered with `marked`

Everything else stays: the visual design system (neobrutalist + girlie pop), Tailwind v4 theme tokens, the page routing structure, and the component library.

## Goals

1. **Unified authentication.** One magic-link login flow covers wiki, forum, builds, meetups, and any admin actions.
2. **Remove EmDash and its custom plugins entirely.** No more fighting a moving beta.
3. **Preserve visual identity.** Zero changes to the design language, color tokens, or component look and feel.
4. **Port existing seed content.** Schema seed data from `seed/seed.json` is migrated into the new Drizzle schema.
5. **Keep Cloudflare as the deployment target.** Workers + D1, no platform switch.
6. **TypeScript end-to-end.** Schema → queries → components, all typed.

## Non-goals

- Real-time features (live forum updates, presence). Can be layered in later via Durable Objects.
- Federated or OAuth login. Magic link only for v1.
- A separate admin panel. Content creation happens through the user-facing editors (forum compose, wiki edit page).
- Image uploads beyond what users paste as URLs in Markdown. User-uploaded media can be a follow-up using R2.
- Mobile app or PWA work.

## Target stack summary

| Layer | Current | Target |
|---|---|---|
| Framework | Astro 6 + EmDash integration | Astro 6 (SSR only) |
| Adapter | `@astrojs/node` (standalone) | `@astrojs/cloudflare` |
| Database | SQLite via EmDash (`data.db`) | Cloudflare D1 |
| ORM / query | EmDash loader + Portable Text | Drizzle ORM, Markdown text |
| Auth | EmDash magic link | Auth.js (`auth-astro`) + Resend |
| Rich text | Portable Text via Tiptap | Markdown (plain text), rendered with `marked` |
| Admin | EmDash admin at `/_emdash/admin` | Role-gated pages + inline editors |
| Plugins | `emdash-plugin-wiki`, `emdash-plugin-forum` | Removed — logic inlined into the app |
| Email | `emdash-resend` plugin | Direct Resend API calls from Auth.js provider |

## Data model

All tables live in D1. Schema is defined in `src/db/schema.ts` using Drizzle's SQLite column builders.

### Users and auth

```ts
users {
  id: text primary key (cuid2 or nanoid)
  email: text unique not null
  name: text
  avatar_url: text
  role: text not null default 'member'  // 'admin' | 'moderator' | 'member'
  bio: text
  created_at: integer not null  // unix ms
  updated_at: integer not null
}

sessions {
  id: text primary key              // session token
  user_id: text not null references users(id) on delete cascade
  expires_at: integer not null
  created_at: integer not null
}

verification_tokens {
  identifier: text not null          // email
  token: text not null unique
  expires_at: integer not null
  primary key (identifier, token)
}
```

Auth.js needs tables matching its adapter contract. Use `@auth/drizzle-adapter` — it ships schema helpers; our migration mirrors those shapes.

### Wiki

```ts
wiki_categories {
  id: text primary key
  slug: text unique not null
  name: text not null
  description: text
  sort_order: integer not null default 0
  created_at: integer not null
}

wiki_articles {
  id: text primary key
  category_id: text not null references wiki_categories(id)
  slug: text not null
  title: text not null
  content: text not null              // Markdown
  excerpt: text
  author_id: text references users(id)
  status: text not null default 'draft' // 'draft' | 'published'
  view_count: integer not null default 0
  created_at: integer not null
  updated_at: integer not null
  published_at: integer
  unique (category_id, slug)
}

wiki_revisions {
  id: text primary key
  article_id: text not null references wiki_articles(id) on delete cascade
  content: text not null               // Markdown snapshot
  title: text not null
  author_id: text references users(id)
  created_at: integer not null
}
```

### Forum

```ts
forum_categories {
  id: text primary key
  slug: text unique not null
  name: text not null
  description: text
  sort_order: integer not null default 0
  created_at: integer not null
}

forum_threads {
  id: text primary key
  category_id: text not null references forum_categories(id)
  author_id: text not null references users(id)
  slug: text not null
  title: text not null
  is_pinned: integer not null default 0  // boolean
  is_locked: integer not null default 0
  post_count: integer not null default 0
  last_reply_at: integer
  last_reply_user_id: text references users(id)
  created_at: integer not null
  updated_at: integer not null
}

forum_posts {
  id: text primary key
  thread_id: text not null references forum_threads(id) on delete cascade
  author_id: text not null references users(id)
  content: text not null               // Markdown
  created_at: integer not null
  updated_at: integer not null
}
```

### Builds and meetups

```ts
builds {
  id: text primary key
  slug: text unique not null
  title: text not null
  description: text
  content: text                        // Markdown long-form writeup
  hero_image_url: text
  status: text not null default 'in_progress' // 'complete' | 'in_progress' | 'planning'
  author_id: text references users(id)
  created_at: integer not null
  updated_at: integer not null
}

meetups {
  id: text primary key
  slug: text unique not null
  title: text not null
  description: text
  content: text                        // Markdown
  location: text
  starts_at: integer                   // unix ms
  ends_at: integer
  status: text not null default 'upcoming' // 'upcoming' | 'past' | 'cancelled'
  organizer_id: text references users(id)
  created_at: integer not null
  updated_at: integer not null
}
```

### Indexes

- `forum_threads`: index on `(category_id, last_reply_at DESC)` for category listings.
- `forum_posts`: index on `(thread_id, created_at ASC)` for thread rendering.
- `wiki_articles`: index on `(category_id, status)` for category pages.
- `sessions`: index on `user_id`, `expires_at`.

## File-by-file change plan

### Files to delete

- `emdash-plugin-wiki/` directory (currently linked at `../emdash-plugin-wiki/`)
- `emdash-plugin-forum/` directory (currently linked at `../emdash-plugin-forum/`)
- `src/plugins/emdash-resend/` directory
- `src/live.config.ts` (EmDash live collections loader)
- `data.db`, `data.db-shm`, `data.db-wal` (local SQLite artifacts)
- `seed/setup.mjs` (EmDash-specific post-seed setup)
- `emdash-env.d.ts`
- `emdash-orchestrator-prompts.md`
- `.astro/` cache directory (regenerate on first build)

### Files to modify

**`package.json`**

Remove:
- `emdash`
- `emdash-plugin-forum`
- `emdash-plugin-wiki`
- `@tiptap/extension-collaboration`
- `@tiptap/y-tiptap`
- `y-protocols`
- `yjs`

Add:
- `@astrojs/cloudflare`
- `auth-astro`
- `@auth/core`
- `@auth/drizzle-adapter`
- `drizzle-orm`
- `drizzle-kit` (dev)
- `resend`
- `@paralleldrive/cuid2`

Update scripts:
```json
"dev": "astro dev",
"start": "astro dev",
"build": "astro build",
"preview": "wrangler pages dev ./dist",
"db:generate": "drizzle-kit generate",
"db:migrate": "wrangler d1 migrations apply cyberdeck-db --local",
"db:migrate:prod": "wrangler d1 migrations apply cyberdeck-db --remote",
"db:seed": "tsx scripts/seed.ts",
"deploy": "astro build && wrangler pages deploy ./dist"
```

Remove `rebuild:plugins` entirely.

**`astro.config.mjs`**

Remove `emdash` integration, `sqlite` import, `forumPlugin`, `wikiPlugin`, `resendPlugin` imports. Swap `@astrojs/node` for `@astrojs/cloudflare`. Add `auth-astro` integration. Keep the React, Tailwind, and fonts config unchanged.

**`wrangler.jsonc`**

Add D1 database binding:
```jsonc
{
  "name": "cyberdeck-club",
  "compatibility_date": "2025-10-01",
  "pages_build_output_dir": "./dist",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "cyberdeck-db",
      "database_id": "<set via wrangler d1 create>",
      "migrations_dir": "./drizzle/migrations"
    }
  ],
  "vars": {
    "AUTH_URL": "https://cyberdeck.club"
  }
}
```

Secrets set via `wrangler secret put`: `AUTH_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_ADDRESS`.

**`src/pages/` — all pages that currently call `getEntry("_emdash", ...)`**

Every such call is replaced with a Drizzle query from a helper module. For example:

```astro
---
// before
import { getEntry } from "astro:content";
const entry = await getEntry("_emdash", `wiki/${category}/${slug}`);
---

---
// after
import { getWikiArticle } from "../../../lib/wiki";
const article = await getWikiArticle(Astro.locals.db, category, slug);
if (!article) return Astro.redirect("/404");
---
```

All page-level content access moves through typed helper functions in `src/lib/`.

### Files to create

**`src/db/schema.ts`** — Drizzle schema definitions (see Data Model section above)

**`src/db/client.ts`** — exports `getDb(env)` that returns a Drizzle client bound to the D1 binding

**`src/db/index.ts`** — re-exports schema and client

**`src/lib/auth.ts`** — Auth.js configuration: Drizzle adapter, Email provider with Resend `sendVerificationRequest`, session callback that attaches role/id to the session object

**`src/lib/wiki.ts`** — `getWikiArticle`, `listWikiArticlesByCategory`, `createWikiArticle`, `updateWikiArticle`, `createRevision`, `incrementViewCount`

**`src/lib/forum.ts`** — `listForumCategories`, `listThreadsByCategory`, `getThread`, `listPostsForThread`, `createThread`, `createPost`, `updatePost`

**`src/lib/builds.ts`, `src/lib/meetups.ts`** — analogous read/write helpers

**`src/lib/markdown.ts`** — `renderMarkdown(text: string): string` using `marked`, with a consistent sanitization step. Export a configured `Marked` instance; never render untrusted input without going through this.

**`src/lib/slug.ts`** — `slugify(s)` and `uniqueSlug(db, table, baseSlug)` helpers

**`src/middleware.ts`** — Astro middleware that attaches `db` and `session` to `Astro.locals`. Reads session token from cookies, looks up the session, attaches user. Runs on every request.

**`src/env.d.ts`** — extends `Astro.Locals` type with `db`, `session`, and `user`

**`src/pages/api/auth/[...auth].ts`** — Auth.js handler route mounted at `/api/auth/*`

**`src/pages/api/forum/threads.ts`** (POST) — create thread. Validates input, requires session, inserts `forum_threads` + initial `forum_posts` in a transaction.

**`src/pages/api/forum/threads/[id]/posts.ts`** (POST) — create reply. Requires session, inserts post, updates thread's `last_reply_at` / `post_count`.

**`src/pages/api/forum/posts/[id].ts`** (PATCH, DELETE) — edit/delete own post, or any post if moderator/admin.

**`src/pages/api/wiki/articles.ts`** (POST) — create article. Requires `member`+ role.

**`src/pages/api/wiki/articles/[id].ts`** (PATCH) — edit article. Writes a revision row, updates article. Requires author or moderator+.

**`src/pages/login.astro`** — magic link email submit form. Posts to Auth.js sign-in endpoint.

**`src/pages/logout.astro`** — triggers Auth.js sign-out.

**`src/pages/profile/[id].astro`** — user profile. Shows name, bio, avatar, recent posts/threads/articles.

**`src/pages/settings.astro`** — edit own profile, set display name/avatar/bio. Requires session.

**`src/pages/forum/new.astro`** — new thread form. Requires session.

**`src/pages/forum/thread/[id]/edit.astro`** (optional for v1) — thread title/lock/pin controls for moderators.

**`src/pages/wiki/[category]/[slug]/edit.astro`** — wiki article editor. Markdown textarea with live preview. Requires session; checks author or moderator+.

**`src/pages/wiki/new.astro`** — new wiki article form.

**`src/components/MarkdownEditor.astro`** — textarea + live preview pane. Client-side React island that renders preview via `marked` in the browser for immediate feedback.

**`src/components/MarkdownRender.astro`** — takes a Markdown string, renders to sanitized HTML using the shared `marked` config.

**`src/components/AuthForm.astro`** — email-only form used on `/login`.

**`src/components/UserMenu.astro`** — nav menu item that shows sign-in button or avatar dropdown with profile/settings/logout.

**`drizzle.config.ts`** — Drizzle Kit config pointing at `src/db/schema.ts` and output dir `drizzle/migrations`.

**`drizzle/migrations/`** — generated SQL migration files, committed to the repo.

**`scripts/seed.ts`** — reads `seed/seed.json`, maps EmDash collection entries to the new schema, inserts into D1 (via `wrangler d1 execute` for remote, or direct better-sqlite3 for local dev fallback).

**`seed/seed.json`** — kept; updated format if needed so `scripts/seed.ts` can consume it directly. The existing demo content (builds, meetups, wiki articles, forum threads) is mapped to the new tables.

## Authentication flow

1. User visits `/login`, enters email, submits form.
2. Form POSTs to `/api/auth/signin/email` (Auth.js Email provider).
3. Auth.js generates a verification token, stores it in `verification_tokens`, calls the configured `sendVerificationRequest` which uses the Resend SDK to send a magic link (`/api/auth/callback/email?token=...&email=...`).
4. User clicks link; Auth.js verifies the token, creates a session row in `sessions`, sets the session cookie, redirects to `/`.
5. On every subsequent request, middleware reads the session cookie, looks up the session, attaches `user` to `Astro.locals`.
6. Pages and API routes check `Astro.locals.user` for gating. Role checks use `user.role`.

The session cookie is HTTP-only, secure in production, SameSite=Lax. Default session duration is 30 days, rolling on activity.

## Authorization model

Three roles: `admin`, `moderator`, `member`.

- **Anyone (no session):** read published wiki articles, read forum threads and posts, read builds and meetups, view profiles.
- **Member:** everything above + create forum threads/posts, create wiki articles, edit own posts/articles, create builds/meetups.
- **Moderator:** everything above + edit/delete any post/thread/article, pin/lock threads, change post status.
- **Admin:** everything above + promote/demote users, delete users, access any admin-only routes.

Gating is enforced server-side in API routes and page loaders. Client-side UI simply hides/shows controls based on `Astro.locals.user.role` — never treat client gating as security.

## Seed data port

The existing `seed/seed.json` contains EmDash schema definitions and demo content. `scripts/seed.ts`:

1. Parses `seed.json`.
2. For each collection (`wiki_articles`, `forum_threads`, `forum_posts`, `builds`, `meetups`, `wiki_categories`, `forum_categories`), maps the EmDash entry shape to the new Drizzle schema.
3. Converts any Portable Text content fields to Markdown using a simple block-to-Markdown walker (or, if the seed content is already Markdown-ish, uses it as-is).
4. Creates a seed admin user if one doesn't exist (email configurable via env var).
5. Assigns author ownership of demo content to the seed admin user.
6. Inserts rows via Drizzle, wrapped in a single transaction per table.

The script runs locally against a D1 dev database (via `wrangler d1 execute --local`) and can be re-run against `--remote` for the deployed D1 instance.

## Design system preservation

Zero intentional changes to:

- `src/styles/global.css` — the entire Tailwind v4 `@theme` block, color tokens, animations
- `src/components/` — BaseLayout, WikiLayout, ForumLayout, BuildLayout, MeetupLayout, Nav, Footer, Cards (BuildCard, MeetupCard, WikiArticleCard, ForumThreadPreview), ThemeToggle
- Neobrutalist patterns: `border-4`, `box-shadow: 4px 4px 0 var(--border)`, hover translate+shadow-reduce
- Marquee animations

Only data source plumbing changes under the hood. Visual output should be pixel-identical for ported pages.

New components (MarkdownEditor, MarkdownRender, AuthForm, UserMenu) follow the same design conventions: bold borders, chunky shadows, uppercase labels, girlie pop palette.

## Deployment

1. `wrangler d1 create cyberdeck-db` — get the database ID, paste into `wrangler.jsonc`.
2. `npm run db:generate` — generate migration SQL from the Drizzle schema.
3. `npm run db:migrate:prod` — apply migrations to the remote D1.
4. `wrangler secret put AUTH_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_ADDRESS`.
5. Run seed script against the remote D1.
6. `npm run deploy` — build and push to Cloudflare Pages.
7. Verify magic link email arrives, login works, session persists.
8. Smoke test each section: wiki read/create/edit, forum read/create/reply, builds, meetups, profile.

## Risks and mitigations

- **Auth.js on Astro is less battle-tested than on Next.js.** Mitigation: build a minimal auth spike first (see orchestrator prompt step 1) and validate session flow before porting any pages.
- **D1 writes are single-region.** Mitigation: acceptable for community-scale traffic. If it becomes a bottleneck, swap to Turso — Drizzle driver change only.
- **Markdown rendering + user input = XSS risk.** Mitigation: always render user Markdown through the shared `renderMarkdown` helper, which sanitizes output. Never `set:html` on raw user input.
- **In-place migration on `main` means the site breaks until the migration is complete.** Mitigation: work in short, committable increments; keep `astro build` passing at every commit where possible; tag the last pre-migration commit so rollback is one `git reset` away.
- **Seed data may not cleanly map.** Mitigation: the seed script logs and skips entries it can't convert, rather than failing the whole run. Review warnings manually.

## Sequencing

Executed in this order by the orchestrator. Each phase is a committable unit.

1. **Auth spike.** Brand new branch off main for experimentation, or temporary `/spike` route. Validate Auth.js + Resend + D1 session on Workers end-to-end. Discard or merge the learnings.
2. **Dependency swap.** Remove EmDash packages, add new deps, switch adapter to Cloudflare. Site won't build yet — that's expected.
3. **Schema + migrations.** Write `src/db/schema.ts`, generate migrations, set up D1 binding in Wrangler, apply to local D1.
4. **Auth implementation.** Real `src/lib/auth.ts`, middleware, `/api/auth/[...auth].ts`, `/login`, `/logout`.
5. **Read paths.** Port wiki read pages, forum read pages, builds, meetups to Drizzle queries. Seed script runs and populates demo data. Site should be browsable as a logged-out reader at this point.
6. **Write paths.** Forum thread/post creation, wiki article create/edit, builds and meetups create/edit. API routes and forms.
7. **Admin/moderator affordances.** Role-gated controls: pin/lock threads, edit any post, delete any post, promote users.
8. **Cleanup.** Delete EmDash plugin dirs, remove `data.db*`, remove `emdash-env.d.ts`, update `AGENTS.md`, update `README.md`.
9. **Deploy.** Secrets, D1 remote migration, seed remote, Cloudflare Pages deploy, smoke test.

## Definition of done

- [ ] No `emdash*` imports anywhere in the codebase.
- [ ] `package.json` contains no `emdash*` or `@tiptap/y-*` dependencies.
- [ ] `data.db*` files removed from repo and `.gitignore` still covers them.
- [ ] All pages under `src/pages/` build without EmDash types.
- [ ] Magic link login works end-to-end in production.
- [ ] Seed data visible on the deployed site.
- [ ] At least one forum thread can be created, replied to, edited, and deleted in production by a logged-in user.
- [ ] At least one wiki article can be created, edited (producing a revision row), and viewed.
- [ ] Moderator role can pin/lock a thread; admin role can promote a user.
- [ ] Dark mode, theme toggle, and all visual patterns (shadows, borders, marquees) look identical to the pre-migration site.
- [ ] `AGENTS.md` and `README.md` reflect the new architecture.
