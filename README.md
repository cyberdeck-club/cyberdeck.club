# cyberdeck.club

**Build Your Cyberdeck. Meet Your People.**

A community platform for cyberdeck builders — part wiki, part forum, part build showcase. Built with Astro 6 and EmDash CMS.

## What is a Cyberdeck?

A cyberdeck is a portable, often custom-built computer system designed for personal use. Think of it as a blend between vintage portable computing and modern maker culture. They're functional, expressive, and deeply personal projects that combine electronics, software, and design.

## Tech Stack

- **Framework**: [Astro 6](https://astro.build) — Static site generation with island architecture
- **CMS**: [EmDash CMS](https://emdash.cloud) — Headless CMS with admin UI and content API
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com) — Utility-first CSS
- **Deployment**: [Cloudflare Pages](https://pages.cloudflare.com) — Edge hosting with Workers support

### Plugins

This site uses custom EmDash plugins for specialized content:

- **[emdash-plugin-wiki](emdash-plugin-wiki/)** — Wiki article system with categories
- **[emdash-plugin-forum](emdash-plugin-forum/)** — Forum with threads, posts, and categories

## Prerequisites

- **Node.js**: v22 or higher
- **Package Manager**: pnpm (recommended) or npm

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/cyberdeck-club/cyberdeck.club.git
cd cyberdeck.club
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up EmDash Types

Generate the EmDash type definitions:

```bash
npx emdash types
```

This creates `emdash-env.d.ts` with TypeScript types for your content collections.

### 4. Seed the Database

Populate the database with schema definitions and demo content:

```bash
npx emdash seed seed/seed.json
```

To seed schema only (without demo content):

```bash
npx emdash seed seed/seed.json --no-content
```

### 5. Run Locally

Start the development server:

```bash
pnpm dev
```

The site will be available at `http://localhost:4321`.

## Project Structure

```
cyberdeck.club/
├── seed/
│   └── seed.json          # Database schema and demo content
├── src/
│   ├── components/        # Astro components (Nav, Footer, Cards, etc.)
│   ├── layouts/           # Page layouts (BaseLayout, WikiLayout, etc.)
│   ├── pages/             # Astro pages
│   │   ├── wiki/          # Wiki section pages
│   │   ├── forum/         # Forum section pages
│   │   ├── builds/        # Build showcase pages
│   │   ├── meetups/       # Meetup event pages
│   │   └── about.astro    # About page
│   └── styles/
│       └── global.css     # Tailwind CSS and custom styles
├── emdash-plugin-wiki/    # Wiki plugin source
├── emdash-plugin-forum/   # Forum plugin source
├── astro.config.mjs       # Astro configuration
├── package.json
└── wrangler.jsonc         # Cloudflare Workers configuration
```

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `seed/` | EmDash seed file with schema definitions and demo content |
| `src/pages/` | Astro pages for wiki, forum, builds, meetups, and static pages |
| `src/components/` | Reusable Astro components |
| `src/layouts/` | Page layouts with shared structure |
| `src/styles/` | Global CSS and Tailwind configuration |
| `emdash-plugin-*/` | Custom EmDash plugins for wiki and forum features |

## EmDash Plugins

### Wiki Plugin (`emdash-plugin-wiki/`)

Provides wiki article functionality:

- Article creation and editing via EmDash admin
- Category-based organization
- View count tracking
- Revision history

### Forum Plugin (`emdash-plugin-forum/`)

Provides community forum functionality:

- Thread creation and replies
- Category-based organization
- User post counts
- Moderation tools

## Deployment

### Cloudflare Pages

1. Connect your GitHub repository to [Cloudflare Pages](https://pages.cloudflare.com)
2. Configure the build settings:
   - **Build command**: `pnpm build`
   - **Build output directory**: `dist`
3. Add environment variables if needed
4. Deploy

### Wrangler (Workers)

For custom Workers functions:

```bash
npx wrangler deploy
```

## Content Management

Access the EmDash admin UI at `/emdash` when running locally or on your deployed site. From there you can:

- Create, edit, and publish wiki articles
- Manage forum threads and posts
- Organize meetup events
- Update build showcase entries
- Manage navigation menus

## Contributing

Contributions welcome! Please feel free to submit issues or pull requests.

## License

MIT
