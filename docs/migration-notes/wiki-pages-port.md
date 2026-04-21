# Wiki Pages Port to Drizzle + Markdown Rendering

## Status: Completed (Code Ported)

The wiki pages have been ported from EmDash to Drizzle + Markdown rendering. However, full verification is blocked by remaining EmDash imports in other files.

## Files Modified

### 1. `src/pages/wiki/index.astro`
- Replaced EmDash `getEntry` with Drizzle `getWikiCategories(db)`
- Added `export const prerender = false;`
- Uses `Astro.locals.db!` for database access
- Returns categories in expected format with slug, name, description, articleCount, badge, accent

### 2. `src/pages/wiki/[category]/index.astro`
- Uses `getWikiCategories(db)` to validate category exists
- Uses `getWikiArticles(db, category)` to fetch articles for category
- Redirects to `/wiki` if category not found
- Added `export const prerender = false;`

### 3. `src/pages/wiki/[category]/[slug].astro`
- Uses `getWikiArticle(db, category, slug)` to fetch article
- Uses `marked.parse()` for Markdown rendering (line 121)
- Uses `incrementWikiViewCount(db, article.id)` to track views
- Returns 404 UI when article not found
- Added `export const prerender = false;`

## Key Implementation Details

### Markdown Rendering
```typescript
import { marked } from "marked";
// ...
contentHtml = await marked.parse(article.content ?? "");
```

### Database Access Pattern
```typescript
const db = Astro.locals.db!;
const articleResult = await getWikiArticle(db, category, slug);
```

### 404 Handling
```typescript
const notFound = !articleResult || articleResult.length === 0;
// ...
{notFound ? (
  <WikiLayout title="Article Not Found" currentCategory={category}>
    <div class="not-found">...</div>
  </WikiLayout>
) : (
  <WikiLayout title={article.title} ...>
    <article class="wiki-article">...</article>
  </WikiLayout>
)}
```

## Verification Status

### Blocked
The build fails due to remaining EmDash imports in:
- `src/pages/index.astro` - imports `emdash`
- `src/pages/api/auth/signup/complete.ts` - imports `@emdash-cms/auth/adapters/kysely`

These files need to be ported in Phase 6 (Write paths).

### Local D1 Database Setup
Created local D1 database `cyberdeck-db-local` and applied migrations:
```bash
npx wrangler d1 execute cyberdeck-db-local --local --file=./drizzle/migrations/0000_aromatic_grim_reaper.sql
```

Updated `wrangler.jsonc` to use local database binding `DB` pointing to `cyberdeck-db-local`.

## Next Steps
1. Phase 6: Port remaining files that have EmDash imports
2. Then verify wiki pages work with `wrangler dev`
