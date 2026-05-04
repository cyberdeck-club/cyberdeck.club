# AGENTS.md — cyberdeck.club

> Single source of truth for onboarding coding agents to this repository.
> This file is included in every agentic coding session — follow it strictly.
>
> **For all design, color, typography, component, copy tone, and accessibility
> decisions, read `DESIGN.md` BEFORE generating any UI code.** This file covers
> architecture, stack, conventions, and guardrails only.

---

## 0. What This Is

**cyberdeck.club** is a community platform for cyberdeck builders — part wiki,
part forum, part build showcase. The primary audience is women, femmes, queer
folk, and people historically excluded from tech/maker spaces. The community
celebrates cyberdecks as aesthetic expression — builds in Polly Pocket toys,
dinosaur toys, purses, clamshell compacts — not just utilitarian Pelican case
builds.

**Design direction:** Femme maximalist neobrutalism. See `DESIGN.md` for the
complete design system — palette, typography, components, copy tone, inclusive
identity patterns, and accessibility requirements.

**Repository:** `https://github.com/cyberdeck-club/cyberdeck.club/`

---

## 1. Tech Stack

| Layer           | Technology                          | Notes                                    |
|-----------------|-------------------------------------|------------------------------------------|
| **Framework**   | Astro 6                             | SSR mode, file-based routing             |
| **Styling**     | Tailwind CSS v4                     | CSS-first config — NO `tailwind.config.js` |
| **Database**    | Drizzle ORM + Cloudflare D1         | SQLite at the edge                       |
| **Auth**        | Resend magic links                  | Passwordless email authentication        |
| **Deployment**  | Cloudflare Pages + Workers          | `wrangler.jsonc`                         |
| **Language**    | TypeScript (strict)                 | Throughout                               |

### Key Dependencies

- `@tailwindcss/vite` — Tailwind v4 Vite plugin (NOT `tailwind.config.js`)
- `@tailwindcss/forms` — Form reset styles
- `@tailwindcss/typography` — Prose styling for wiki/blog content
- `drizzle-orm` + `drizzle-kit` — Schema, migrations, queries
- `resend` — Transactional email (magic links)

---

## 2. Folder Map

```
cyberdeck.club/
├── AGENTS.md              ← You are here
├── DESIGN.md              ← Design system (READ BEFORE UI WORK)
├── astro.config.mjs       ← Astro + Tailwind vite plugin
├── wrangler.jsonc         ← Cloudflare Workers/D1 config
├── drizzle.config.ts      ← Drizzle Kit config
├── package.json
├── tsconfig.json
├── public/                ← Static assets
├── mcp-server/            ← MCP server package (PAT-authenticated API client)
├── src/
│   ├── components/        ← Astro components
│   ├── layouts/           ← Page layouts (BaseLayout, WikiLayout, etc.)
│   ├── pages/             ← File-based routing
│   │   ├── wiki/          ← Wiki section
│   │   ├── forum/         ← Forum section
│   │   ├── builds/        ← Build showcase
│   │   ├── meetups/       ← Events
│   │   └── api/           ← API routes (auth, data)
│   ├── db/
│   │   ├── schema.ts      ← Drizzle schema definitions
│   │   └── index.ts       ← DB client / connection
│   ├── lib/
│   │   ├── auth.ts        ← Magic link auth + role system (ROLES, requireRole)
│   │   ├── moderation.ts  ← Build moderation pipeline + role promotion logic
│   │   ├── pat-auth.ts    ← PAT validation, token generation, usage logging
│   │   ├── token-scopes.ts← PAT scope definitions and route mapping
│   │   └── utils.ts       ← cn() helper (clsx + tailwind-merge)
│   └── styles/
│       └── global.css     ← Tailwind v4 @theme, design tokens
└── migrations/            ← Drizzle migrations (DO NOT hand-edit)
```

---

## 3. Development Commands

| Command                        | Action                                      |
|--------------------------------|---------------------------------------------|
| `pnpm install`                 | Install dependencies                        |
| `pnpm dev`                     | Start dev server (localhost:4321)            |
| `pnpm build`                   | Production build                            |
| `pnpm preview`                 | Preview production build locally             |
| `pnpm drizzle-kit generate`    | Generate migration from schema changes      |
| `pnpm drizzle-kit migrate`     | Apply migrations                            |
| `pnpm drizzle-kit studio`      | Open Drizzle Studio (DB browser)            |
| `npx wrangler d1 execute ...`  | Run SQL against D1 database                 |
| `npx wrangler pages deploy`    | Deploy to Cloudflare Pages                  |

---

## 4. Architecture Decisions

### 4.1 Authentication — Resend Magic Links

- Passwordless login via email magic links sent through Resend.
- No passwords stored. No OAuth providers (GitHub login is an exclusion
  vector for non-developer community members).
- Session tokens stored as HTTP-only cookies.
- ALWAYS use display name in transactional emails. NEVER "Real name."

### 4.2 Database — Drizzle + Cloudflare D1

- Schema defined in `src/db/schema.ts` using Drizzle's SQLite dialect.
- Migrations generated by `drizzle-kit generate`, applied via `drizzle-kit migrate`.
- NEVER hand-edit migration files.
- D1 bindings configured in `wrangler.jsonc`.

### 4.3 Styling — Tailwind CSS v4

- CSS-first configuration in `src/styles/global.css`.
- NO `tailwind.config.js` or `tailwind.config.ts`. NEVER create one.
- Design tokens defined via `@theme` and `@theme inline` blocks.
- See `DESIGN.md` §2 (Color System) and §15 (Tailwind v4 Configuration)
  for the complete token set.
- Class helper: `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge).

### 4.4 Astro Configuration (`astro.config.mjs`)

```js
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "server",
  vite: {
    plugins: [tailwindcss()],
  },
  // ... adapter config for Cloudflare
});
```

---

## 5. Access Control & Role System

### 5.1 Roles (ordered by privilege)

| Role              | How you get it                                              | Numeric level |
|-------------------|-------------------------------------------------------------|---------------|
| **Visitor**       | Default (not logged in)                                     | `0`           |
| **Member**        | Create an account via magic link                            | `10`          |
| **Maker**         | Auto-promoted 7 days after first build is published without removal | `20`   |
| **Trusted Maker** | Auto-promoted after 3 accepted builds                       | `30`          |
| **Moderator**     | Nominated by community, appointed by admin                  | `40`          |
| **Admin**         | Appointed by existing admin                                 | `50`          |

Roles are **additive** — each role inherits all permissions of the roles
below it. Store as an integer `role` column on the `users` table. Compare
with `>=` for permission checks, NEVER match exact values.

### 5.2 Permission Matrix

| Action                              | Visitor | Member | Maker | Trusted Maker | Moderator | Admin |
|-------------------------------------|---------|--------|-------|---------------|-----------|-------|
| Browse wiki                         | ✅      | ✅     | ✅    | ✅            | ✅        | ✅    |
| Browse builds gallery               | ✅      | ✅     | ✅    | ✅            | ✅        | ✅    |
| Read forum threads                  | ✅      | ✅     | ✅    | ✅            | ✅        | ✅    |
| Read about / homepage               | ✅      | ✅     | ✅    | ✅            | ✅        | ✅    |
| Reply to forum threads              | ❌      | ✅     | ✅    | ✅            | ✅        | ✅    |
| Submit builds (queued for approval) | ❌      | ✅     | ✅    | ✅            | ✅        | ✅    |
| Edit own profile                    | ❌      | ✅     | ✅    | ✅            | ✅        | ✅    |
| Create forum threads                | ❌      | ❌     | ✅    | ✅            | ✅        | ✅    |
| Create / edit wiki pages            | ❌      | ❌     | ✅    | ✅            | ✅        | ✅    |
| Submit builds (no queue)            | ❌      | ❌     | ✅    | ✅            | ✅        | ✅    |
| Approve/reject member builds        | ❌      | ❌     | ❌    | ✅            | ✅        | ✅    |
| Create / host meetups               | ❌      | ❌     | ❌    | ✅            | ✅        | ✅    |
| Revert wiki edits                   | ❌      | ❌     | ❌    | ❌            | ✅        | ✅    |
| Lock/move/delete forum threads      | ❌      | ❌     | ❌    | ❌            | ✅        | ✅    |
| Manage reports                      | ❌      | ❌     | ❌    | ❌            | ✅        | ✅    |
| Soft-ban users                      | ❌      | ❌     | ❌    | ❌            | ✅        | ✅    |
| Nominate moderators                 | ❌      | ❌     | ❌    | ✅            | ✅        | ✅    |
| Manage roles                        | ❌      | ❌     | ❌    | ❌            | ❌        | ✅    |
| Appoint moderators                  | ❌      | ❌     | ❌    | ❌            | ❌        | ✅    |
| Site settings                       | ❌      | ❌     | ❌    | ❌            | ❌        | ✅    |
| Hard-ban users                      | ❌      | ❌     | ❌    | ❌            | ❌        | ✅    |

### 5.3 Role Progression Rules

**Member → Maker (automatic)**
- Triggered when a member's first build has been in `published` status for
  ≥ 7 calendar days without being removed or flagged.
- Implemented as a scheduled check (Cloudflare Cron Trigger) or evaluated
  on login / on page load.
- The build must have passed both LLM-automated moderation AND not been
  manually flagged by a moderator.

**Maker → Trusted Maker (automatic)**
- Triggered when a maker has ≥ 3 builds in `published` status.
- All 3 builds must have passed moderation (no reverted/removed builds count).
- Evaluated on build approval.

**Trusted Maker → Moderator (nomination + appointment)**
- Any trusted maker or moderator can nominate a user for moderator.
- Nomination sets three fields on the user record:
  `is_mod_nominated` (boolean), `mod_nominated_by` (user ID FK),
  `mod_nominated_at` (ISO 8601 timestamp).
- Admins review nominations and appoint. Appointment sets `role = 40`.
- Nomination is visible to admins only — the nominated user is NOT notified
  until appointed.

**Moderator → Admin (appointment only)**
- Only existing admins can appoint other admins.

### 5.4 Build Moderation Pipeline

```
Member submits build
  → LLM automated review (content safety, spam, image check)
    → PASS → status = "pending_human" (enters mod queue)
    → FAIL → status = "rejected_auto" + reason stored
      → Member notified with specific, non-blaming feedback

Moderator OR Trusted Maker reviews from queue
  → APPROVE → status = "published", published_at = now()
  → REJECT  → status = "rejected" + reason (human-written)
    → Member notified with constructive feedback

7 days after published_at with no flags:
  → If member's first published build → promote to Maker (role = 20)

On 3rd published build:
  → If role < 30 → promote to Trusted Maker (role = 30)
```

### 5.5 Wiki Safety

- Full revision history stored for every wiki page edit.
- Each revision stores: `user_id`, `created_at`, `content`, `diff_summary`.
- One-click revert available to moderators and admins.
- Recent changes feed (all wiki edits, newest first) visible to moderators.
- Wiki edits by newly-promoted makers (maker for < 30 days) are soft-flagged
  in the mod queue — they go live immediately but appear in a "review recent
  edits" list.

### 5.6 Authorization Middleware Pattern

```ts
// src/lib/auth.ts

export const ROLES = {
  VISITOR: 0,
  MEMBER: 10,
  MAKER: 20,
  TRUSTED_MAKER: 30,
  MODERATOR: 40,
  ADMIN: 50,
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export function requireRole(userRole: number, minRole: Role): boolean {
  return userRole >= minRole;
}

// Usage in API route:
// if (!requireRole(user.role, ROLES.MAKER)) return new Response(null, { status: 403 });

// Usage in Astro page (server-side):
// if (!requireRole(user.role, ROLES.MEMBER)) return Astro.redirect('/login');
```

ALWAYS use `>=` comparison. NEVER check `=== ROLES.MAKER` — that would
exclude moderators and admins.

### 5.7 User Schema Fields for Access Control

```ts
// In src/db/schema.ts (relevant columns on users table)

role:              integer('role').notNull().default(10),        // ROLES enum value
accepted_build_count: integer('accepted_build_count').notNull().default(0),
first_build_published_at: text('first_build_published_at'),     // ISO 8601 or null
is_mod_nominated:  integer('is_mod_nominated', { mode: 'boolean' }).notNull().default(false),
mod_nominated_by:  text('mod_nominated_by').references(() => users.id),
mod_nominated_at:  text('mod_nominated_at'),                    // ISO 8601 or null
banned_at:         text('banned_at'),                           // soft-ban timestamp or null
banned_by:         text('banned_by').references(() => users.id),
ban_reason:        text('ban_reason'),
```

---

## 6. Page Routing

| Section   | Index         | Entry                              |
|-----------|---------------|------------------------------------|
| Home      | `/`           | —                                  |
| Wiki      | `/wiki/`      | `/wiki/[category]/[slug]`          |
| Forum     | `/forum/`     | `/forum/[category]/`, `/forum/thread/[id]` |
| Builds    | `/builds/`    | `/builds/[slug]`                   |
| Meetups   | `/meetups/`   | `/meetups/[slug]`                  |
| About     | `/about`      | —                                  |
| Auth      | `/api/auth/*` | Magic link send/verify endpoints   |

---

## 7. Layout Hierarchy

```
BaseLayout.astro
├── WikiLayout.astro      (sidebar + article — two-column)
├── ForumLayout.astro     (sidebar + thread list — two-column)
├── BuildLayout.astro     (full-width build detail)
└── MeetupLayout.astro    (full-width event detail)
```

**WikiLayout** uses a two-column grid with a mobile-toggle sidebar. The wiki
index page (`/wiki/index.astro`) MUST use WikiLayout — without it, the sidebar
and CSS grid break.

---

## 8. Coding Conventions

### 7.1 TypeScript

- Strict mode enabled (`tsconfig.json`).
- Prefer `type` over `interface` unless extending.
- No `any` — use `unknown` and narrow.

### 7.2 Components

- Astro components (`.astro`) for all server-rendered UI.
- React/client components ONLY when island interactivity is required
  (e.g., theme toggle, form validation). Use `client:load` or
  `client:visible` directives — prefer `client:visible` for
  below-the-fold content.
- Component files: PascalCase (`BuildCard.astro`, `ForumThreadPreview.astro`).
- Colocate component-specific types at the top of the file.

### 7.3 Styling

- Use semantic design tokens from `DESIGN.md`. NEVER raw Tailwind palette
  colors (`bg-zinc-*`, `bg-rose-*`).
- NEVER arbitrary values (`bg-[#hex]`, `p-[7px]`) except where explicitly
  shown in `DESIGN.md` component recipes.
- NEVER `dark:` class overrides. Theme switching is CSS-variable-only via
  `data-theme` attribute.
- Use `cn()` for conditional class merging.

### 7.4 Database

- All queries through Drizzle ORM — no raw SQL in application code.
- Schema changes go through `drizzle-kit generate` → migration files.
- Table and column names: `snake_case`.
- Timestamps: ISO 8601 strings stored as TEXT (D1/SQLite).

### 7.5 API Routes

- API routes live in `src/pages/api/`.
- Return JSON with appropriate status codes.
- Validate input before processing. Never trust client data.
- Auth-required routes check session cookie first.

---

## 9. Key Gotchas and Lessons Learned

### 1. WikiLayout Is Required for Wiki Pages

The wiki landing page (`/wiki/index.astro`) MUST use `WikiLayout`, not
`BaseLayout`. Without it, the sidebar grid breaks.

### 2. Tailwind v4 Requires `@tailwindcss/vite`

Tailwind v4 is NOT configured via `tailwind.config.js`. It uses the Vite
plugin + CSS-first `@theme` blocks in `global.css`. If you create a
`tailwind.config.js`, things will break.

### 3. Theme Toggle Script in `<head>`

The theme initialization script MUST be in `<head>` with `is:inline` to
prevent flash of unstyled content (FOUC):

```html
<script is:inline>
  (function() {
    const theme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (theme === 'dark' || (!theme && prefersDark)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  })();
</script>
```

Do NOT remove `is:inline`. Do NOT move this script out of `<head>`.

### 4. D1 Binding Names

D1 database bindings are defined in `wrangler.jsonc`. The binding name used
in application code MUST match the name in `wrangler.jsonc`. Check there
first if you get "binding not found" errors.

### 5. Status Config Lookups Need Fallbacks

When looking up status configurations (builds, meetups), always provide a
fallback to prevent runtime errors on undefined status values:

```ts
const statusConfig = config.statuses.find(s => s.value === status) ?? {
  label: status,
  color: "secondary",
};
```

### 6. Resend API Key Is Server-Side Only

The Resend API key (`RESEND_API_KEY`) MUST only be used in server-side code
(API routes, server-rendered pages). NEVER expose it to the client. Store in
Cloudflare environment variables, not in client-accessible code.

### 7. Magic Link Tokens Are Single-Use

Magic link tokens should be invalidated after first use AND after expiration
(recommend 15 minutes). Always check both conditions on verification.

### 8. PAT Auth Is Scope-Checked

PAT-authenticated requests go through scope validation in middleware. The
token's scopes AND the user's current role must both permit the operation. If
a user's role is demoted, their existing tokens are effectively narrowed — the
request fails if all scopes become invalid for the new role level.

---

## 10. Guardrails

These rules apply in every coding session, regardless of task type:

- **Do NOT** replace `WikiLayout` with `BaseLayout` on wiki pages.
- **Do NOT** use hardcoded color values — use CSS variables / design tokens
  from `DESIGN.md`.
- **Do NOT** remove `is:inline` from the theme script in `<head>`.
- **Do NOT** create a `tailwind.config.js` or `tailwind.config.ts`.
- **Do NOT** use Tailwind v3 syntax (`darkMode: 'class'`, `theme.extend`,
  config-file-based customization).
- **Do NOT** use `dark:` class prefixes. Theming is CSS-variable-only
  (`data-theme` attribute on `<html>`).
- **Do NOT** hand-edit Drizzle migration files.
- **Do NOT** expose `RESEND_API_KEY` to client-side code.
- **Do NOT** use Tailwind palette colors (`bg-zinc-*`, `text-blue-*`, etc.).
- **Do NOT** use arbitrary hex values (`bg-[#abc]`).
- **Do NOT** generate UI code without first reading `DESIGN.md`.
- **Do NOT** check roles with `===` — ALWAYS use `>=` comparison via
  `requireRole()` so higher roles inherit lower permissions.
- **Do NOT** skip LLM moderation for member-submitted builds.
- **Do NOT** notify users about mod nominations — only admins see them.
- **Do NOT** allow role changes except through the defined progression
  paths (auto-promotion, admin appointment). No self-service role upgrades.
- **Do NOT** delete wiki revisions. Revisions are append-only.
- **Do NOT** hard-delete user accounts — soft-ban with `banned_at` timestamp.

---

## 11. Reference Documents

| Document                       | Purpose                                              |
|--------------------------------|------------------------------------------------------|
| `DESIGN.md`                    | Complete design system — colors, typography, spacing, components, copy tone, accessibility, inclusive identity patterns |
| `astro.config.mjs`            | Astro + Tailwind vite plugin configuration           |
| `wrangler.jsonc`              | Cloudflare Workers/D1 bindings and D1 database config |
| `src/db/schema.ts`            | Drizzle schema definitions (users, builds, wiki, forum, etc.) |
| `src/styles/global.css`       | Tailwind v4 `@theme` tokens (implements `DESIGN.md`) |
| `src/lib/utils.ts`            | `cn()` class helper                                  |
| `src/lib/auth.ts`             | Magic link auth + role checking (`requireRole()`)    |
| `src/lib/pat-auth.ts`         | PAT validation, token generation, usage logging       |
| `src/lib/token-scopes.ts`     | PAT scope definitions and route-to-scope mapping     |
| `src/layouts/BaseLayout.astro`| Root layout (nav, footer, theme toggle)              |
| `docs/PAT-API-TOKENS.md`      | Personal access token system, API authentication, scopes |
| `docs/MCP-SERVER.md`          | MCP server setup and usage guide                     |
| `mcp-server/README.md`       | MCP server package documentation                     |

---

*Last updated: 2026-05-03*
