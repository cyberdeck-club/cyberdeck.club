/**
 * cyberdeck.club seed script
 *
 * Populates the local D1 database with seed data from seed/*.json files.
 * Run with: npx tsx scripts/seed.ts
 *
 * Uses wrangler d1 execute for bulk inserts (D1 interactive transactions not supported).
 * All timestamps are Unix epoch integers (milliseconds) for app tables.
 * Auth tables (user, session, account, verification) use timestamp_ms mode.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

// ── Types ────────────────────────────────────────────────────────────────────────

interface SeedManifest {
  version: string;
  meta: { name: string; description: string; author: string };
  files: {
    users: string;
    taxonomies: string;
    wiki_articles: string;
    forum_threads: string;
    forum_posts: string;
    builds: string;
    meetups: string;
    community_guidelines_acceptances: string;
    build_comments: string;
    wiki_comments: string;
  };
}

interface SeedUser {
  id: string;
  slug: string;
  displayName: string;
  role: string;
  bio?: string;
  acceptedBuildCount?: number;
  firstBuildPublishedAt?: string | null;
  isModNominated?: boolean;
  modNominatedBy?: string | null;
  modNominatedAt?: string | null;
  bannedAt?: string | null;
  bannedBy?: string | null;
  banReason?: string | null;
}

interface TaxonomyTerm {
  slug: string;
  label: string;
  description?: string;
}

interface Taxonomy {
  name: string;
  label: string;
  terms: TaxonomyTerm[];
}

interface PortableTextBlock {
  _type: "block";
  style?: string;
  children: Array<{ _type: "span"; text: string }>;
}

interface WikiArticle {
  id: string;
  slug: string;
  status: string;
  data: {
    title: string;
    category: string;
    excerpt?: string;
    author: string;
    view_count: number;
    content: PortableTextBlock[];
  };
}

interface ForumThread {
  id: string;
  slug: string;
  status: string;
  data: {
    title: string;
    category: string;
    author: string;
    reply_count: number;
    view_count: number;
    is_pinned: boolean;
    is_locked: boolean;
    content: PortableTextBlock[];
  };
}

interface ForumPost {
  id: string;
  data: {
    thread_id: string;
    author: string;
    is_deleted: boolean;
    content: PortableTextBlock[];
  };
}

interface MeetupEvent {
  id: string;
  slug: string;
  status: string;
  data: {
    title: string;
    description: PortableTextBlock[];
    location_name: string;
    location_lat: number;
    location_lng: number;
    date_start: string;
    date_end: string;
    organizer: string;
    max_attendees: number;
    rsvp_count: number;
    region: string;
  };
}

interface Build {
  id: string;
  slug: string;
  status: string;
  data: {
    title: string;
    description: string;
    featured_image?: string | null;
    gallery?: string | null;
    parts_list?: string | null;
    compute_platform?: string;
    estimated_cost?: number;
    difficulty?: string;
    build_time?: string;
    builder: string;
    tags?: string;
    reviewedBy?: string | null;
    reviewedAt?: string | null;
    publishedAt?: string | null;
  };
  rejectionReason?: string | null;
  autoReviewResult?: string | null;
}

interface CommunityGuidelinesAcceptance {
  id: string;
  userId: string;
  version: string;
  acceptedAt: string;
  ipAddress?: string;
}

interface BuildComment {
  id: string;
  buildId: string;
  authorId: string;
  content: string;
  parentId: string | null;
  createdAt: string;
}

interface WikiComment {
  id: string;
  articleId: string;
  authorId: string;
  content: string;
  parentId: string | null;
  createdAt: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

function uid(): string {
  return crypto.randomUUID();
}

function portableTextToString(blocks: PortableTextBlock[]): string {
  return blocks
    .filter((b) => b._type === "block")
    .map((b) =>
      b.children
        .filter((c) => c._type === "span")
        .map((c) => c.text)
        .join("")
    )
    .join("\n\n");
}

function parseIsoToEpoch(iso: string): number {
  return new Date(iso).getTime();
}

function sqlStr(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") return String(val);
  if (typeof val === "boolean") return val ? "1" : "0";
  return `'${String(val).replace(/'/g, "''")}'`;
}

// ── Wrangler exec ─────────────────────────────────────────────────────────────

const DB_NAME = "DB";
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const envFlag = process.argv[2]; // e.g. "beta" to run against cyberdeck-db-beta, "prod" for cyberdeck-db
if (envFlag && !["beta", "prod"].includes(envFlag)) {
  console.error(`Invalid environment flag: ${envFlag}. Use "beta" or "prod".`);
  process.exit(1);
}

function execSql(sql: string): void {
  const localCmd = `npx wrangler d1 execute ${DB_NAME} --local --command ${JSON.stringify(sql)}`;
  const betaCmd = `npx wrangler d1 execute cyberdeck-db-beta --env beta --remote --command ${JSON.stringify(sql)}`
  const prodCmd = `npx wrangler d1 execute cyberdeck-db --remote --command ${JSON.stringify(sql)}`;

  const cmd = envFlag === "beta" ? betaCmd : envFlag === "prod" ? prodCmd : localCmd;
  try {
    execSync(cmd, {
      cwd: PROJECT_ROOT,
      stdio: "pipe",
    });
  } catch (error) {
    const err = error as Error & { stderr?: Buffer };
    throw new Error(`Failed to execute SQL: ${sql.slice(0, 100)}...\n${err.stderr?.toString() ?? err.message}`);
  }
}

function execSqlBatch(sqls: string[]): void {
  for (const sql of sqls) {
    execSql(sql);
  }
}

// ── Load seed files ───────────────────────────────────────────────────────────

const SEED_DIR = resolve(PROJECT_ROOT, "seed");

function loadSeedFile<T>(filename: string): T {
  const filePath = resolve(SEED_DIR, filename);
  const raw = readFileSync(filePath, "utf8");
  return JSON.parse(raw) as T;
}

// Load manifest
const manifest = loadSeedFile<SeedManifest>("seed.json");

// Load individual seed files
const users = loadSeedFile<SeedUser[]>(manifest.files.users);
const taxonomies = loadSeedFile<Taxonomy[]>(manifest.files.taxonomies);
const wikiArticles = loadSeedFile<WikiArticle[]>(manifest.files.wiki_articles);
const forumThreads = loadSeedFile<ForumThread[]>(manifest.files.forum_threads);
const forumPosts = loadSeedFile<ForumPost[]>(manifest.files.forum_posts);
const builds = loadSeedFile<Build[]>(manifest.files.builds);
const meetupEvents = loadSeedFile<MeetupEvent[]>(manifest.files.meetups);
const communityGuidelinesAcceptances = loadSeedFile<CommunityGuidelinesAcceptance[]>(manifest.files.community_guidelines_acceptances);
const buildComments = loadSeedFile<BuildComment[]>(manifest.files.build_comments);
const wikiComments = loadSeedFile<WikiComment[]>(manifest.files.wiki_comments);

// Build user slug → userId map
const userSlugToId = new Map<string, string>();
for (const u of users) {
  userSlugToId.set(u.slug, uid());
}

// Track IDs for cross-table references
const wikiCategoryIds = new Map<string, string>();
const forumCategoryIds = new Map<string, string>();
const threadIds = new Map<string, string>();
const buildIds = new Map<string, string>();
const wikiArticleIds = new Map<string, string>();

// ── Seed functions ─────────────────────────────────────────────────────────────

function seedAuth(): void {
  console.log("Seeding auth tables...");

  const now = new Date();
  const nowEpoch = now.getTime();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  const sqls: string[] = [];

  // Create users (two-pass to handle self-referential FKs)
  // Pass 1: Insert all users with FK fields set to NULL initially
  for (const u of users) {
    const userId = userSlugToId.get(u.slug)!;
    sqls.push(
      `INSERT OR REPLACE INTO "user" (id, name, email, email_verified, role, bio, accepted_build_count, first_build_published_at, is_mod_nominated, mod_nominated_by, mod_nominated_at, banned_at, banned_by, ban_reason, created_at, updated_at) VALUES (` +
      `${sqlStr(userId)}, ${sqlStr(u.displayName)}, ${sqlStr(`${u.slug}@aster.hn`)}, 1, ${sqlStr(u.role)}, ${sqlStr(u.bio ?? null)}, ${sqlStr(u.acceptedBuildCount ?? 0)}, ${sqlStr(u.firstBuildPublishedAt ?? null)}, ${u.isModNominated ? 1 : 0}, NULL, ${sqlStr(u.modNominatedAt ?? null)}, ${sqlStr(u.bannedAt ?? null)}, NULL, ${sqlStr(u.banReason ?? null)}, ${nowEpoch}, ${nowEpoch})`
    );

    // Create session for admin user (test user)
    if (u.slug === "divine_circuitry") {
      const sessionId = uid();
      const token = `test-session-${uid()}`;
      const expiresAt = now.getTime() + thirtyDaysMs;
      sqls.push(
        `INSERT OR REPLACE INTO "session" (id, expires_at, token, user_id, created_at, updated_at) VALUES (` +
        `${sqlStr(sessionId)}, ${expiresAt}, ${sqlStr(token)}, ${sqlStr(userId)}, ${nowEpoch}, ${nowEpoch})`
      );
    }
  }

  execSqlBatch(sqls);

  // Pass 2: Update users with self-referential FK fields
  const fkUpdates: string[] = [];
  for (const u of users) {
    const userId = userSlugToId.get(u.slug)!;

    // Handle modNominatedBy - resolve from slug ID to actual userId
    if (u.modNominatedBy !== null) {
      const nominatorId = userSlugToId.get(
        users.find((x) => x.id === u.modNominatedBy)?.slug ?? ""
      ) ?? u.modNominatedBy;
      fkUpdates.push(
        `UPDATE "user" SET mod_nominated_by = ${sqlStr(nominatorId)} WHERE id = ${sqlStr(userId)}`
      );
    }

    // Handle bannedBy - resolve from slug ID to actual userId
    if (u.bannedBy !== null) {
      const bannerId = userSlugToId.get(
        users.find((x) => x.id === u.bannedBy)?.slug ?? ""
      ) ?? u.bannedBy;
      fkUpdates.push(
        `UPDATE "user" SET banned_by = ${sqlStr(bannerId)} WHERE id = ${sqlStr(userId)}`
      );
    }
  }

  if (fkUpdates.length > 0) {
    execSqlBatch(fkUpdates);
  }

  console.log(`  Created ${users.length} users`);
}

function seedWikiCategories(): void {
  console.log("Seeding wiki categories...");

  const wikiTax = taxonomies.find((t) => t.name === "wiki-category");
  if (!wikiTax) return;

  const now = Date.now();
  const sqls: string[] = [];

  for (let i = 0; i < wikiTax.terms.length; i++) {
    const term = wikiTax.terms[i];
    const id = uid();
    wikiCategoryIds.set(term.slug, id);
    sqls.push(
      `INSERT OR REPLACE INTO wiki_categories (id, slug, name, description, sort_order, created_at) VALUES (` +
      `${sqlStr(id)}, ${sqlStr(term.slug)}, ${sqlStr(term.label)}, ${sqlStr(term.description ?? null)}, ${i}, ${now})`
    );
  }

  execSqlBatch(sqls);
  console.log(`  Created ${wikiTax.terms.length} wiki categories`);
}

function seedWikiArticles(): void {
  console.log("Seeding wiki articles...");

  const now = Date.now();
  const sqls: string[] = [];

  for (const article of wikiArticles) {
    const articleId = uid();
    wikiArticleIds.set(article.id, articleId);
    const authorId = resolveBylineRef(article.data.author);
    const content = portableTextToString(article.data.content);
    const categoryId = wikiCategoryIds.get(article.data.category) ?? article.data.category;

    sqls.push(
      `INSERT OR REPLACE INTO wiki_articles (id, category_id, slug, title, content, excerpt, author_id, status, view_count, created_at, updated_at, published_at) VALUES (` +
      `${sqlStr(articleId)}, ${sqlStr(categoryId)}, ${sqlStr(article.slug)}, ${sqlStr(article.data.title)}, ${sqlStr(content)}, ${sqlStr(article.data.excerpt ?? null)}, ${sqlStr(authorId)}, ${sqlStr(article.status)}, ${article.data.view_count ?? 0}, ${now}, ${now}, ${article.status === "published" ? now : "NULL"})`
    );

    // Create initial revision
    sqls.push(
      `INSERT OR REPLACE INTO wiki_revisions (id, article_id, content, title, author_id, diff_summary, created_at) VALUES (` +
      `${sqlStr(uid())}, ${sqlStr(articleId)}, ${sqlStr(content)}, ${sqlStr(article.data.title)}, ${sqlStr(authorId)}, ${sqlStr("Initial version")}, ${now})`
    );
  }

  execSqlBatch(sqls);
  console.log(`  Created ${wikiArticles.length} wiki articles`);
}

function seedForumCategories(): void {
  console.log("Seeding forum categories...");

  const forumTax = taxonomies.find((t) => t.name === "forum-category");
  if (!forumTax) return;

  const now = Date.now();
  const sqls: string[] = [];

  for (let i = 0; i < forumTax.terms.length; i++) {
    const term = forumTax.terms[i];
    const id = uid();
    forumCategoryIds.set(term.slug, id);
    sqls.push(
      `INSERT OR REPLACE INTO forum_categories (id, slug, name, description, sort_order, created_at) VALUES (` +
      `${sqlStr(id)}, ${sqlStr(term.slug)}, ${sqlStr(term.label)}, ${sqlStr(term.description ?? null)}, ${i}, ${now})`
    );
  }

  execSqlBatch(sqls);
  console.log(`  Created ${forumTax.terms.length} forum categories`);
}

function seedForumThreads(): void {
  console.log("Seeding forum threads...");

  const now = Date.now();
  const sqls: string[] = [];

  for (const thread of forumThreads) {
    const threadId = uid();
    threadIds.set(thread.id, threadId);
    const authorId = resolveBylineRef(thread.data.author);
    const categoryId = forumCategoryIds.get(thread.data.category) ?? thread.data.category;

    sqls.push(
      `INSERT OR REPLACE INTO forum_threads (id, category_id, author_id, slug, title, is_pinned, is_locked, post_count, last_reply_at, last_reply_user_id, created_at, updated_at) VALUES (` +
      `${sqlStr(threadId)}, ${sqlStr(categoryId)}, ${sqlStr(authorId)}, ${sqlStr(thread.slug)}, ${sqlStr(thread.data.title)}, ${thread.data.is_pinned ? 1 : 0}, ${thread.data.is_locked ? 1 : 0}, ${thread.data.reply_count ?? 0}, ${now}, ${sqlStr(authorId)}, ${now}, ${now})`
    );
  }

  execSqlBatch(sqls);
  console.log(`  Created ${forumThreads.length} forum threads`);
}

function seedForumPosts(): void {
  console.log("Seeding forum posts...");

  const now = Date.now();
  const sqls: string[] = [];

  for (const post of forumPosts) {
    const authorId = resolveBylineRef(post.data.author);
    const content = portableTextToString(post.data.content);
    const threadId = threadIds.get(post.data.thread_id) ?? post.data.thread_id;

    sqls.push(
      `INSERT OR REPLACE INTO forum_posts (id, thread_id, author_id, content, created_at, updated_at) VALUES (` +
      `${sqlStr(uid())}, ${sqlStr(threadId)}, ${sqlStr(authorId)}, ${sqlStr(content)}, ${now}, ${now})`
    );
  }

  execSqlBatch(sqls);
  console.log(`  Created ${forumPosts.length} forum posts`);
}

function seedMeetups(): void {
  console.log("Seeding meetups...");

  const now = Date.now();
  const sqls: string[] = [];

  for (const meetup of meetupEvents) {
    const organizerId = resolveBylineRef(meetup.data.organizer);
    const description = portableTextToString(meetup.data.description);
    const startsAt = parseIsoToEpoch(meetup.data.date_start);
    const endsAt = meetup.data.date_end ? parseIsoToEpoch(meetup.data.date_end) : null;

    sqls.push(
      `INSERT OR REPLACE INTO meetups (id, slug, title, description, content, location, starts_at, ends_at, status, organizer_id, created_at, updated_at) VALUES (` +
      `${sqlStr(uid())}, ${sqlStr(meetup.slug)}, ${sqlStr(meetup.data.title)}, ${sqlStr(description)}, NULL, ${sqlStr(meetup.data.location_name)}, ${startsAt}, ${endsAt ?? "NULL"}, ${sqlStr(meetup.status === "published" ? "upcoming" : meetup.status)}, ${sqlStr(organizerId)}, ${now}, ${now})`
    );
  }

  execSqlBatch(sqls);
  console.log(`  Created ${meetupEvents.length} meetups`);
}

function seedBuilds(): void {
  console.log("Seeding builds...");

  const now = Date.now();
  const sqls: string[] = [];

  for (const build of builds) {
    const buildId = uid();
    buildIds.set(build.id, buildId);
    const builderId = resolveBylineRef(build.data.builder);
    const reviewedById = build.data.reviewedBy ? resolveBylineRef(build.data.reviewedBy) : null;

    sqls.push(
      `INSERT OR REPLACE INTO builds (id, slug, title, description, content, hero_image_url, status, author_id, rejection_reason, auto_review_result, reviewed_by, reviewed_at, published_at, created_at, updated_at) VALUES (` +
      `${sqlStr(buildId)}, ${sqlStr(build.slug)}, ${sqlStr(build.data.title)}, ${sqlStr(build.data.description)}, ${sqlStr(build.data.parts_list ?? null)}, ${sqlStr(build.data.featured_image ?? null)}, ${sqlStr(build.status)}, ${sqlStr(builderId)}, ${sqlStr(build.rejectionReason ?? null)}, ${sqlStr(build.autoReviewResult ?? null)}, ${sqlStr(reviewedById)}, ${sqlStr(build.data.reviewedAt ?? null)}, ${sqlStr(build.data.publishedAt ?? null)}, ${now}, ${now})`
    );
  }

  execSqlBatch(sqls);
  console.log(`  Created ${builds.length} builds`);
}

function seedCommunityGuidelinesAcceptances(): void {
  console.log("Seeding community guidelines acceptances...");

  const now = Date.now();
  const sqls: string[] = [];

  for (const acceptance of communityGuidelinesAcceptances) {
    const userId = userSlugToId.get(acceptance.userId) ?? acceptance.userId;
    const acceptedAt = parseIsoToEpoch(acceptance.acceptedAt);

    sqls.push(
      `INSERT OR REPLACE INTO community_guidelines_acceptances (id, user_id, version, accepted_at, ip_address) VALUES (` +
      `${sqlStr(uid())}, ${sqlStr(userId)}, ${sqlStr(acceptance.version)}, ${acceptedAt}, ${sqlStr(acceptance.ipAddress ?? null)})`
    );
  }

  execSqlBatch(sqls);
  console.log(`  Created ${communityGuidelinesAcceptances.length} community guidelines acceptances`);
}

function seedBuildComments(): void {
  console.log("Seeding build comments...");

  const now = Date.now();
  const sqls: string[] = [];

  for (const comment of buildComments) {
    const authorId = userSlugToId.get(comment.authorId) ?? comment.authorId;
    const buildId = buildIds.get(comment.buildId) ?? comment.buildId;
    const createdAt = parseIsoToEpoch(comment.createdAt);

    // Resolve parentId if it exists
    const parentId = comment.parentId ? sqlStr(buildIds.get(comment.parentId) ?? comment.parentId) : "NULL";

    sqls.push(
      `INSERT OR REPLACE INTO build_comments (id, build_id, author_id, content, parent_id, created_at) VALUES (` +
      `${sqlStr(uid())}, ${sqlStr(buildId)}, ${sqlStr(authorId)}, ${sqlStr(comment.content)}, ${parentId}, ${createdAt})`
    );
  }

  execSqlBatch(sqls);
  console.log(`  Created ${buildComments.length} build comments`);
}

function seedWikiComments(): void {
  console.log("Seeding wiki comments...");

  const now = Date.now();
  const sqls: string[] = [];

  for (const comment of wikiComments) {
    const authorId = userSlugToId.get(comment.authorId) ?? comment.authorId;
    const articleId = wikiArticleIds.get(comment.articleId) ?? comment.articleId;
    const createdAt = parseIsoToEpoch(comment.createdAt);

    // Resolve parentId if it exists
    const parentId = comment.parentId ? sqlStr(wikiArticleIds.get(comment.parentId) ?? comment.parentId) : "NULL";

    sqls.push(
      `INSERT OR REPLACE INTO wiki_comments (id, article_id, author_id, content, parent_id, created_at) VALUES (` +
      `${sqlStr(uid())}, ${sqlStr(articleId)}, ${sqlStr(authorId)}, ${sqlStr(comment.content)}, ${parentId}, ${createdAt})`
    );
  }

  execSqlBatch(sqls);
  console.log(`  Created ${wikiComments.length} wiki comments`);
}

// ── Main ────────────────────────────────────────────────────────────────────────

function resolveBylineRef(ref: string): string | null {
  if (!ref.startsWith("$ref:byline-")) return null;
  const slug = ref.slice(12);
  return userSlugToId.get(slug) ?? null;
}

function main() {
  console.log(`🌱 Starting seed: ${manifest.meta.name}\n`);
  console.log(`   ${manifest.meta.description}\n`);

  try {
    seedAuth();
    seedWikiCategories();
    seedWikiArticles();
    seedForumCategories();
    seedForumThreads();
    seedForumPosts();
    seedMeetups();
    seedBuilds();
    seedCommunityGuidelinesAcceptances();
    seedBuildComments();
    seedWikiComments();

    console.log("\n✅ Seed complete!");
  } catch (error) {
    console.error("\n❌ Seed failed:", error);
    process.exit(1);
  }
}

main();
