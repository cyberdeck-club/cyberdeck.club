# AGENTS.md

## Overview

`cyberdeck.club` is a community platform for **women, femmes, queers, and people historically under‑represented in STEM and tech** who are passionate about cyberdecks. It combines a **wiki**, **forum**, **build showcase**, and **meetup calendar** into a single, cohesive, fun, and colorful application. The site is built with **Astro 6** (SSR with island architecture), uses **Better Auth** for magic‑link authentication, **Drizzle ORM** for type‑safe database access, and runs on **Cloudflare Pages** with a **D1** SQLite‑compatible database.

## Architecture

- **Frontend** – Astro components (`src/components/**`) render pages and interactive islands (**React only** via `@astrojs/react`). Tailwind CSS v4 provides vibrant, approachable styling (`src/styles/global.css`).
- **API Layer** – Cloudflare Pages Functions (`src/pages/api/**`) expose REST‑style endpoints for authentication, wiki, forum, builds, meetups, and static pages.
- **Middleware** – `src/middleware.ts` runs on every request: creates per‑request auth and DB instances, resolves the Better Auth session, and injects `locals.user`, `locals.session`, and `locals.db` for use in pages and API routes.
- **Auth** – Better Auth (`src/lib/auth.ts`) is a **per-request factory** (`getAuth(cfEnv)`) — not a module-level singleton — to avoid SQLite WAL-lock issues. It handles magic‑link sign‑in via Resend. `better-auth.config.ts` (root) is used **only** for schema generation (`npm auth:generate`).
- **Database** – Drizzle ORM (`src/db/**`) defines schema in two files:
  - `src/db/auth-schema.ts` — Better Auth tables: `user`, `session`, `account`, `verification`
  - `src/db/schema.ts` — App tables: `wikiCategories`, `wikiArticles`, `wikiRevisions`, `forumCategories`, `forumThreads`, `forumPosts`, `builds`, `meetups`, `staticPages`
  - DB client factory: `src/db/client.ts` (`getDb(cfEnv)`) — also per-request
  - Migrations live in `drizzle/migrations/`
- **D1 Binding** – The database is accessed via the Cloudflare `DB` binding (not a `DATABASE_URL`). Configured in `wrangler.jsonc`.
- **Deployment** – `wrangler.jsonc` configures the deployment; `npm deploy` runs `astro build && wrangler pages deploy ./dist` to publish to **Cloudflare Pages**.

## User Roles

The app uses a four-tier role system stored on the `user` table:

| Role | Description |
|------|-------------|
| `member` | Default role for all new sign-ups |
| `maker` | Has submitted one build, can create forum threads, create wiki pages, comment like a member, manage own content |
| `moderator` | Can view and manage content (forum, wiki, static pages) |
| `admin` | Full access; auto-assigned to the email matching `ADMIN_EMAIL` env var on first sign-up |

## Agents

| Agent | Responsibility | Key Files |
|-------|----------------|-----------|
| **Auth Agent** | Handles login, signup, session validation, and magic‑link email delivery. | `src/lib/auth.ts`, `src/lib/resend.ts`, `src/db/auth-schema.ts`, `src/pages/api/auth/[...all].ts`, `src/middleware.ts` |
| **Forum Agent** | Manages forum categories, threads, posts, and moderation actions (pin, lock). | `src/lib/forum.ts`, `src/pages/api/forum/threads.ts`, `src/pages/api/forum/posts.ts`, `src/pages/api/admin/forum/**`, `src/components/ForumSidebar.astro`, `src/components/ForumThreadPreview.astro` |
| **Wiki Agent** | Provides CRUD for wiki articles with revision history, markdown rendering, and inline editing. | `src/lib/wiki.ts`, `src/pages/api/wiki/**`, `src/components/wiki/**`, `src/utils/MarkdownRenderer.tsx` |
| **Build Agent** | Stores and displays user‑submitted cyberdeck builds with images and specs. | `src/lib/builds.ts`, `src/pages/api/builds/**`, `src/components/BuildCard.astro`, `src/layouts/BuildLayout.astro` |
| **Meetup Agent** | Manages meetup events and calendar view. | `src/lib/meetups.ts`, `src/pages/api/meetups/**`, `src/pages/meetups/**`, `src/layouts/MeetupLayout.astro` |
| **Admin Agent** | Provides admin dashboards for managing users, content, and static pages. | `src/pages/admin/**`, `src/pages/api/admin/**`, `src/layouts/AdminLayout.astro` |
| **Static‑Page Agent** | Serves and manages DB-driven static informational pages (about, FAQ, etc.). | `src/pages/api/static-pages/[slug].ts`, `src/pages/api/admin/static-pages/**`, `src/pages/admin/static/index.astro` |

## Data Flow

1. **User Request** – Browser sends a request to an Astro‑generated page or an API endpoint.
2. **Middleware** – `src/middleware.ts` runs first: creates per-request `auth` and `db` instances, resolves the session, and attaches `locals.user`, `locals.session`, and `locals.db`.
3. **Auth Check** – API routes and admin pages inspect `locals.user` and `locals.user.role` to enforce authentication and authorization (`member` / `moderator` / `admin`).
4. **Business Logic** – The appropriate agent lib function (e.g., `getForumThreads()`) is called, using `locals.db` (a per-request Drizzle instance) to read/write the D1 database.
5. **Response** – Data is returned as JSON (API) or rendered HTML (Astro page) and sent back to the client.
6. **Client‑Side** – Interactive React islands hydrate on the client, enabling dynamic UI without full page reloads.

## Deployment

- **Build** – `npm build` compiles Astro pages and bundles the Worker script.
- **Deploy** – `npm deploy` runs `astro build && wrangler pages deploy ./dist` to publish to Cloudflare Pages.
- **Environment** – Required variables (set in `.env` locally or Cloudflare dashboard in production):
  - `BETTER_AUTH_SECRET` – Secret for Better Auth session signing
  - `RESEND_API_KEY` – Resend API key for magic-link email delivery
  - `EMAIL_FROM` or `RESEND_FROM_ADDRESS` – Sender address for auth emails (defaults to `CyberDeck <noreply@cyberdeck.club>`)
  - `ADMIN_EMAIL` – Email address to auto-promote to `admin` role on first sign-up
  - `PUBLIC_BASE_URL` – Public-facing base URL (e.g., `https://cyberdeck.club`)
  - D1 database is accessed via the `DB` Cloudflare binding configured in `wrangler.jsonc` — no `DATABASE_URL` needed.
- **CI/CD** – GitHub Actions can be set up to run `npm build` and deploy on merges to `main`.

## Contributing

1. **Fork the repository** and clone your fork.
2. **Create a feature branch** (`git checkout -b feature/your‑feature`).
3. **Install dependencies** (`npm install`).
4. **Run locally** (`npm dev` — runs `astro build && wrangler dev` for the full Workers-compatible environment).
5. **Type-check** – Run `npm lint` (`astro check`) to catch TypeScript errors. Note: there is no ESLint or Prettier configuration; formatting is left to editor defaults.
6. **Submit a Pull Request** – Reference any related issues and request a review.

---

*Last updated by the Roo architecture assistant.*
