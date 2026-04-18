# AGENTS.md — cyberdeck.club (`cyberdeck.club`)

**cyberdeck.club** is a community platform for cyberdeck builders — part wiki, part forum, part build showcase. Built with Astro 6 and EmDash CMS, featuring a "girlie pop" aesthetic with neobrutalist styling.

**Publisher:** cyberdeck.club Community  
**Repository:** `https://github.com/cyberdeck-club/cyberdeck.club/`

## Tech Stack

- **Astro** `^5.17.3` (`astro.config.mjs`) — SSR mode with Node adapter
- **EmDash CMS** `^0.1.0` — Headless CMS with admin UI at `/_emdash/admin`
- **Tailwind CSS** `^4.1.18` via **`@tailwindcss/vite`**; plugins: **`@tailwindcss/forms`**, **`@tailwindcss/typography`**, **`tailwind-scrollbar-hide`**
- **React** `^18.0.0` — For EmDash editor components
- **Database:** SQLite via EmDash (`file:./data.db`)
- **Storage:** Local filesystem (`./uploads`) with `/~emdash/api/media/file` base URL
- **Deployment:** Cloudflare Pages with Workers support (`wrangler.jsonc`)

### Custom Plugins

| Plugin | Path | Purpose |
|--------|------|---------|
| `emdash-plugin-wiki` | `../emdash-plugin-wiki/` | Wiki article system with categories |
| `emdash-plugin-forum` | `../emdash-plugin-forum/` | Forum with threads, posts, and categories |

## Folder Map

| Area | Path | Role |
|------|------|------|
| Routes | `src/pages/` | File-based routing for wiki, forum, builds, meetups |
| Layouts | `src/layouts/` | `BaseLayout.astro`, section layouts (WikiLayout, ForumLayout, etc.) |
| Components | `src/components/` | Nav, Footer, Cards (BuildCard, MeetupCard, WikiArticleCard, ForumThreadPreview) |
| Live Config | `src/live.config.ts` | EmDash live collections setup |
| Styles | `src/styles/global.css` | Tailwind v4 `@theme`, colors, animations |
| Seed Data | `seed/` | `seed.json` — EmDash schema and demo content |
| Plugins | `emdash-plugin-wiki/`, `emdash-plugin-forum/` | Custom EmDash plugins |

## EmDash Integration

### Configuration (`astro.config.mjs`)

```javascript
emdash({
  database: sqlite({ url: "file:./data.db" }),
  storage: local({
    directory: "./uploads",
    baseUrl: "/~emdash/api/media/file",
  }),
  plugins: [forumPlugin(), wikiPlugin()],
})
```

### Live Collections (`src/live.config.ts`)

```typescript
import { defineLiveCollection } from "astro:content";
import { emdashLoader } from "emdash/runtime";

export const collections = {
  _emdash: defineLiveCollection({ loader: emdashLoader() }),
};
```

Content is accessed via the `_emdash` collection with loader queries in pages.

### EmDash Commands

| Command | Action |
|---------|--------|
| `npx emdash dev` | Start development server |
| `npx emdash seed seed/seed.json` | Seed database with schema + demo content |
| `npx emdash seed seed/seed.json --no-content` | Seed schema only (no demo content) |
| `npx emdash types` | Generate TypeScript types (`emdash-env.d.ts`) |

### Admin UI

Access the EmDash admin at `/_emdash/admin` for content management.

## Design System

### Theme: "Girlie Pop" + Neobrutalist

The site combines a vibrant "girlie pop" color palette with neobrutalist design elements — bold borders, chunky shadows, and playful hover effects.

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `oklch(65% 0.25 340)` | Hot pink/magenta — primary actions |
| `--color-primary-hover` | `oklch(70% 0.22 340)` | Primary hover state |
| `--color-secondary` | `oklch(70% 0.18 290)` | Electric lavender |
| `--color-accent` | `oklch(75% 0.15 25)` | Warm coral/peach |
| `--color-pop-mint` | `oklch(80% 0.12 170)` | Decorative mint sparkle |
| `--color-pop-sky` | `oklch(80% 0.12 230)` | Decorative sky sparkle |
| `--color-pop-lemon` | `oklch(88% 0.12 95)` | Decorative lemon sparkle |

### Backgrounds

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| `--color-bg-light` | `oklch(98% 0.01 80)` | — |
| `--color-bg-dark` | — | `oklch(18% 0.02 320)` |
| `--color-surface-light` | `oklch(95% 0.01 80)` | — |
| `--color-surface-dark` | — | `oklch(22% 0.02 320)` |

### CSS Variables (runtime)

These are set on `html`/`.dark` classes and used throughout:

```css
:root, .light {
  --bg: var(--color-bg-light);
  --surface: var(--color-surface-light);
  --border: var(--color-border-light);
  --text: var(--color-text-light);
}

.dark {
  --bg: var(--color-bg-dark);
  --surface: var(--color-surface-dark);
  --border: var(--color-border-dark);
  --text: var(--color-text-dark);
}
```

### Neobrutalist Styling Patterns

```css
/* Bold borders */
border-4 border-[var(--border)]

/* Chunky shadows */
box-shadow: 4px 4px 0 var(--border)

/* Hover: translate + reduce shadow */
:hover { transform: translate(2px, 2px); box-shadow: 2px 2px 0 var(--border); }

/* Uppercase labels */
.uppercase tracking-wide font-bold
```

### Animations

| Name | Description |
|------|-------------|
| `marquee` | Continuous left-to-right text scroll |
| `rightMarquee` | Continuous right-to-left (slow) |

## Page Routing

| Section | Index | Entry |
|---------|-------|-------|
| Wiki | `/wiki/` | `/wiki/[category]/[slug]` |
| Forum | `/forum/` | `/forum/[category]/` + `/forum/thread/[id]` |
| Builds | `/builds/` | `/builds/[slug]` |
| Meetups | `/meetups/` | `/meetups/[slug]` |
| Home | `/` | — |
| About | `/about` | — |

## Layout Hierarchy

```
BaseLayout.astro
├── WikiLayout.astro     (sidebar + article)
├── ForumLayout.astro     (sidebar + main content)
├── BuildLayout.astro     (full-width build detail)
└── MeetupLayout.astro    (full-width event detail)
```

### WikiLayout

Two-column layout with mobile toggle. Wraps wiki content pages. **Important:** The wiki index page (`/wiki/index.astro`) MUST use this layout — without it, the sidebar won't render correctly and CSS may break.

### ForumLayout

Two-column layout for forum listing and thread pages.

## Content Access Pattern

Content from EmDash is accessed via the `_emdash` live collection:

```astro
---
import { getEntry } from "astro:content";

const entry = await getEntry("_emdash", "wiki/guides/getting-started");
// entry.data contains the content fields
---
```

## Key Gotchas and Lessons Learned

### 1. Wiki Index Page Requires WikiLayout

The wiki landing page (`/wiki/index.astro`) must use `WikiLayout`, not `BaseLayout`. Without `WikiLayout`, the sidebar and CSS grid won't work properly.

### 2. Status Config Lookups Need Nullish Coalescing

When looking up status configurations (e.g., for builds, meetups), always provide a fallback:

```typescript
const statusConfig = config.statuses.find(s => s.value === status) ?? {
  label: status,
  color: "secondary",
  bgClass: "bg-secondary-100",
};
```

Without the fallback, undefined status values cause runtime errors.

### 3. Tailwind v4 Requires `@tailwindcss/vite` Plugin

Tailwind v4 is NOT configured via `tailwind.config.js`. Instead, add to `astro.config.mjs`:

```javascript
import tailwindcss from "@tailwindcss/vite";

vite: {
  plugins: [tailwindcss()],
}
```

### 4. Plugin Entrypoints Must Match Package Name

When registering plugins in `astro.config.mjs`, the import name must match the package:

```javascript
import { forumPlugin } from "emdash-plugin-forum";
import { wikiPlugin } from "emdash-plugin-wiki";

// NOT:
// import { forumPlugin } from "./emdash-plugin-forum";
```

### 5. CSS Variables Must Be Properly Scoped

Runtime CSS variables (`--bg`, `--surface`, `--border`, `--text`) are set on `.light`/`.dark` classes on `<html>`. Components should use these, not hardcoded Tailwind colors:

```css
/* Correct */
background-color: var(--bg);
color: var(--text);

/* Avoid */
bg-[oklch(...)]
```

### 6. Theme Toggle Script Placement

The theme initialization script must be in `<head>` with `is:inline` to prevent flash of unstyled content:

```astro
<script is:inline>
  (function() {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.add('light');
    }
  })();
</script>
```

### 7. EmDash Database Migrations

When changing schema, use EmDash migrations. Seed file (`seed.json`) defines initial schema — edit and re-seed for schema changes during development.

## Important Files

| File | Purpose |
|------|---------|
| `astro.config.mjs` | Astro + EmDash + plugin configuration |
| `src/live.config.ts` | Live collections (`_emdash`) for real-time content |
| `src/styles/global.css` | Tailwind v4 theme, color palette, animations |
| `src/layouts/BaseLayout.astro` | Root layout with Nav, Footer, theme toggle |
| `src/layouts/WikiLayout.astro` | Wiki-specific two-column layout |
| `src/components/Nav.astro` | Navigation with theme toggle |
| `src/components/ThemeToggle.astro` | Dark/light mode switcher |
| `seed/seed.json` | Database schema + demo content |
| `emdash-plugin-wiki/src/index.ts` | Wiki plugin entrypoint |
| `emdash-plugin-forum/src/index.ts` | Forum plugin entrypoint |

## Guardrails

- **Do not** replace `WikiLayout` with `BaseLayout` on wiki pages — layout system depends on WikiLayout's sidebar grid
- **Do not** use hardcoded color values — use CSS variables (`var(--bg)`, `var(--text)`, etc.)
- **Do not** remove `is:inline` from theme script — it prevents flash
- **Do not** change EmDash plugin import style — must use package names, not relative paths
- **Do not** seed without `--no-content` flag in production — demo content will overwrite

---

*Last updated: 2026-04-17*
