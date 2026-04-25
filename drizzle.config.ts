import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
  // dbCredentials path is used only by drizzle-kit studio.
  // The actual D1 data lives in .wrangler/state/v3/d1/ managed by Miniflare.
  // For studio, point at the local Miniflare sqlite file (find via: ls .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite)
  dbCredentials: {
    url: ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/fce9aa281b939974a3fd98caac76b986a83b3a36f3aa6f79337c5681820d94c1.sqlite",
  },
});
