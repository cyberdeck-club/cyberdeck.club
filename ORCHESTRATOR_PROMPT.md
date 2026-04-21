# Orchestrator Prompt: cyberdeck.club Migration Off EmDash

You are orchestrating a significant in-place migration of the `cyberdeck.club` codebase. The full architectural plan lives in `MIGRATION.md` at the repo root — **read it in full before dispatching any subtasks.** It is the source of truth for every decision below.

## TL;DR of what you're doing

Rip EmDash out of cyberdeck.club. Replace it with a native Astro SSR app on Cloudflare Workers, using Better Auth (magic link plugin, Resend for email delivery) for auth, Drizzle ORM against Cloudflare D1 for data, and Markdown for all rich text. Preserve the visual design system exactly. Port existing seed data to the new schema. Work in-place on `main`.

Better Auth is Astro's officially-recommended auth library and has first-class Cloudflare D1 support as of v1.5. Do not substitute Auth.js, NextAuth, `auth-astro`, or any other library — the doc is specific about this for a reason.

## Your operating principles

1. **Read `MIGRATION.md` first, then re-read the relevant section before dispatching each phase's subtasks.** Do not rely on summary. The migration doc is detailed intentionally — follow it. In particular, read the **"Model-specific notes"** section at the top — it contains non-negotiable rules about version pinning, doc-reading, and verification that shape every subtask below.
2. **Work in the 9 phases laid out in the "Sequencing" section of `MIGRATION.md`, in order.** Do not reorder or parallelize across phases. Within a phase, parallelize where safe.
3. **Commit at phase boundaries.** Each phase ends with a single commit whose message is `migration: phase N — <short description>`. Tag the pre-migration commit `pre-migration-baseline` before Phase 2 so rollback is trivial.
4. **Every subtask delegated to a mode gets the migration doc as context.** Point them at `MIGRATION.md` and the specific section relevant to their task. Don't restate the plan — have them read it.
5. **Validate at every phase gate with a real run, not just a typecheck.** Before advancing, confirm the definition of done for that phase (see "Phase gates" below) by actually exercising the behavior — curl the route, submit the form, click the magic link, open the page. TypeScript compiling is necessary but not sufficient. If a gate fails, loop on the current phase rather than moving forward with known breakage.
6. **The site will be broken between Phase 2 and Phase 5.** This is expected and called out in the migration doc. Do not treat a broken build during that window as a regression — treat an unexpected broken build after Phase 5 as a regression.
7. **Never invent schema changes, dependency choices, file layouts, or library APIs beyond what `MIGRATION.md` specifies or what the docs/source confirm.** If something genuinely needs to change, pause, update `MIGRATION.md` first with a rationale, then proceed. If a library's API shape is uncertain, have the subtask read the docs or `node_modules/<pkg>/` source before writing code. Do not generate plausible-looking integration code from training recall — this is the single most common failure mode for this migration.
8. **Preserve the design system exactly.** Any visual diff from pre-migration pages to post-migration pages on shared routes (wiki list, forum list, builds, meetups, home, about) is a bug.
9. **Prefer many small verified subtasks over few large ones.** A good subtask produces ≤ ~200 lines of code and ends with a verification step (run, curl, test, or manual check) whose result is recorded in the subtask's completion report.
10. **Enforce the per-request auth instance pattern at the prompt level.** This is the single biggest failure mode for Better Auth on Workers. Every subtask that touches auth code must use the `getAuth(env)` factory pattern. **If a subtask returns code that defines `const auth = betterAuth({...})` at module scope, reject and re-dispatch.** Module-level auth instances will pass typechecks and even work on a cold-started single request, but fail catastrophically under load or during local development with 30+ second hangs. The same rule applies to the Drizzle client: `getDb(env)` factory only, never a module-level `const db = drizzle(...)`.

## Subtask rejection criteria

When a subtask returns its output, the orchestrator reviews it before accepting. Reject and re-dispatch (with specific feedback about what to fix) if the output:

- Defines a module-level `auth` or `db` constant (must be factories).
- Contains integration code for any library not preceded by a doc-read step in `docs/migration-notes/` for that phase.
- Hand-writes Better Auth's user/session/verification tables instead of using the CLI-generated schema.
- Uses interactive transactions (`db.transaction(...)`) against D1 instead of `db.batch([...])` — D1 does not support interactive transactions.
- Hardcodes table names like `users` or `sessions` in app code (Better Auth CLI generates singular names — `user`, `session` — and app code must reference those).
- Skips the verification step called for in the subtask prompt.
- Produces more than ~300 lines of code (too large; ask for it to be split).

Rejection is not failure — it's the normal pattern. Expect to reject 20–30% of subtask outputs. The cost of re-dispatch is small; the cost of accepting broken code is large.

## Required pre-phase reading

Before starting each of these phases, the orchestrator (or the first subtask it dispatches in that phase) must fetch and read the current official documentation for the listed libraries (use playwright, curl and brave search). Doc reading is not optional — M2.7's training recall of recently-changed integration APIs is not reliable enough to skip this step, and Better Auth is a fast-moving library (D1 support only landed in v1.5 in Feb 2026).

- **Before Phase 1 (auth spike):**
  - Astro's authentication guide (`https://docs.astro.build/en/guides/authentication/`) — confirms Better Auth as the recommended path
  - Better Auth installation docs (`https://better-auth.com/docs/installation`)
  - Better Auth Astro integration (`https://better-auth.com/docs/integrations/astro`)
  - Better Auth magic link plugin docs
  - **"Better Auth + Cloudflare Workers: The Integration Guide Nobody Wrote"** — `https://medium.com/@senioro.valentino/better-auth-cloudflare-workers-the-integration-guide-nobody-wrote-8480331d805f` — documents the WAL-lock and per-request-instance pitfalls. This is mandatory reading — skipping it will cost you a full day of debugging.
- **Before Phase 2:** `@astrojs/cloudflare` integration guide; current Astro Workers deployment docs.
- **Before Phase 3:** `drizzle-orm/d1` usage, `drizzle-kit` config reference, `@better-auth/cli` generate command usage, Cloudflare D1 + Wrangler migrations docs, D1's `batch()` API reference.
- **Before Phase 4:** Better Auth client (`better-auth/client`) usage, `createAuthClient` + `magicLinkClient` plugin setup, Resend Node SDK quickstart.
- **Before Phase 5:** `marked` current API (the render function signature and sanitization options).

The output of each reading step is a short notes file committed to `docs/migration-notes/` — bullet points of the key API shapes, gotchas, and config keys found. Subsequent subtasks in that phase reference this file instead of re-reading.

## Version pinning

Before Phase 2's `npm install`, the orchestrator runs `npm view <pkg> version` for each new dependency and writes the resolved versions to `DEPS.md`. Install exact versions, not ranges, for the initial migration. After the migration is stable, the maintainer can loosen the ranges manually. **Better Auth must be v1.5 or later** — D1 support is a hard requirement.


## Phase gates

Advance only when each gate passes.

**Phase 1 — Auth spike:** a throwaway route successfully sends a magic link via Resend (real email delivered), the callback verifies, a session is set, and the session reads back correctly on a subsequent request — all running on a local Workers dev environment with a local D1 binding. **Additionally:** two concurrent magic-link verifications do not cause a 30+ second hang, proving the per-request auth instance pattern is correct.

**Phase 2 — Dependency swap:** `package.json` matches the target listed in `MIGRATION.md`. `astro.config.mjs` uses `@astrojs/cloudflare`. `wrangler.jsonc` has `nodejs_compat` in `compatibility_flags`. `npm install` succeeds. Build failures are allowed and expected.

**Phase 3 — Schema + migrations:** `src/lib/auth.ts` contains a minimal `getAuth(env)` factory (enough for the CLI to introspect). `npx @better-auth/cli generate` produces `src/db/auth-schema.ts` without errors. `src/db/schema.ts` exists with app-specific tables and imports/re-exports the auth schema. `drizzle-kit generate` produces migration SQL. Migrations apply cleanly to a local D1 instance. `src/db/client.ts` compiles and the `getDb(env)` factory pattern is in place (no module-level singleton).

**Phase 4 — Auth implementation:** a human can load `/login`, submit their email, receive a real magic link via Resend, click it, land authenticated, and see their session reflected in `Astro.locals.user` on a protected test route. The user row includes the `role` additional field with default value `member`. Logout clears the session.

**Phase 5 — Read paths:** seed script has run successfully against local D1. Every route currently in `src/pages/` that reads content renders correctly with Drizzle-sourced data. Visual diff vs. pre-migration is zero on shared routes. Site is fully browsable as a logged-out reader.

**Phase 6 — Write paths:** a logged-in user can create a forum thread, reply to it, edit their own post, create a wiki article, edit it (producing a revision), and create a build or meetup. All API routes enforce authentication and authorization per the Authorization Model section. Multi-statement writes use `db.batch([...])`.

**Phase 7 — Admin/moderator affordances:** a moderator can pin and lock a thread, edit another user's post, and delete another user's post. An admin can promote a member to moderator via a role-gated route.

**Phase 8 — Cleanup:** no EmDash references remain via grep (`rg -i emdash src/ *.ts *.mjs *.json`). `AGENTS.md` and `README.md` are updated. `data.db*` files are removed from the working tree.

**Phase 9 — Deploy:** production site on `cyberdeck.club` serves the migrated app. Magic link login works against the deployed Resend config. Seed data visible. At least one end-to-end smoke test (create thread, create wiki article, view profile) passes in production.

## Delegation guidance

For each phase, break work into subtasks sized to a single mode invocation. Target subtasks at roughly 200 lines of code or less, with a built-in verification step. Good subtask boundaries:

- "Read the current `@astrojs/cloudflare` docs. Write a bullet-point notes file at `docs/migration-notes/astrojs-cloudflare.md` covering the adapter config shape, required compatibility flags, and any gotchas. Do not modify any other files."
- "Write the minimal `src/lib/auth.ts` skeleton with a `getAuth(env)` factory sufficient for `@better-auth/cli generate` to introspect. Run `npx @better-auth/cli generate --output src/db/auth-schema.ts --y`. Confirm the file is produced. Do not run `drizzle-kit` yet — that's a separate subtask."
- "Write app-specific tables in `src/db/schema.ts` (wiki, forum, builds, meetups per the Data Model section of `MIGRATION.md`), importing and re-exporting the generated `auth-schema.ts`. Run `drizzle-kit generate`. Print and confirm the migration SQL includes both auth and app tables. Do not touch other files."
- "Port every page under `src/pages/wiki/` to use Drizzle queries via `src/lib/wiki.ts` helpers. Helpers are already written. After porting, run `astro dev` and curl `/wiki/` — confirm it returns 200 and contains expected headings. Do not change any visual output."
- "Implement `src/pages/api/forum/threads.ts` (POST) per the File-by-file change plan in `MIGRATION.md`. Use `db.batch([...])` for atomicity, not interactive transactions. After implementing, curl the endpoint with a test payload and capture the response in the completion report."

Bad subtask boundaries (avoid):

- "Do Phase 5." (too broad)
- "Build the forum." (spans phases)
- "Migrate the app." (the whole job)
- "Set up auth." (multi-file, needs decomposition into: read docs, write config, write middleware, write routes, write UI, verify end-to-end — each as its own subtask)

Prefer Code mode for implementation work, Architect mode for any mid-migration design decisions that aren't already nailed down in the doc, and Debug mode for anything that breaks unexpectedly.

**When delegating, always include in the subtask prompt:**

- The specific `MIGRATION.md` section to read (by heading name).
- Any relevant `docs/migration-notes/*.md` file produced by an earlier subtask in this phase.
- The required verification step (what to run/curl/check at the end).
- An explicit instruction: "If you are uncertain about any library's API shape, read `node_modules/<pkg>/` or fetch the official docs before writing code. Do not guess."


## When to escalate back to the user

- Better Auth + Workers runtime hits an incompatibility not anticipated in the doc or the Medium article's pitfalls list.
- The Better Auth CLI's generated schema conflicts with app-specific tables in a way that can't be resolved by table renames or reference adjustments.
- D1 schema migration fails in a way that suggests the data model needs revision.
- Seed data cannot be cleanly mapped and the proposed skip-with-warnings approach would lose more than ~10% of entries.
- Visual regression appears on ported pages that cannot be resolved by source-layer changes (suggests a layout or CSS assumption in the migration is wrong).
- Any phase gate fails twice in a row after remediation attempts.
- A subtask produces code that typechecks but fails at runtime with an error indicating the library API was misremembered or invented (e.g., "X is not a function", "unknown option Y"). If this happens twice for the same library, escalate rather than continuing to iterate.
- A library's current documentation contradicts what `MIGRATION.md` says. Do not silently "fix" the discrepancy — pause and ask.
- The 30+ second hang symptom from the Medium article appears despite following the per-request-instance pattern — indicates a different cause that needs investigation, not retry.

In all other cases, proceed.

## Kickoff

Start by:

1. Reading `MIGRATION.md` in full, paying particular attention to the **"Model-specific notes"** section.
2. Creating `docs/migration-notes/` as an empty directory (the doc-reading subtasks will populate it).
3. Confirming with a brief summary back to me: the 9 phases, the target stack, the Model-specific notes rules you'll follow, and your first 2–3 subtask dispatches for Phase 1 (which will include a doc-reading subtask for the libraries relevant to the auth spike).

Then begin.
