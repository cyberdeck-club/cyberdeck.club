# Architecture Migration: EmDash → Astro SSR + Better Auth + Drizzle + D1

**Status:** Planned
**Target branch:** `main` (in-place migration)
**Last updated:** 2026-04-21

## Context

cyberdeck.club currently runs on Astro 6 + EmDash CMS, with two custom EmDash plugins (`emdash-plugin-wiki`, `emdash-plugin-forum`) handling the interactive community features. Development of these plugins has hit systemic issues — EmDash is a v0.1.x beta and the plugin authoring surface is immature.

This migration removes EmDash entirely and replaces it with a native Astro SSR application using:

- **Astro 6** — same framework, now running without the EmDash integration layer
- **Cloudflare Workers** — native deployment via `@astrojs/cloudflare`, no adapter gymnastics
- **Better Auth** — Astro's officially-recommended auth library, with its built-in magic link plugin and Resend-backed email delivery
- **Drizzle ORM** — typed SQL layer against Cloudflare D1, wired to Better Auth via its built-in Drizzle adapter
- **Cloudflare D1** — SQLite at the edge (first-class supported by Better Auth v1.5+)
- **Markdown** — all wiki/forum rich text stored as Markdown strings, rendered with `marked`

Everything else stays: the visual design system (neobrutalist + girlie pop), Tailwind v4 theme tokens, the page routing structure, and the component library.

> **Why Better Auth and not Auth.js?** Astro's official authentication guide (docs.astro.build/en/guides/authentication/) currently recommends Better Auth, Clerk, or Lucia. `auth-astro` is a community package not mentioned in the current docs. Better Auth has first-class Cloudflare D1 support as of v1.5, a built-in Drizzle adapter, a built-in magic link plugin, and a documented Astro integration path — it's the lowest-risk choice for an AI-executed migration because the model can rely on official, current documentation rather than reverse-engineering a less-traveled integration.

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
| Auth | EmDash magic link | Better Auth + `magicLink` plugin + Resend for email delivery |
| Rich text | Portable Text via Tiptap | Markdown (plain text), rendered with `marked` |
| Admin | EmDash admin at `/_emdash/admin` | Role-gated pages + inline editors |
| Plugins | `emdash-plugin-wiki`, `emdash-plugin-forum` | Removed — logic inlined into the app |
| Email | `emdash-resend` plugin | Resend SDK called directly from Better Auth's `sendMagicLink` |

## Data model

All tables live in D1. Schema is defined in `src/db/schema.ts` using Drizzle's SQLite column builders.

### Users and auth (Better Auth-owned)

Better Auth owns its own tables. **Do not hand-write them.** Instead, after configuring the Better Auth instance, run `npx @better-auth/cli generate --output src/db/auth-schema.ts` which emits a Drizzle schema file matching the exact shape Better Auth expects. That file is then imported into the main `src/db/schema.ts` alongside the app-specific tables.

The tables Better Auth will create (approximate, definitive shape comes from the CLI output):

```
user            // base user row — id, email, emailVerified, name, image, createdAt, updatedAt
session         // session rows — id, userId, token, expiresAt, createdAt, etc.
account         // credential/OAuth account links (unused for magic-link-only but still created)
verification    // magic link verification tokens
```

The magic link plugin uses the `verification` table to store tokens. No extra schema needed for it.

**App-specific user fields** (role, bio, avatar_url beyond Better Auth's `image`) are added via Better Auth's `additionalFields` config option, which the CLI will include in the generated schema:

```ts
// in the Better Auth config
user: {
  additionalFields: {
    role: { type: "string", defaultValue: "member", input: false },
    bio: { type: "string", required: false },
  },
}
```

`role` is `input: false` so end users can't set it via signup — only server-side code (promotion flows) can write it.

### Wiki

All `author_id` / user foreign keys reference Better Auth's `user.id` (note: singular, per the CLI-generated schema).

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
  author_id: text references user(id)
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
  author_id: text references user(id)
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
  author_id: text not null references user(id)
  slug: text not null
  title: text not null
  is_pinned: integer not null default 0  // boolean
  is_locked: integer not null default 0
  post_count: integer not null default 0
  last_reply_at: integer
  last_reply_user_id: text references user(id)
  created_at: integer not null
  updated_at: integer not null
}

forum_posts {
  id: text primary key
  thread_id: text not null references forum_threads(id) on delete cascade
  author_id: text not null references user(id)
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
  author_id: text references user(id)
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
  organizer_id: text references user(id)
  created_at: integer not null
  updated_at: integer not null
}
```

### Indexes

- `forum_threads`: index on `(category_id, last_reply_at DESC)` for category listings.
- `forum_posts`: index on `(thread_id, created_at ASC)` for thread rendering.
- `wiki_articles`: index on `(category_id, status)` for category pages.
- Better Auth's generated schema already handles indexes on `session.userId`, `session.expiresAt`, `verification.identifier`, etc.

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
- `better-auth`
- `@better-auth/cli` (dev)
- `drizzle-orm`
- `drizzle-kit` (dev)
- `resend`
- `@paralleldrive/cuid2`
- `marked`

Update scripts:
```json
"dev": "astro dev",
"start": "astro dev",
"build": "astro build",
"preview": "wrangler pages dev ./dist",
"auth:generate": "better-auth generate --output src/db/auth-schema.ts",
"db:generate": "drizzle-kit generate",
"db:migrate": "wrangler d1 migrations apply cyberdeck-db --local",
"db:migrate:prod": "wrangler d1 migrations apply cyberdeck-db --remote",
"db:seed": "tsx scripts/seed.ts",
"deploy": "astro build && wrangler pages deploy ./dist"
```

Remove `rebuild:plugins` entirely.

**`astro.config.mjs`**

Remove `emdash` integration, `sqlite` import, `forumPlugin`, `wikiPlugin`, `resendPlugin` imports. Swap `@astrojs/node` for `@astrojs/cloudflare`. Keep the React, Tailwind, and fonts config unchanged. Better Auth does not require an Astro integration entry — it's wired via API route and middleware only.

**`wrangler.jsonc`**

Add D1 database binding and the `nodejs_compat` compatibility flag (required by Better Auth for `AsyncLocalStorage`):

```jsonc
{
  "name": "cyberdeck-club",
  "compatibility_date": "2025-10-01",
  "compatibility_flags": ["nodejs_compat"],
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
    "BETTER_AUTH_URL": "https://cyberdeck.club"
  }
}
```

Secrets set via `wrangler secret put`: `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_ADDRESS`.

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

**`src/db/schema.ts`** — imports and re-exports from `src/db/auth-schema.ts` (generated by Better Auth CLI) plus defines app-specific tables (wiki, forum, builds, meetups) per the Data Model section.

**`src/db/auth-schema.ts`** — **generated** by `npx @better-auth/cli generate`. Do not hand-edit. Regenerate whenever the Better Auth config changes (e.g., adding a plugin or `additionalFields`).

**`src/db/client.ts`** — exports `getDb(env: Env)` that calls `drizzle(env.DB, { schema })` and returns a Drizzle client bound to the request's D1 binding. **Never export a module-level singleton** — the D1 binding only exists inside a request context on Workers.

**`src/lib/auth.ts`** — exports `getAuth(env: Env)` (a factory, not a singleton) that returns a configured Better Auth instance. Inside the factory:

- Initialize Drizzle via `getDb(env)`.
- Call `betterAuth({ ... })` with:
  - `database: drizzleAdapter(db, { provider: "sqlite" })`
  - `baseURL: env.BETTER_AUTH_URL`
  - `secret: env.BETTER_AUTH_SECRET`
  - `user.additionalFields: { role: { type: "string", defaultValue: "member", input: false }, bio: { type: "string", required: false } }`
  - `plugins: [magicLink({ sendMagicLink: async ({ email, url }) => { /* call Resend API with env.RESEND_API_KEY */ } })]`

**Critical Workers rule:** every handler/middleware invocation must create its own auth instance via `getAuth(env)`. Do not cache or reuse across requests. The [Better Auth + Cloudflare integration notes](#known-pitfalls) explain why — reusing instances causes WAL-lock hangs in local dev and transient 503s in production.

**`src/lib/resend.ts`** — thin wrapper around the Resend SDK: `sendEmail(env, { to, subject, html })`. Called from the `sendMagicLink` callback in the Better Auth config. Uses `env.RESEND_API_KEY` and `env.RESEND_FROM_ADDRESS`.

**`src/lib/wiki.ts`** — `getWikiArticle`, `listWikiArticlesByCategory`, `createWikiArticle`, `updateWikiArticle`, `createRevision`, `incrementViewCount`. Every function takes `db` as its first argument — no module-level db reference.

**`src/lib/forum.ts`** — `listForumCategories`, `listThreadsByCategory`, `getThread`, `listPostsForThread`, `createThread`, `createPost`, `updatePost`. Same per-function `db` arg pattern.

**`src/lib/builds.ts`, `src/lib/meetups.ts`** — analogous read/write helpers, same pattern.

**`src/lib/markdown.ts`** — `renderMarkdown(text: string): string` using `marked`. Wraps the render call with HTML sanitization (Better Auth doesn't handle this; it's our responsibility). Export a single configured function; never render untrusted input through anything else.

**`src/lib/slug.ts`** — `slugify(s)` and `uniqueSlug(db, table, baseSlug)` helpers.

**`src/middleware.ts`** — Astro middleware that:

1. Reads `env` from `context.locals.runtime.env` (this is how `@astrojs/cloudflare` exposes Workers bindings to Astro).
2. Creates a per-request `db` via `getDb(env)` and attaches it to `Astro.locals.db`.
3. Creates a per-request Better Auth instance via `getAuth(env)`.
4. Calls `auth.api.getSession({ headers: context.request.headers })` to resolve the session.
5. Attaches `session` and `user` to `Astro.locals`.

Middleware runs on every request. Pages and API routes read `Astro.locals.user` for gating.

**`src/env.d.ts`** — extends `Astro.Locals` type with `db`, `session`, and `user` (the user type includes the `additionalFields` shape).

**`src/pages/api/auth/[...all].ts`** — Better Auth catch-all handler route. Pattern from Astro's official docs:

```ts
import type { APIRoute } from "astro";
import { getAuth } from "../../../lib/auth";

export const prerender = false;

export const ALL: APIRoute = async (ctx) => {
  const env = ctx.locals.runtime.env;
  const auth = getAuth(env);
  return auth.handler(ctx.request);
};
```

**`src/pages/api/forum/threads.ts`** (POST) — create thread. Validates input, requires session (via `Astro.locals.user`), inserts `forum_threads` + initial `forum_posts` using D1's `batch()` API for atomicity (D1 does not support interactive transactions).

**`src/pages/api/forum/threads/[id]/posts.ts`** (POST) — create reply. Requires session, inserts post, updates thread's `last_reply_at` / `post_count` in the same `batch()`.

**`src/pages/api/forum/posts/[id].ts`** (PATCH, DELETE) — edit/delete own post, or any post if moderator/admin.

**`src/pages/api/wiki/articles.ts`** (POST) — create article. Requires `member`+ role.

**`src/pages/api/wiki/articles/[id].ts`** (PATCH) — edit article. Writes a revision row, updates article. Uses D1 `batch()`.

**`src/pages/login.astro`** — magic link email submit form. Client-side uses Better Auth's `authClient.signIn.magicLink({ email, callbackURL: "/" })`.

**`src/pages/logout.astro`** — calls `authClient.signOut()`, redirects home.

**`src/pages/profile/[id].astro`** — user profile. Shows name, bio, avatar, recent posts/threads/articles.

**`src/pages/settings.astro`** — edit own profile, set display name/avatar/bio. Requires session.

**`src/pages/forum/new.astro`** — new thread form. Requires session.

**`src/pages/forum/thread/[id]/edit.astro`** (optional for v1) — thread title/lock/pin controls for moderators.

**`src/pages/wiki/[category]/[slug]/edit.astro`** — wiki article editor. Markdown textarea with live preview. Requires session; checks author or moderator+.

**`src/pages/wiki/new.astro`** — new wiki article form.

**`src/lib/auth-client.ts`** — Better Auth client instance for browser-side sign-in/out calls:

```ts
import { createAuthClient } from "better-auth/client";
import { magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [magicLinkClient()],
});
export const { signIn, signOut, useSession } = authClient;
```

**`src/components/MarkdownEditor.astro`** — textarea + live preview pane. Client-side React island that renders preview via `marked` in the browser for immediate feedback.

**`src/components/MarkdownRender.astro`** — takes a Markdown string, renders to sanitized HTML using the shared `marked` config.

**`src/components/AuthForm.astro`** — email-only form used on `/login`. Submits to `authClient.signIn.magicLink()`.

**`src/components/UserMenu.astro`** — nav menu item that shows sign-in button or avatar dropdown with profile/settings/logout.

**`drizzle.config.ts`** — Drizzle Kit config pointing at `src/db/schema.ts` (which re-exports the generated `auth-schema.ts`) and output dir `drizzle/migrations`.

**`drizzle/migrations/`** — generated SQL migration files, committed to the repo.

**`scripts/seed.ts`** — reads `seed/seed.json`, maps EmDash collection entries to the new schema, inserts into D1 via `wrangler d1 execute` (the script generates a SQL file; then `wrangler d1 execute cyberdeck-db --file=seed.sql --local` or `--remote` runs it).

**`seed/seed.json`** — kept; updated format if needed so `scripts/seed.ts` can consume it directly. The existing demo content (builds, meetups, wiki articles, forum threads) is mapped to the new tables.

## Authentication flow

1. User visits `/login`, enters email, submits form.
2. Client-side code calls `authClient.signIn.magicLink({ email, callbackURL: "/" })`, which POSTs to `/api/auth/sign-in/magic-link`.
3. The Better Auth handler (mounted at `/api/auth/[...all].ts`) generates a token, stores it in the `verification` table, and calls the configured `sendMagicLink` callback. That callback uses the Resend SDK to email the user a link pointing at `/api/auth/magic-link/verify?token=...`.
4. User clicks link; Better Auth verifies the token, creates a session row, sets the session cookie, and redirects to the `callbackURL`.
5. On every subsequent request, middleware calls `auth.api.getSession({ headers })` to resolve the session, attaching `user` and `session` to `Astro.locals`.
6. Pages and API routes check `Astro.locals.user` for gating. Role checks use `user.role` (populated from the `additionalFields` config).

Session cookies are HTTP-only, secure in production, SameSite=Lax — Better Auth sets these defaults. Default session duration is 7 days; can be extended via config.

### Known pitfalls (Better Auth + Cloudflare Workers)

These are documented gotchas the migration must handle correctly. They are the primary reason the "Model-specific notes" section below mandates reading the Better Auth + Cloudflare integration guide before writing auth code.

1. **One auth instance per request.** Never cache the Better Auth instance at module scope. The D1 binding only exists in request context; creating the instance via `getAuth(env)` inside each handler/middleware is required. Reusing instances causes 30+ second WAL-lock hangs in local `wrangler dev` and transient 503s in production.
2. **D1 has no interactive transactions.** Use `db.batch([...])` for atomicity (e.g., thread + initial post insertion). Better Auth itself already uses batch internally; our app code must follow the same pattern.
3. **`nodejs_compat` flag is required** in `wrangler.jsonc` for Better Auth's `AsyncLocalStorage` usage.
4. **KV secondary storage has a minimum TTL of 60 seconds.** Don't use KV as secondary storage for rate limiting without config overrides — some internal paths pass TTLs below the minimum.
5. **The Better Auth CLI must be run with the `--y` flag** to skip interactive prompts, and must be pointed at the config file containing the app's auth instance.

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

## Model-specific notes (MiniMax M2.7)

This migration is being executed by MiniMax M2.7 running in Roo Code's orchestrator mode. M2.7 is a strong coding and agent model (approaches Opus on SWE-Pro, 97% skill adherence across complex multi-step skills) but is a 10B-active MoE, meaning:

- Its recall of narrow, recently-changed library APIs is weaker than frontier proprietary models.
- It benefits more than larger models from explicit version pins and "read the source" steps before writing integration code.
- It performs best in tight iterate-and-verify loops rather than produce-large-batch-and-hope.

To account for this, the following rules apply throughout the migration:

1. **Pin dependency versions before installing.** Before running `npm install` in Phase 2, the orchestrator (or its delegate) must run `npm view <package> version` for each new dependency and record the exact version to install. Do not install floating `latest`. Record the resolved versions in a `DEPS.md` alongside this doc so they're reproducible.

2. **Read the docs before writing integration code.** For each of the following, the orchestrator must fetch and read the current official documentation before its first implementation subtask touches the integration:
   - Astro's official authentication guide (`https://docs.astro.build/en/guides/authentication/`) — confirms the Better Auth integration pattern
   - Better Auth core docs (`https://better-auth.com/docs/installation`) — config shape, CLI usage
   - Better Auth Astro integration guide (`https://better-auth.com/docs/integrations/astro`) — handler route pattern, middleware pattern
   - Better Auth magic link plugin docs — `sendMagicLink` signature, client plugin setup
   - Better Auth + Cloudflare integration notes including the [known pitfalls article](https://medium.com/@senioro.valentino/better-auth-cloudflare-workers-the-integration-guide-nobody-wrote-8480331d805f) — this is not optional, it documents the WAL-lock hang that will bite a naive implementation
   - `@better-auth/cli` usage (the `generate` command specifically) — output format, options
   - `@better-auth/adapters/drizzle` — before Phase 4
   - `drizzle-orm/d1` — before Phase 3
   - `@astrojs/cloudflare` — before Phase 2
   - Cloudflare D1 migrations via Wrangler — before Phase 3
   - D1's `batch()` API — before any API route that needs atomicity

3. **No API-shape guessing.** If a function signature, configuration key, or import path is not verified from docs or source, the implementing subtask must stop and either read the package source (`node_modules/<pkg>/...`) or escalate. "I think the API is..." is not acceptable.

4. **Every phase gate requires a working run, not a passing typecheck.** A phase is not complete until the behavior it introduces has been exercised end-to-end with a real invocation (curl the route, submit the form, click the magic link). TypeScript compiling is necessary but not sufficient.

5. **Subtasks are small and verified.** Prefer five small verified subtasks over one large one. Each subtask ends with either a test run, a dev-server check, or a curl invocation whose output is captured in the subtask's completion report.

6. **When stuck, read source, don't guess.** `node_modules/` is the source of truth for library behavior. Reading a package's `dist/index.d.ts` or its `src/` is always preferred to speculating about its API.

## Risks and mitigations

- **Better Auth's per-request-instance requirement is the single most likely source of bugs.** Mitigation: the File-by-file plan explicitly requires `getAuth(env)` as a factory pattern, never a module-level singleton. The known-pitfalls section documents the WAL-lock symptom so it's recognized immediately if it appears. A Phase 4 verification step specifically exercises multiple concurrent requests to the auth handler to flush this out.
- **D1 writes are single-region.** Mitigation: acceptable for community-scale traffic. If it becomes a bottleneck, swap to Turso — Drizzle driver change only.
- **D1 lacks interactive transactions.** Mitigation: use `db.batch([...])` for multi-statement atomicity. Documented in the known-pitfalls section; API route subtasks reference it explicitly.
- **Markdown rendering + user input = XSS risk.** Mitigation: always render user Markdown through the shared `renderMarkdown` helper, which sanitizes output. Never `set:html` on raw user input.
- **In-place migration on `main` means the site breaks until the migration is complete.** Mitigation: work in short, committable increments; keep `astro build` passing at every commit where possible; tag the last pre-migration commit so rollback is one `git reset` away.
- **Seed data may not cleanly map.** Mitigation: the seed script logs and skips entries it can't convert, rather than failing the whole run. Review warnings manually.
- **Executing model (M2.7) may hallucinate library APIs.** Mitigation: the Model-specific notes section above imposes a "read docs and pin versions before writing" rule. Any subtask that produces integration code without a preceding doc-read or source-read step is rejected and re-dispatched.
- **Better Auth CLI-generated schema may use singular table names (`user`, `session`) rather than plural, and our app-specific tables use plural (`wiki_articles`, `forum_threads`).** Mitigation: don't fight it. Accept the mixed convention and make sure foreign keys reference the actual generated table names. The Data Model section explicitly notes `user(id)` (singular) as the FK target.

## Sequencing

Executed in this order by the orchestrator. Each phase is a committable unit.

1. **Auth spike.** Brand new branch off main for experimentation, or temporary `/spike` route. Validate Better Auth + magic link + Resend + D1 + per-request instance pattern end-to-end on Workers. Explicitly test the concurrent-request case (fire two magic-link verifications simultaneously) to confirm the WAL-lock pitfall is avoided. Discard or merge the learnings.
2. **Dependency swap.** Remove EmDash packages, add new deps, switch adapter to Cloudflare. Site won't build yet — that's expected.
3. **Schema + migrations.** Write the `getAuth` factory skeleton first (Better Auth needs a config to generate its schema). Run `npx @better-auth/cli generate --output src/db/auth-schema.ts` to emit auth tables. Hand-write app-specific tables in `src/db/schema.ts` and re-export the auth schema. Run `drizzle-kit generate`, set up D1 binding in Wrangler, apply migrations to local D1.
4. **Auth implementation.** Full `src/lib/auth.ts` factory, `src/lib/auth-client.ts`, `src/lib/resend.ts`, middleware, `/api/auth/[...all].ts`, `/login`, `/logout`. Verify end-to-end: submit email → receive real magic link → click → land authenticated → session reflected in `Astro.locals.user`.
5. **Read paths.** Port wiki read pages, forum read pages, builds, meetups to Drizzle queries. Seed script runs and populates demo data. Site should be browsable as a logged-out reader at this point.
6. **Write paths.** Forum thread/post creation, wiki article create/edit, builds and meetups create/edit. API routes using D1 `batch()` for atomicity where needed, forms, Markdown editor island.
7. **Admin/moderator affordances.** Role-gated controls: pin/lock threads, edit any post, delete any post, promote users. Role changes go through a dedicated admin route that enforces `role: 'admin'` before allowing writes to the `user.role` field.
8. **Cleanup.** Delete EmDash plugin dirs, remove `data.db*`, remove `emdash-env.d.ts`, update `AGENTS.md`, update `README.md`.
9. **Deploy.** Secrets (`BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_ADDRESS`), D1 remote migration, seed remote, Cloudflare Pages deploy, smoke test.

## Definition of done

- [ ] No `emdash*` imports anywhere in the codebase.
- [ ] No `auth-astro`, `next-auth`, or `@auth/*` imports anywhere (Better Auth replaces these).
- [ ] `package.json` contains no `emdash*` or `@tiptap/y-*` dependencies.
- [ ] `data.db*` files removed from repo and `.gitignore` still covers them.
- [ ] All pages under `src/pages/` build without EmDash types.
- [ ] Magic link login works end-to-end in production — real email arrives, link verifies, session persists.
- [ ] Concurrent magic-link verifications (two requests in flight simultaneously) both succeed without 30s hangs — verifies the per-request auth instance pattern is correct.
- [ ] Seed data visible on the deployed site.
- [ ] At least one forum thread can be created, replied to, edited, and deleted in production by a logged-in user.
- [ ] At least one wiki article can be created, edited (producing a revision row), and viewed.
- [ ] Moderator role can pin/lock a thread; admin role can promote a user.
- [ ] Dark mode, theme toggle, and all visual patterns (shadows, borders, marquees) look identical to the pre-migration site.
- [ ] `AGENTS.md` and `README.md` reflect the new architecture (including Better Auth, Drizzle, D1, no-EmDash).
