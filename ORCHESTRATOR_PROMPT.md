# Orchestrator Prompt: cyberdeck.club Migration Off EmDash

You are orchestrating a significant in-place migration of the `cyberdeck.club` codebase. The full architectural plan lives in `MIGRATION.md` at the repo root — **read it in full before dispatching any subtasks.** It is the source of truth for every decision below.

## TL;DR of what you're doing

Rip EmDash out of cyberdeck.club. Replace it with a native Astro SSR app on Cloudflare Workers, using Auth.js (magic link via Resend) for auth, Drizzle ORM against Cloudflare D1 for data, and Markdown for all rich text. Preserve the visual design system exactly. Port existing seed data to the new schema. Work in-place on `main`.

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

## Required pre-phase reading

Before starting each of these phases, the orchestrator (or the first subtask it dispatches in that phase) must fetch and read the current official documentation for the listed libraries. Doc reading is not optional — M2.7's training recall of recently-changed integration APIs is not reliable enough to skip this step.

- **Before Phase 2:** `@astrojs/cloudflare` integration guide; the current Astro Workers deployment docs.
- **Before Phase 3:** `drizzle-orm/d1` usage, `drizzle-kit` config reference, Cloudflare D1 + Wrangler migrations docs.
- **Before Phase 4:** `auth-astro` README and integration guide, `@auth/core` Email provider reference, `@auth/drizzle-adapter` schema and setup reference, Resend Node SDK quickstart.
- **Before Phase 5:** `marked` current API (the render function signature and sanitization options).

The output of each reading step is a short notes file committed to `docs/migration-notes/` — bullet points of the key API shapes, gotchas, and config keys found. Subsequent subtasks in that phase reference this file instead of re-reading.

## Version pinning

Before Phase 2's `npm install`, the orchestrator runs `npm view <pkg> version` for each new dependency and writes the resolved versions to `DEPS.md`. Install exact versions, not ranges, for the initial migration. After the migration is stable, the maintainer can loosen the ranges manually.


## Phase gates

Advance only when each gate passes.

**Phase 1 — Auth spike:** a throwaway route successfully sends a magic link via Resend, completes the callback, and reads the session back on a subsequent request, all running on a local Workers dev environment with a local D1 binding.

**Phase 2 — Dependency swap:** `package.json` matches the target listed in `MIGRATION.md`. `astro.config.mjs` uses `@astrojs/cloudflare`. `npm install` succeeds. Build failures are allowed and expected.

**Phase 3 — Schema + migrations:** `src/db/schema.ts` exists and matches the Data Model section. `drizzle-kit generate` produces migration SQL. Migrations apply cleanly to a local D1 instance. `src/db/client.ts` compiles.

**Phase 4 — Auth implementation:** a human can load `/login`, submit their email, receive a real magic link, click it, land authenticated, and see their session reflected in `Astro.locals.user` on a protected test route.

**Phase 5 — Read paths:** seed script has run successfully against local D1. Every route currently in `src/pages/` that reads content renders correctly with Drizzle-sourced data. Visual diff vs. pre-migration is zero on shared routes. Site is fully browsable as a logged-out reader.

**Phase 6 — Write paths:** a logged-in user can create a forum thread, reply to it, edit their own post, create a wiki article, edit it (producing a revision), and create a build or meetup. All API routes enforce authentication and authorization per the Authorization Model section.

**Phase 7 — Admin/moderator affordances:** a moderator can pin and lock a thread, edit another user's post, and delete another user's post. An admin can promote a member to moderator.

**Phase 8 — Cleanup:** no EmDash references remain via grep (`rg -i emdash src/ *.ts *.mjs *.json`). `AGENTS.md` and `README.md` are updated. `data.db*` files are removed from the working tree.

**Phase 9 — Deploy:** production site on `cyberdeck.club` serves the migrated app. Magic link login works against the deployed Resend config. Seed data visible. At least one end-to-end smoke test (create thread, create wiki article, view profile) passes in production.

## Delegation guidance

For each phase, break work into subtasks sized to a single mode invocation. Target subtasks at roughly 200 lines of code or less, with a built-in verification step. Good subtask boundaries:

- "Read the current `@astrojs/cloudflare` docs. Write a bullet-point notes file at `docs/migration-notes/astrojs-cloudflare.md` covering the adapter config shape, required compatibility flags, and any gotchas. Do not modify any other files."
- "Write `src/db/schema.ts` per the Data Model section of `MIGRATION.md`. Run `drizzle-kit generate`. Confirm the generated SQL matches expected table shapes by printing it. Do not touch other files."
- "Port every page under `src/pages/wiki/` to use Drizzle queries via `src/lib/wiki.ts` helpers. Helpers are already written. After porting, run `astro dev` and curl `/wiki/` — confirm it returns 200 and contains expected headings. Do not change any visual output."
- "Implement `src/pages/api/forum/threads.ts` (POST) per the File-by-file change plan in `MIGRATION.md`. After implementing, curl the endpoint with a test payload and capture the response in the completion report."

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

- Auth.js + `auth-astro` + Workers runtime hits an incompatibility not anticipated in the doc.
- D1 schema migration fails in a way that suggests the data model needs revision.
- Seed data cannot be cleanly mapped and the proposed skip-with-warnings approach would lose more than ~10% of entries.
- Visual regression appears on ported pages that cannot be resolved by source-layer changes (suggests a layout or CSS assumption in the migration is wrong).
- Any phase gate fails twice in a row after remediation attempts.
- A subtask produces code that typechecks but fails at runtime with an error indicating the library API was misremembered or invented (e.g., "X is not a function", "unknown option Y"). If this happens twice for the same library, escalate rather than continuing to iterate.
- A library's current documentation contradicts what `MIGRATION.md` says. Do not silently "fix" the discrepancy — pause and ask.

In all other cases, proceed.

## Kickoff

Start by:

1. Reading `MIGRATION.md` in full, paying particular attention to the **"Model-specific notes"** section.
2. Creating `docs/migration-notes/` as an empty directory (the doc-reading subtasks will populate it).
3. Confirming with a brief summary back to me: the 9 phases, the target stack, the Model-specific notes rules you'll follow, and your first 2–3 subtask dispatches for Phase 1 (which will include a doc-reading subtask for the libraries relevant to the auth spike).

Then begin.
