# cyberdeck.club

**Build Your Cyberdeck. Meet Your People.**

A community platform for cyberdeck builders — part wiki, part forum, part build showcase. Built with Astro 6 (SSR), Better Auth, Drizzle ORM, and Cloudflare Workers.

## What is a Cyberdeck?

A cyberdeck is a portable, often custom-built computer system designed for personal use. Think of it as a blend between vintage portable computing and modern maker culture. They're functional, expressive, and deeply personal projects that combine electronics, software, and design.

## Tech Stack

- **Framework**: [Astro 6](https://astro.build) — SSR with island architecture
- **Auth**: [Better Auth](https://better-auth.com) — Magic link authentication with Resend
- **ORM**: [Drizzle ORM](https://orm.drizzle.team) — Type-safe database queries
- **Database**: Cloudflare D1 (SQLite at the edge)
- **Deployment**: [Cloudflare Workers](https://workers.cloudflare.com) — Edge hosting

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

### 3. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
- `AUTH_SECRET` — Secret for session encryption
- `RESEND_API_KEY` — API key for email delivery (magic link passwords)

### 4. Run Database Migrations

```bash
pnpm db:migrate
```

### 5. Seed the Database (optional)

```bash
pnpm db:seed
```

### 6. Run Locally

```bash
pnpm dev
```

The site will be available at `http://localhost:4321`.

## Project Structure

```
cyberdeck.club/
├── drizzle/
│   └── migrations/        # Database schema migrations
├── scripts/
│   └── seed.ts           # Database seeding script
├── src/
│   ├── components/        # Astro components (Nav, Footer, Cards, etc.)
│   │   └── wiki/         # Wiki React components (islands)
│   ├── db/               # Drizzle schema and client
│   ├── layouts/          # Page layouts (BaseLayout, WikiLayout, etc.)
│   ├── lib/              # Auth, Resend, and data access utilities
│   ├── pages/            # Astro pages
│   │   ├── api/          # API routes (auth, wiki, forum, builds, meetups)
│   │   ├── wiki/         # Wiki section pages
│   │   ├── forum/        # Forum section pages
│   │   ├── builds/       # Build showcase pages
│   │   ├── meetups/      # Meetup event pages
│   │   └── about.astro   # About page
│   └── styles/
│       └── global.css    # Tailwind CSS and custom styles
├── astro.config.mjs      # Astro configuration
├── better-auth.config.ts # Better Auth configuration
├── drizzle.config.ts     # Drizzle ORM configuration
├── package.json
└── wrangler.jsonc        # Cloudflare Workers configuration
```

## Development

### Authentication Flow

1. User clicks login → enters email
2. Magic link sent via Resend
3. User clicks link → session established
4. Session stored in encrypted cookie

### Database Schema

- `users` — User accounts with email, role (admin/moderator/user)
- `sessions` — Better Auth session storage
- `verification_tokens` — Better Auth verification tokens
- `forum_categories` — Forum categories
- `forum_threads` — Forum threads
- `forum_posts` — Forum posts
- `wiki_articles` — Wiki articles with markdown content
- `builds` — Cyberdeck build showcases
- `meetups` — Meetup events

### API Routes

- `POST /api/auth/*` — Better Auth endpoints
- `GET/POST /api/wiki/articles` — Wiki CRUD
- `GET/POST /api/forum/threads` — Forum threads
- `POST /api/forum/posts` — Forum posts
- `GET/POST /api/builds` — Build showcase
- `GET/POST /api/meetups` — Meetup events

## Deployment

Deploy to Cloudflare Workers:

```bash
pnpm deploy
```

See [MIGRATION.md](./MIGRATION.md) for the full migration history from EmDash to native Astro SSR.
