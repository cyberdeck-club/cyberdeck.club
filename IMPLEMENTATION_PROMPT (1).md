# Implementation Prompt: Access Control & Role System for cyberdeck.club

> Give this prompt to an LLM with access to the cyberdeck.club codebase.
> It references `AGENTS.md` §5 for the authoritative spec. The LLM should
> read `AGENTS.md` and `src/db/schema.ts` before starting.

---

## Context

You are implementing the access control and role progression system for
cyberdeck.club, a community platform for cyberdeck builders. The application
uses Astro 6 (SSR), Drizzle ORM with Cloudflare D1 (SQLite), Resend for
magic link authentication, and Tailwind CSS v4. Read `AGENTS.md` (especially
§5 "Access Control & Role System") and `DESIGN.md` before writing any code.

## Task

Implement the full role-based access control system as specified in
`AGENTS.md` §5. This includes database schema, authorization middleware,
role promotion logic, build moderation pipeline, wiki revision tracking,
moderator nomination, and the UI gates that enforce permissions.

Work through these phases in order. After each phase, verify it works
before moving to the next.

---

## Phase 1: Database Schema

Update `src/db/schema.ts` to add or modify these tables. Use Drizzle's
SQLite dialect. All timestamps are ISO 8601 TEXT columns. All IDs are
`text('id').primaryKey()` using `crypto.randomUUID()` or nanoid.

### 1a. `users` table — add these columns (keep all existing columns):

```ts
role: integer('role').notNull().default(10),
// 0=visitor, 10=member, 20=maker, 30=trusted_maker, 40=moderator, 50=admin

accepted_build_count: integer('accepted_build_count').notNull().default(0),
first_build_published_at: text('first_build_published_at'),

// Moderator nomination (visible to admins only)
is_mod_nominated: integer('is_mod_nominated', { mode: 'boolean' }).notNull().default(false),
mod_nominated_by: text('mod_nominated_by').references(() => users.id),
mod_nominated_at: text('mod_nominated_at'),

// Banning
banned_at: text('banned_at'),
banned_by: text('banned_by').references(() => users.id),
ban_reason: text('ban_reason'),
```

### 1b. `builds` table — ensure these columns exist:

```ts
id: text('id').primaryKey(),
user_id: text('user_id').notNull().references(() => users.id),
title: text('title').notNull(),
slug: text('slug').notNull().unique(),
description: text('description').notNull(),
content: text('content').notNull(),        // markdown body
status: text('status').notNull().default('pending_auto'),
// Valid statuses: 'pending_auto' | 'rejected_auto' | 'pending_human' | 'published' | 'rejected' | 'removed'
rejection_reason: text('rejection_reason'),
auto_review_result: text('auto_review_result'),  // JSON from LLM review
reviewed_by: text('reviewed_by').references(() => users.id),
reviewed_at: text('reviewed_at'),
published_at: text('published_at'),
created_at: text('created_at').notNull(),
updated_at: text('updated_at').notNull(),
```

### 1c. `wiki_revisions` table (new):

```ts
id: text('id').primaryKey(),
page_id: text('page_id').notNull().references(() => wiki_pages.id),
user_id: text('user_id').notNull().references(() => users.id),
content: text('content').notNull(),        // full page content at this revision
diff_summary: text('diff_summary'),        // human-readable summary of changes
created_at: text('created_at').notNull(),
```

Wiki revisions are **append-only**. NEVER delete revisions.

### 1d. `mod_nominations` table (new — optional, alternative to user columns):

Actually, keep nominations as columns on the `users` table as specified above.
This is simpler and avoids a join for the admin nominations list. If a user
is nominated again after being declined, overwrite the existing nomination
fields.

### 1e. Generate migration

After updating the schema, run:
```bash
pnpm drizzle-kit generate
```

Review the generated migration file to make sure it's correct, but do NOT
hand-edit it. Then apply:
```bash
pnpm drizzle-kit migrate
```

---

## Phase 2: Authorization Middleware

### 2a. Create `src/lib/roles.ts`

```ts
export const ROLES = {
  VISITOR: 0,
  MEMBER: 10,
  MAKER: 20,
  TRUSTED_MAKER: 30,
  MODERATOR: 40,
  ADMIN: 50,
} as const;

export type RoleLevel = typeof ROLES[keyof typeof ROLES];

export type RoleName = keyof typeof ROLES;

export function requireRole(userRole: number, minRole: RoleLevel): boolean {
  return userRole >= minRole;
}

export function getRoleName(level: number): RoleName {
  const entries = Object.entries(ROLES) as [RoleName, number][];
  // Find the highest role name that matches
  const match = entries
    .filter(([, v]) => v <= level)
    .sort(([, a], [, b]) => b - a)[0];
  return match?.[0] ?? 'VISITOR';
}
```

CRITICAL: ALWAYS use `>=` comparison. NEVER `===`. A moderator (40) must
pass a check for MAKER (20).

### 2b. Update `src/lib/auth.ts`

Add or update the `getSession` / `getCurrentUser` function to return the
user's role from the database. The returned user object MUST include the
`role` field. If no session exists, return `null` (visitor).

### 2c. Create a `requireAuth` helper for API routes

```ts
// In src/lib/auth.ts or src/lib/middleware.ts

import { ROLES, type RoleLevel, requireRole } from './roles';

export async function requireAuth(
  request: Request,
  db: D1Database,
  minRole: RoleLevel = ROLES.MEMBER
): Promise<{ user: User } | Response> {
  const user = await getCurrentUser(request, db);

  if (!user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (user.banned_at) {
    return new Response(JSON.stringify({ error: 'Account suspended' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!requireRole(user.role, minRole)) {
    return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return { user };
}
```

### 2d. Usage pattern in API routes

```ts
// src/pages/api/forum/threads.ts (POST — create thread)
import { requireAuth } from '../../../lib/auth';
import { ROLES } from '../../../lib/roles';

export async function POST({ request, locals }) {
  const result = await requireAuth(request, locals.db, ROLES.MAKER);
  if (result instanceof Response) return result;
  const { user } = result;

  // ... create thread logic
}
```

### 2e. Usage pattern in Astro pages (server-side)

```astro
---
// src/pages/forum/new.astro
import { getCurrentUser } from '../../lib/auth';
import { requireRole } from '../../lib/roles';
import { ROLES } from '../../lib/roles';

const user = await getCurrentUser(Astro.request, locals.db);
if (!user || !requireRole(user.role, ROLES.MAKER)) {
  return Astro.redirect('/login?redirect=/forum/new');
}
---
```

---

## Phase 3: Build Moderation Pipeline

### 3a. Build submission endpoint

`POST /api/builds` — requires MEMBER role.

1. Validate input (title, description, content, images).
2. Generate slug from title.
3. Insert build with `status = 'pending_auto'`.
4. Trigger LLM automated review (Phase 3b).
5. Return build ID to the user.
6. Show the user a message: "Your build has been submitted! We'll review
   it and let you know when it's live." (See DESIGN.md §10 for copy tone.)

If the user is already a MAKER or higher, skip the queue: set
`status = 'published'` and `published_at = now()` immediately.

### 3b. LLM automated review

Create `src/lib/moderation.ts`:

```ts
export async function autoReviewBuild(build: Build): Promise<{
  passed: boolean;
  reason?: string;
  rawResult: string;
}> {
  // Call your LLM moderation endpoint
  // Check for: spam, harmful content, off-topic, image safety
  //
  // Return { passed: true } or { passed: false, reason: "..." }
  //
  // Store the raw LLM response in build.auto_review_result for audit
}
```

After auto-review:
- If PASS → update build `status = 'pending_human'`
- If FAIL → update build `status = 'rejected_auto'`, store reason, notify
  user with constructive feedback (NEVER blaming language — see DESIGN.md §10)

### 3c. Human review endpoint

`POST /api/builds/[id]/review` — requires TRUSTED_MAKER or MODERATOR role.

```ts
// Request body: { action: 'approve' | 'reject', reason?: string }

if (action === 'approve') {
  // Update build: status = 'published', published_at = now(),
  //   reviewed_by = reviewer.id, reviewed_at = now()
  // Update build author's accepted_build_count += 1
  // Check for role promotions (see Phase 4)
}

if (action === 'reject') {
  // Require reason (non-empty string)
  // Update build: status = 'rejected', rejection_reason = reason,
  //   reviewed_by = reviewer.id, reviewed_at = now()
  // Notify the user with the reason (constructive, not blaming)
}
```

### 3d. Mod queue page

`/admin/builds` — requires TRUSTED_MAKER or higher.

Display all builds with `status = 'pending_human'`, newest first. Show:
title, author (display name + pronouns), submitted date, LLM review
summary. Approve/reject buttons with reason field for rejections.

Style per DESIGN.md — neobrutalist cards, cream background, coral
approve button, ghost reject button with reason textarea.

---

## Phase 4: Role Promotion Logic

### 4a. Create `src/lib/promotion.ts`

```ts
import { ROLES } from './roles';
import { eq, and } from 'drizzle-orm';

export async function checkAndPromoteUser(
  db: DrizzleD1,
  userId: string
): Promise<{ promoted: boolean; newRole?: number }> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user || user.banned_at) return { promoted: false };

  // Member → Maker: first build published ≥ 7 days ago
  if (user.role === ROLES.MEMBER && user.first_build_published_at) {
    const publishedAt = new Date(user.first_build_published_at);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (publishedAt <= sevenDaysAgo) {
      await db.update(users)
        .set({ role: ROLES.MAKER })
        .where(eq(users.id, userId));
      return { promoted: true, newRole: ROLES.MAKER };
    }
  }

  // Maker → Trusted Maker: 3+ accepted builds
  if (user.role === ROLES.MAKER && user.accepted_build_count >= 3) {
    await db.update(users)
      .set({ role: ROLES.TRUSTED_MAKER })
      .where(eq(users.id, userId));
    return { promoted: true, newRole: ROLES.TRUSTED_MAKER };
  }

  return { promoted: false };
}
```

### 4b. When to call promotion checks

- After a build is approved (in the review endpoint — Phase 3c).
- On user login (in the session creation flow).
- Via Cloudflare Cron Trigger (daily batch check for time-based promotions).

### 4c. Update `accepted_build_count` and `first_build_published_at`

In the build approval flow:

```ts
// After approving a build:
const author = await db.query.users.findFirst({
  where: eq(users.id, build.user_id),
});

const updates: Partial<User> = {
  accepted_build_count: (author.accepted_build_count ?? 0) + 1,
};

// Set first_build_published_at only if not already set
if (!author.first_build_published_at) {
  updates.first_build_published_at = new Date().toISOString();
}

await db.update(users)
  .set(updates)
  .where(eq(users.id, build.user_id));

// Then check for promotion
await checkAndPromoteUser(db, build.user_id);
```

---

## Phase 5: Wiki Revision Tracking

### 5a. Wiki page edit endpoint

`POST /api/wiki/[slug]/edit` — requires MAKER role.

1. Validate input (content, optional diff_summary).
2. Insert new row into `wiki_revisions` with the full updated content.
3. Update the `wiki_pages` table with the new content and `updated_at`.
4. If the editing user has been a MAKER for < 30 days, flag the edit in
   a soft-review queue (add a `needs_review` boolean or a separate
   `wiki_review_queue` table).
5. The edit goes live immediately regardless of review status.

### 5b. Wiki revision history page

`/wiki/[category]/[slug]/history` — visible to all logged-in users.

Display all revisions for a page, newest first. Each row shows:
editor display name (+ pronouns), timestamp, diff summary.

### 5c. Wiki revert endpoint

`POST /api/wiki/[slug]/revert` — requires MODERATOR role.

1. Takes a `revision_id` parameter.
2. Reads the content from that revision.
3. Creates a NEW revision with that content (append-only — the revert
   itself is a revision).
4. Updates the wiki page to the reverted content.
5. Logs the revert action.

---

## Phase 6: Moderator Nomination

### 6a. Nomination endpoint

`POST /api/users/[id]/nominate-mod` — requires TRUSTED_MAKER role.

1. Check that the target user exists and is at least a MAKER.
2. Set `is_mod_nominated = true`, `mod_nominated_by = nominator.id`,
   `mod_nominated_at = now()` on the target user.
3. If already nominated, overwrite with the new nomination.
4. Do NOT notify the nominated user. Only admins see nominations.
5. Return success.

### 6b. Admin nominations view

`/admin/nominations` — requires ADMIN role.

Display all users where `is_mod_nominated = true`. Show: display name,
pronouns, role, accepted build count, join date, who nominated them and when.

Actions: "Appoint as Moderator" (sets `role = 40`, clears nomination fields)
or "Dismiss Nomination" (clears nomination fields, does not change role).

### 6c. Nomination UI

On a user's profile page, if the viewer is a TRUSTED_MAKER or higher and
the profile user is at least a MAKER, show a "Nominate as Moderator" button.
If the user is already nominated, show "Nominated for moderator" (no action).
If the user is already a moderator or admin, don't show anything.

---

## Phase 7: UI Permission Gates

### 7a. Navigation changes based on role

| Element                          | Visible to              |
|----------------------------------|-------------------------|
| Forum "New Thread" button        | MAKER+                  |
| Wiki "Edit Page" button          | MAKER+                  |
| Wiki "Create Page" button        | MAKER+                  |
| Build "Submit a Build" button    | MEMBER+                 |
| Meetup "Create Meetup" button    | TRUSTED_MAKER+          |
| Mod queue link in nav            | TRUSTED_MAKER+          |
| Admin panel link in nav          | ADMIN                   |
| "Nominate as Mod" on profiles    | TRUSTED_MAKER+          |
| Report button on posts/threads   | MEMBER+                 |

### 7b. Meetup creation

`/meetups/new` — requires TRUSTED_MAKER role.

Only trusted makers, moderators, and admins can create and host meetups.
The "Create Meetup" button on `/meetups/` is only rendered for
TRUSTED_MAKER+. Members and makers see meetup listings and can RSVP, but
cannot create them. This ensures meetup hosts have demonstrated commitment
to the community (3+ accepted builds) before organizing events.

The meetup form collects: title, description, date/time, location (virtual
link or physical address), capacity (optional), and tags. The meetup
creator is automatically listed as the host. Meetups go live immediately
(no moderation queue — trusted makers have earned that trust).

### 7c. Forum thread creation

The "New Thread" button on `/forum/` and `/forum/[category]/` pages is
only rendered if `requireRole(user.role, ROLES.MAKER)`. Members see the
forum and can reply, but the new-thread button is not present. Show a
gentle message instead: "Want to start a thread? Share a build first —
after your first build is published, you'll be able to create threads."

### 7d. Build submission

Members see a "Submit a Build" CTA on `/builds/`. The submission form
tells them: "Your build will be reviewed before going live. This usually
takes less than a day." After submission, show: "Your build has been
submitted! We'll let you know when it's live."

Makers and above skip the queue — their builds publish immediately.

### 7e. Forum read access for visitors

Forum thread list and thread content are publicly readable (visitors can
see them). The reply form is only shown to logged-in members. Below the
thread, visitors see: "Want to join the conversation? Create an account
to reply." with a signup CTA.

### 7f. Role badge component

Create a `RoleBadge.astro` component that renders the user's role as a
styled tag chip (using DESIGN.md §7.2 tag chip pattern). Only show for
MAKER and above — members don't get a badge (it would feel like a
scarlet letter for the lowest logged-in tier).

| Role           | Badge Text        | Fill Color        |
|----------------|-------------------|-------------------|
| Maker          | `▸ MAKER`         | `accent-200`      |
| Trusted Maker  | `▸ TRUSTED MAKER` | `accent-300`      |
| Moderator      | `▸ MOD`           | `secondary-200`   |
| Admin          | `▸ ADMIN`         | `primary-200`     |

---

## Phase 8: Cron Job for Time-Based Promotions

### 8a. Cloudflare Scheduled Worker

Create a scheduled handler that runs daily (e.g., `crons = ["0 6 * * *"]`
in `wrangler.jsonc`).

```ts
export default {
  async scheduled(event, env, ctx) {
    // Find all members with first_build_published_at ≥ 7 days ago
    // who are still role = 10 (MEMBER)
    // Promote them to role = 20 (MAKER)

    // Find all makers with accepted_build_count >= 3
    // who are still role = 20 (MAKER)
    // Promote them to role = 30 (TRUSTED_MAKER)
  }
};
```

This is a safety net — promotions also happen in real-time during build
approval and login. The cron catches anyone who fell through the cracks.

---

## Constraints (from AGENTS.md — do not violate)

- NEVER check roles with `===`. ALWAYS use `>=` via `requireRole()`.
- NEVER skip LLM moderation for member-submitted builds.
- NEVER notify users about mod nominations — only admins see them.
- NEVER allow self-service role upgrades. Roles change only through
  auto-promotion logic or admin appointment.
- NEVER delete wiki revisions. Append-only.
- NEVER hard-delete user accounts. Use soft-ban (`banned_at` timestamp).
- NEVER expose `RESEND_API_KEY` to client-side code.
- All copy must follow `DESIGN.md` §10 voice guidelines — warm, plainspoken,
  encouraging, specific, playful. NEVER blaming language in error/rejection
  messages. NEVER jargon without inline definition.
- All UI must follow `DESIGN.md` component recipes — neobrutalist structure,
  femme maximalist palette, semantic tokens only.
