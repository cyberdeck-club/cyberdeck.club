# Orchestrator Prompt: cyberdeck.club Migration Off EmDash

You are orchestrating a significant in-place migration of the `cyberdeck.club` codebase. The full architectural plan lives in `MIGRATION.md` at the repo root — **read it in full before dispatching any subtasks.** It is the source of truth for every decision below.

## TL;DR of what you're doing

Rip EmDash out of cyberdeck.club. Replace it with a native Astro SSR app on Cloudflare Workers, using Auth.js (magic link via Resend) for auth, Drizzle ORM against Cloudflare D1 for data, and Markdown for all rich text. Preserve the visual design system exactly. Port existing seed data to the new schema. Work in-place on `main`.

## Your operating principles

1. **Read `MIGRATION.md` first, then re-read the relevant section before dispatching each phase's subtasks.** Do not rely on summary. The migration doc is detailed intentionally — follow it.
2. **Work in the 9 phases laid out in the "Sequencing" section of `MIGRATION.md`, in order.** Do not reorder or parallelize across phases. Within a phase, parallelize where safe.
3. **Commit at phase boundaries.** Each phase ends with a single commit whose message is `migration: phase N — <short description>`. Tag the pre-migration commit `pre-migration-baseline` before Phase 2 so rollback is trivial.
4. **Every subtask delegated to a mode gets the migration doc as context.** Point them at `MIGRATION.md` and the specific section relevant to their task. Don't restate the plan — have them read it.
5. **Validate at every phase gate.** Before advancing, confirm the definition of done for that phase (see "Phase gates" below). If a gate fails, loop on the current phase rather than moving forward with known breakage.
6. **The site will be broken between Phase 2 and Phase 5.** This is expected and called out in the migration doc. Do not treat a broken build during that window as a regression — treat an unexpected broken build after Phase 5 as a regression.
7. **Never invent schema changes, dependency choices, or file layouts beyond what `MIGRATION.md` specifies.** If something genuinely needs to change, pause, update `MIGRATION.md` first with a rationale, then proceed.
8. **Preserve the design system exactly.** Any visual diff from pre-migration pages to post-migration pages on shared routes (wiki list, forum list, builds, meetups, home, about) is a bug.

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

For each phase, break work into subtasks sized to a single mode invocation. Good subtask boundaries:

- "Write `src/db/schema.ts` per the Data Model section of `MIGRATION.md`. Generate the initial migration. Do not touch other files."
- "Port every page under `src/pages/wiki/` to use Drizzle queries via `src/lib/wiki.ts` helpers. Helpers are already written. Do not change any visual output."
- "Implement `src/pages/api/forum/threads.ts` (POST) per the File-by-file change plan in `MIGRATION.md`. Include input validation, session check, and transaction handling."

Bad subtask boundaries (avoid):

- "Do Phase 5." (too broad)
- "Build the forum." (spans phases)
- "Migrate the app." (the whole job)

Prefer Code mode for implementation work, Architect mode for any mid-migration design decisions that aren't already nailed down in the doc, and Debug mode for anything that breaks unexpectedly.

## When to escalate back to the user

- Auth.js + `auth-astro` + Workers runtime hits an incompatibility not anticipated in the doc.
- D1 schema migration fails in a way that suggests the data model needs revision.
- Seed data cannot be cleanly mapped and the proposed skip-with-warnings approach would lose more than ~10% of entries.
- Visual regression appears on ported pages that cannot be resolved by source-layer changes (suggests a layout or CSS assumption in the migration is wrong).
- Any phase gate fails twice in a row after remediation attempts.

In all other cases, proceed.

## Kickoff

Start by reading `MIGRATION.md` in full. Then confirm with a brief summary back to me: the 9 phases, the target stack, and your first 2–3 subtask dispatches for Phase 1. Then begin.
