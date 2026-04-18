# EmDash + Ella Mae Implementation Summary

This document summarizes key patterns from the Ella Mae theme and EmDash CMS for implementing cyberdeck.club.

---

## Part 1: Ella Mae Theme Analysis

### Tech Stack
- **Astro 6** with `@tailwindcss/vite` (Tailwind CSS v4)
- **MDX** via `@astrojs/mdx`
- **Sitemap** via `@astrojs/sitemap`
- **RSS** via `@astrojs/rss`
- **SEO** via `@lexingtonthemes/seo`
- **Alias:** `@/*` → `src/*`

### Key Structural Files

| Path | Purpose |
|------|---------|
| [`astro.config.mjs`](cyberdeck.club/.reference/ellamae/astro.config.mjs) | Tailwind v4 via `@tailwindcss/vite`, site URL, integrations |
| [`src/styles/global.css`](cyberdeck.club/.reference/ellamae/src/styles/global.css) | `@theme` block with OKLCH color palette, font variables, animations |
| [`src/layouts/BaseLayout.astro`](cyberdeck.club/.reference/ellamae/src/layouts/BaseLayout.astro) | HTML shell: imports global CSS, BaseHead, Navigation, Footer, `<main>` slot |
| [`src/layouts/BlogLayout.astro`](cyberdeck.club/.reference/ellamae/src/layouts/BlogLayout.astro) | Blog post layout: hero image, author info, related posts grid |
| [`src/components/global/Navigation.astro`](cyberdeck.club/.reference/ellamae/src/components/global/Navigation.astro) | Fixed nav bar with mobile hamburger menu |
| [`src/components/global/Footer.astro`](cyberdeck.club/.reference/ellamae/src/components/global/Footer.astro) | Site footer |
| [`src/components/blog/BlogCard.astro`](cyberdeck.club/.reference/ellamae/src/components/blog/BlogCard.astro) | Blog post card with image, title, description |
| [`src/components/fundations/`](cyberdeck.club/.reference/ellamae/src/components/fundations/) | Reusable primitives: Button, Text, Wrapper, head components, icons |
| [`src/pages/`](cyberdeck.club/.reference/ellamae/src/pages/) | File-based routing: index, blog/, changelog/, customers/, helpcenter/, integrations/, team/, legal/, forms/, system/ |
| [`src/content/`](cyberdeck.club/.reference/ellamae/src/content/) | Markdown content collections: posts, changelog, legal, team, customers, helpcenter, integrations |

### Color System (OKLCH)

Defined in [`global.css`](cyberdeck.club/.reference/ellamae/src/styles/global.css) via `@theme`:

| Token | Usage |
|-------|-------|
| `--color-accent-*` | Primary accent (blue palette, accent-900 = dark) |
| `--color-base-*` | Neutral base (warm gray palette, base-900 = near black) |
| `--color-secondary-*` | Secondary (warm palette for surfaces) |
| `--color-white` / `--color-black` | Constants |
| `--font-sans` | InterVariable |

### Layout Pattern

```astro
<!-- BaseLayout.astro -->
<html class="scroll-smooth selection:bg-accent-900 selection:text-accent-300">
  <head><BaseHead /> {/* imports global.css, Seo, Meta, Fonts, Favicons */}</head>
  <body class="flex flex-col bg-white min-h-svh">
    {!hideNav && <Navigation />}
    <main class="grow"><slot /></main>
    {!hideFooter && <Footer />}
  </body>
</html>
```

### Design Patterns

1. **Wrapper component** for consistent max-width containers: `<Wrapper variant="standard" class="py-32">`
2. **Text component** for consistent typography: `<Text tag="h1" variant="displayMD">`
3. **Button component** with variants, sizes, icon support
4. **Hero image** extends to viewport edge with negative margin (see BlogLayout featured post)
5. **3-column grid** for posts (responsive to 2-col, then 1-col)
6. **Related posts** section with matching tag filtering

---

## Part 2: EmDash Site-Building Conventions

### File Structure

```
my-site/
├── astro.config.mjs          # Astro config with emdash() integration
├── src/
│   ├── live.config.ts         # EmDash loader registration (boilerplate)
│   ├── pages/                 # Astro pages (all server-rendered)
│   ├── layouts/               # Layout components
│   └── components/            # Reusable components
├── seed/
│   └── seed.json              # Schema + demo content
├── emdash-env.d.ts          # Generated types (from `emdash types`)
└── package.json
```

### Key Files Fetched

| Source | Saved to |
|--------|----------|
| [`skills/building-emdash-site/SKILL.md`](cyberdeck.club/.reference/emdash/building-emdash-site/SKILL.md) | Core SKILL for building EmDash sites |
| [`skills/building-emdash-site/references/configuration.md`](cyberdeck.club/.reference/emdash/building-emdash-site/references/configuration.md) | astro.config, live.config, deployment, types |
| [`skills/building-emdash-site/references/schema-and-seed.md`](cyberdeck.club/.reference/emdash/building-emdash-site/references/schema-and-seed.md) | Collections, fields, taxonomies, menus, widgets, seed format |
| [`skills/building-emdash-site/references/site-features.md`](cyberdeck.club/.reference/emdash/building-emdash-site/references/site-features.md) | Settings, menus, widgets, search, SEO, comments, page contributions |
| [`skills/emdash-cli/SKILL.md`](cyberdeck.club/.reference/emdash/emdash-cli/SKILL.md) | CLI for content CRUD, schema, media |
| [`skills/creating-plugins/SKILL.md`](cyberdeck.club/.reference/emdash/creating-plugins/SKILL.md) | Plugin anatomy, hooks, storage, admin UI, API routes |
| [`skills/creating-plugins/references/api-routes.md`](cyberdeck.club/.reference/emdash/creating-plugins/references/api-routes.md) | Route handlers, validation, context |
| [`templates/blog/astro.config.mjs`](cyberdeck.club/.reference/emdash/example-template-blog/astro.config.mjs) | Example config with Node adapter, fonts, auditLogPlugin |
| [`templates/blog/seed/seed.json`](cyberdeck.club/.reference/emdash/example-template-blog/seed.json) | Full example seed with collections, taxonomies, menus, widgets, content |
| [`templates/blog/src/pages/index.astro`](cyberdeck.club/.reference/emdash/example-template-blog/index.astro) | Blog homepage with featured post + grid |

### astro.config.mjs Patterns

**Node.js (local/self-hosted):**
```javascript
import node from "@astrojs/node";
import react from "@astrojs/react";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [
    react(),
    emdash({
      database: sqlite({ url: "file:./data.db" }),
      storage: local({ directory: "./uploads", baseUrl: "/_emdash/api/media/file" }),
      plugins: [auditLogPlugin()],
    }),
  ],
  fonts: [{ provider: fontProviders.google(), name: "Inter", cssVariable: "--font-sans", ... }],
  devToolbar: { enabled: false },
});
```

### Seed File Structure

```json
{
  "$schema": "https://emdashcms.com/seed.schema.json",
  "version": "1",
  "meta": { "name": "...", "description": "...", "author": "..." },
  "settings": { "title": "...", "tagline": "..." },
  "collections": [...],
  "taxonomies": [...],
  "menus": [...],
  "widgetAreas": [...],
  "sections": [...],
  "bylines": [...],
  "content": { "posts": [...], "pages": [...] }
}
```

### Collections

```json
{
  "slug": "posts",
  "label": "Posts",
  "labelSingular": "Post",
  "supports": ["drafts", "revisions", "search", "seo"],
  "commentsEnabled": true,
  "fields": [
    { "slug": "title", "label": "Title", "type": "string", "required": true, "searchable": true },
    { "slug": "featured_image", "label": "Featured Image", "type": "image" },
    { "slug": "content", "label": "Content", "type": "portableText", "searchable": true },
    { "slug": "excerpt", "label": "Excerpt", "type": "text" }
  ]
}
```

**Field types:** `string`, `text`, `number`, `integer`, `boolean`, `datetime`, `image`, `reference`, `portableText`, `json`

**⚠️ Image fields are objects, not strings:** `{ id, src, alt }` — use `<Image image={post.data.featured_image} />` from `emdash/ui`.

### Taxonomies

```json
{
  "name": "category",
  "label": "Categories",
  "labelSingular": "Category",
  "hierarchical": true,
  "collections": ["posts"],
  "terms": [
    { "slug": "development", "label": "Development" }
  ]
}
```

**⚠️ Taxonomy name must match seed exactly.** Use `getTerm("category", slug)` not `getTerm("categories", slug)`.

### Content API

```typescript
import { getEmDashCollection, getEmDashEntry, getEntryTerms } from "emdash";

// Fetch collection with pagination
const { entries, nextCursor, cacheHint } = await getEmDashCollection("posts", {
  limit: 10,
  cursor,
  orderBy: { published_at: "desc" },
});

// Single entry
const { entry: post, cacheHint } = await getEmDashEntry("posts", slug);

// Cache hint (REQUIRED on every page)
Astro.cache.set(cacheHint);

// Entry terms (use data.id, NOT entry.id)
const tags = await getEntryTerms("posts", post.data.id, "tag");
```

### Bylines (Authors)

Bylines are **eagerly loaded** on entries — no separate query needed:
```astro
{post.data.byline && <span>{post.data.byline.displayName}</span>}
{post.data.bylines?.map(credit => (
  <span>{credit.byline.displayName} {credit.roleLabel && <em>({credit.roleLabel})</em>}</span>
))}
```

### UI Components from `emdash/ui`

```typescript
import {
  PortableText,  // Render PT blocks
  Image,         // Render image fields (NOT raw src)
  Comments, CommentForm,  // Built-in comments
  WidgetArea,    // Render widget areas
  EmDashHead, EmDashBodyStart, EmDashBodyEnd,  // Plugin injection support
} from "emdash/ui";
import LiveSearch from "emdash/ui/search";
```

### Search

```astro
<LiveSearch placeholder="Search..." collections={["posts", "pages"]} />
```

Requires collection to have `"search"` in `supports` and fields marked `"searchable": true`.

### Menus

```astro
import { getMenu } from "emdash";
const menu = await getMenu("primary");
// menu.items: { id, label, url, target?, children[] }
```

### Widget Areas

```astro
<WidgetArea name="sidebar" />
```

Core widgets: `core:search`, `core:categories`, `core:tags`, `core:recent-posts`, `core:archives`

### Common Gotchas

1. **Image fields are objects** — `<Image image={...} />` not `<img src={...}>`
2. **`entry.id` vs `entry.data.id`** — slug vs ULID (use in URLs vs API calls)
3. **Taxonomy names** must match seed exactly
4. **Always pass `cacheHint`** to `Astro.cache.set()` or cache invalidation won't work
5. **No `getStaticPaths`** — EmDash content is dynamic; pages must be server-rendered

---

## Part 3: Plugin Integration Patterns

### Plugin Anatomy

```
my-plugin/
├── src/
│   ├── index.ts            # Descriptor factory (Vite/build time)
│   ├── sandbox-entry.ts    # definePlugin() (request time)
│   ├── admin.tsx           # React admin UI (native only)
│   └── astro/              # Astro components (native only)
├── package.json
└── tsconfig.json
```

### Standard Plugin Pattern

```typescript
// src/index.ts — runs at build time
export function myPlugin(): PluginDescriptor {
  return {
    id: "my-plugin",
    version: "1.0.0",
    format: "standard",
    entrypoint: "@my-org/my-plugin/sandbox",
    capabilities: ["read:content", "network:fetch"],
    allowedHosts: ["api.example.com"],
    storage: { myCollection: { indexes: ["field"] } },
  };
}
```

```typescript
// src/sandbox-entry.ts — runs at request time
export default definePlugin({
  hooks: {
    "content:afterSave": { handler: async (event, ctx) => { ... } },
  },
  routes: {
    myRoute: {
      input: z.object({ ... }),
      handler: async (routeCtx, ctx) => { return { ... }; },
    },
  },
});
```

### Registration

```javascript
// astro.config.mjs
emdash({
  plugins: [myPlugin()],    // trusted mode
  // OR
  sandboxed: [myPlugin()],  // Cloudflare Workers isolate
})
```

### Capabilities

| Capability | Grants |
|------------|--------|
| `read:content` | `ctx.content.get()`, `ctx.content.list()` |
| `write:content` | `ctx.content.create()`, `ctx.content.update()`, `ctx.content.delete()` |
| `read:media` | `ctx.media.get()`, `ctx.media.list()` |
| `network:fetch` | `ctx.http.fetch()` (restricted to `allowedHosts`) |
| `email:send` | `ctx.email.send()` |

---

## Summary for Orchestrator

### Implementation Approach

1. **Initialize EmDash site** using the blog template as base
2. **Adapt Ella Mae styling** (OKLCH colors, Tailwind v4, component patterns) to EmDash's server-rendered model
3. **Define collections** in `seed/seed.json` based on cyberdeck.club content types
4. **Create layouts** following Ella Mae's patterns but using EmDash's `getEmDashCollection`, `getMenu`, `getEntryTerms`, etc.
5. **Implement pages** with proper caching (`Astro.cache.set(cacheHint)`)
6. **Add plugins** as needed (forum, wiki) following the standard plugin format

### Key Reference Files

| File | Purpose |
|------|---------|
| [`.reference/ellamae/AGENTS.md`](cyberdeck.club/.reference/ellamae/AGENTS.md) | Complete theme documentation |
| [`.reference/emdash/building-emdash-site/SKILL.md`](cyberdeck.club/.reference/emdash/building-emdash-site/SKILL.md) | Core EmDash site-building guide |
| [`.reference/emdash/building-emdash-site/references/schema-and-seed.md`](cyberdeck.club/.reference/emdash/building-emdash-site/references/schema-and-seed.md) | Schema design reference |
| [`.reference/emdash/example-template-blog/seed.json`](cyberdeck.club/.reference/emdash/example-template-blog/seed.json) | Complete seed file example |
| [`.reference/emdash/example-template-blog/index.astro`](cyberdeck.club/.reference/emdash/example-template-blog/index.astro) | Blog homepage with featured + grid pattern |
| [`.reference/emdash/creating-plugins/SKILL.md`](cyberdeck.club/.reference/emdash/creating-plugins/SKILL.md) | Plugin development guide |