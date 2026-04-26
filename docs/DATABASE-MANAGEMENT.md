# Database Management Guide

This document covers D1 database operations for the cyberdeck.club project.

## Prerequisites

- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed
- Logged into Cloudflare: `npx wrangler login`
- Two D1 databases provisioned in the Cloudflare dashboard:
  - `cyberdeck-db-beta` — beta environment database
  - `cyberdeck-db` — production environment database
- Database IDs added to [`wrangler.jsonc`](wrangler.jsonc) under the respective `env` blocks

### Finding Your Database IDs

**Option A — Create a new database via CLI:**

```bash
wrangler d1 create cyberdeck-db-beta
wrangler d1 create cyberdeck-db
```

The output includes the `database_id` (a UUID). Copy it into the corresponding `env` block in [`wrangler.jsonc`](wrangler.jsonc).

**Option B — Use an existing database from the dashboard:**

1. Go to [Cloudflare Dashboard → Workers & Pages → cyberdeck.club → Settings → D1 Databases](https://dash.cloudflare.com)
2. Click on a database name — the UUID in the URL bar is the `database_id`
3. Paste it into the `database_id` field for the appropriate `env` block

## D1 Environments

The project uses three D1 database targets, configured in [`wrangler.jsonc`](wrangler.jsonc):

| Environment | Wrangler env | D1 database name | CLI target |
|------------|--------------|------------------|------------|
| Local dev | (default) | `cyberdeck-db` | `--local` |
| Beta (auto-deploy) | `beta` | `cyberdeck-db-beta` | `--env beta --remote` |
| Production (manual) | `prod` | `cyberdeck-db` |  --remote` |

## Environment Variables

Non-secret vars (like `PUBLIC_BASE_URL`) are set per-environment in [`wrangler.jsonc`](wrangler.jsonc):

- **Default (local):** `PUBLIC_BASE_URL: http://localhost:8787`
- **Beta:** `PUBLIC_BASE_URL: https://beta.cyberdeck.club`
- **Prod:** `PUBLIC_BASE_URL: https://cyberdeck.club`

**Secrets** (like `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `ADMIN_EMAIL`) must be set via the Cloudflare dashboard or `wrangler secret put`:

```bash
# Set a secret for a specific environment
wrangler secret put BETTER_AUTH_SECRET --env beta
wrangler secret put BETTER_AUTH_SECRET
```

Or via the dashboard: **Workers & Pages → cyberdeck.club → Settings → Variables & Secrets**.

---

## 1. Seed a Database

Populate a database with sample data from [`seed/`](seed/) JSON files.

### Seed local database

```bash
npm run db:seed
```

### Seed beta database

1. In [`scripts/seed.ts`](scripts/seed.ts:172), change `--local` to `--env beta --remote`:

   ```ts
   const cmd = `npx wrangler d1 execute cyberdeck-db-beta --remote --command ${JSON.stringify(sql)}`;
   ```

2. Run:

   ```bash
   npx tsx scripts/seed.ts
   ```

3. Revert the change after seeding.

### Seed production database

> **Warning:** Do not seed production with test data. Use only for initial provisioning of a fresh database.

1. In [`scripts/seed.ts`](scripts/seed.ts:172), change to:

   ```ts
   const cmd = `npx wrangler d1 execute cyberdeck-db --remote --command ${JSON.stringify(sql)}`;
   ```

2. Run:

   ```bash
   npx tsx scripts/seed.ts
   ```

3. Revert the change immediately after.

---

## 2. Transfer Data Between Databases

Copy data from one D1 database to another (e.g., beta → production).

### Export a database to SQL

```bash
wrangler d1 export cyberdeck-db-beta --remote --output ./dumps/beta-db.sql
```

To export a specific table only:

```bash
wrangler d1 export cyberdeck-db-beta --remote --table wiki_articles --output ./dumps/wiki_articles.sql
```

### Import into another database

```bash
wrangler d1 import cyberdeck-db --remote ./dumps/beta-db.sql --force
```

| Flag | Effect |
|------|--------|
| `--force` | Drops existing tables before recreating. Use when overwriting. |
| (no flag) | Append-only import. May fail on conflicts. |

### Example: Promote beta to production

```bash
# 1. Export beta DB
wrangler d1 export cyberdeck-db-beta --remote --output ./dumps/beta.sql

# 2. Import into production (--force clears prod first)
wrangler d1 import cyberdeck-db --remote ./dumps/beta.sql --force
```

---

## 3. Reset a Database

Clear all data and re-apply schema + seed data.

### Reset the local database

```bash
npm run db:reset
```

This runs three steps in sequence:

1. `rm -rf .wrangler/state/v3/d1` — deletes local D1 sqlite files
2. `npm run db:migrate` — runs `wrangler d1 migrations apply cyberdeck-db --local`
3. `npm run db:seed` — repopulates from [`seed/`](seed/) JSON files

### Reset the beta database

> **Warning:** This permanently deletes all data in the beta database.

```bash
# Apply migrations to a fresh state
wrangler d1 migrations apply cyberdeck-db-beta --remote

# Then seed (after editing scripts/seed.ts — see Section 1)
npx tsx scripts/seed.ts
```

### Reset the production database

> **Warning:** This permanently deletes all data in the production database. Do not do this unless you are okay with losing all production data.

D1 does not have a built-in "reset" command. The cleanest approach:

1. Go to [Cloudflare Dashboard → Workers & Pages → cyberdeck.club → Settings → D1 Databases](https://dash.cloudflare.com)
2. Delete the `cyberdeck-db` database
3. Create a new D1 database named `cyberdeck-db`
4. Update the `database_id` for the `prod` env in [`wrangler.jsonc`](wrangler.jsonc:28) with the new ID
5. Apply migrations:

   ```bash
   wrangler d1 migrations apply cyberdeck-db --remote
   ```

---

## Quick Reference

| Task | Command |
|------|---------|
| Run migrations (local) | `npm run db:migrate` |
| Run migrations (beta) | `npm run db:migrate:beta` |
| Run migrations (prod) | `npm run db:migrate:prod` |
| Execute SQL (local) | `wrangler d1 execute cyberdeck-db --local --command "SELECT 1"` |
| Execute SQL (beta) | `wrangler d1 execute cyberdeck-db-beta --remote --command "SELECT 1"` |
| Execute SQL (prod) | `wrangler d1 execute cyberdeck-db --remote --command "SELECT 1"` |
| Export DB | `wrangler d1 export cyberdeck-db-beta --remote --output ./dump.sql` |
| Import SQL dump | `wrangler d1 import cyberdeck-db --remote ./dump.sql --force` |
| Seed local | `npm run db:seed` |
| Reset local | `npm run db:reset` |
| Open Drizzle Studio | `npm run db:studio` |

## Provisioning New D1 Databases

If you need to create new D1 databases for beta or production:

```bash
# Create beta database
wrangler d1 create cyberdeck-db-beta

# Create production database
wrangler d1 create cyberdeck-db
```

After creation, copy the `database_id` from the output and paste it into the corresponding `env.beta.d1_databases[0].database_id` or `env.prod.d1_databases[0].database_id` field in [`wrangler.jsonc`](wrangler.jsonc).
