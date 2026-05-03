// Re-export all auth schema tables and relations
export * from "./auth-schema";

// App-specific tables
import { relations, sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";

// Wiki tables

export const wikiCategories = sqliteTable("wiki_categories", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

export const wikiArticles = sqliteTable(
  "wiki_articles",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id")
      .notNull()
      .references(() => wikiCategories.id),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    excerpt: text("excerpt"),
    authorId: text("author_id").references(() => user.id),
    status: text("status").notNull().default("draft"),
    viewCount: integer("view_count").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    publishedAt: integer("published_at"),
  },
  (table) => [
    uniqueIndex("wiki_articles_category_slug_idx").on(
      table.categoryId,
      table.slug
    ),
    index("wiki_articles_category_status_idx").on(
      table.categoryId,
      table.status
    ),
  ]
);

export const wikiRevisions = sqliteTable(
  "wiki_revisions",
  {
    id: text("id").primaryKey(),
    articleId: text("article_id")
      .notNull()
      .references(() => wikiArticles.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    title: text("title").notNull(),
    authorId: text("author_id").references(() => user.id),
    diffSummary: text("diff_summary"), // Human-readable summary of changes
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("wiki_revisions_article_id_idx").on(table.articleId)]
);

// Forum tables

export const forumCategories = sqliteTable("forum_categories", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

export const forumThreads = sqliteTable(
  "forum_threads",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id")
      .notNull()
      .references(() => forumCategories.id),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    isPinned: integer("is_pinned").notNull().default(0),
    isLocked: integer("is_locked").notNull().default(0),
    postCount: integer("post_count").notNull().default(0),
    lastReplyAt: integer("last_reply_at"),
    lastReplyUserId: text("last_reply_user_id").references(() => user.id),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("forum_threads_category_last_reply_idx").on(
      table.categoryId,
      table.lastReplyAt
    ),
  ]
);

export const forumPosts = sqliteTable(
  "forum_posts",
  {
    id: text("id").primaryKey(),
    threadId: text("thread_id")
      .notNull()
      .references(() => forumThreads.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id),
    content: text("content").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("forum_posts_thread_created_idx").on(
      table.threadId,
      table.createdAt
    ),
  ]
);

// Builds table

export const builds = sqliteTable("builds", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content"),
  heroImageUrl: text("hero_image_url"),
  status: text("status").notNull().default("pending_auto"),
  authorId: text("author_id").references(() => user.id),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  // Moderation fields
  rejectionReason: text("rejection_reason"),
  autoReviewResult: text("auto_review_result"), // JSON from LLM review
  reviewedBy: text("reviewed_by").references(() => user.id),
  reviewedAt: text("reviewed_at"), // ISO 8601
  publishedAt: text("published_at"), // ISO 8601
});

// Meetups table

export const meetups = sqliteTable("meetups", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content"),
  location: text("location"),
  startsAt: integer("starts_at"),
  endsAt: integer("ends_at"),
  status: text("status").notNull().default("upcoming"),
  organizerId: text("organizer_id").references(() => user.id),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// Relations

export const wikiCategoriesRelations = relations(
  wikiCategories,
  ({ many }) => ({
    articles: many(wikiArticles),
  })
);

export const wikiArticlesRelations = relations(wikiArticles, ({ one }) => ({
  category: one(wikiCategories, {
    fields: [wikiArticles.categoryId],
    references: [wikiCategories.id],
  }),
  author: one(user, {
    fields: [wikiArticles.authorId],
    references: [user.id],
  }),
}));

export const wikiRevisionsRelations = relations(
  wikiRevisions,
  ({ one }) => ({
    article: one(wikiArticles, {
      fields: [wikiRevisions.articleId],
      references: [wikiArticles.id],
    }),
    author: one(user, {
      fields: [wikiRevisions.authorId],
      references: [user.id],
    }),
  })
);

export const forumCategoriesRelations = relations(
  forumCategories,
  ({ many }) => ({
    threads: many(forumThreads),
  })
);

export const forumThreadsRelations = relations(forumThreads, ({ one, many }) => ({
  category: one(forumCategories, {
    fields: [forumThreads.categoryId],
    references: [forumCategories.id],
  }),
  author: one(user, {
    fields: [forumThreads.authorId],
    references: [user.id],
  }),
  lastReplyUser: one(user, {
    fields: [forumThreads.lastReplyUserId],
    references: [user.id],
  }),
  posts: many(forumPosts),
}));

export const forumPostsRelations = relations(forumPosts, ({ one }) => ({
  thread: one(forumThreads, {
    fields: [forumPosts.threadId],
    references: [forumThreads.id],
  }),
  author: one(user, {
    fields: [forumPosts.authorId],
    references: [user.id],
  }),
}));

export const buildsRelations = relations(builds, ({ one }) => ({
  author: one(user, {
    fields: [builds.authorId],
    references: [user.id],
  }),
}));

export const meetupsRelations = relations(meetups, ({ one }) => ({
  organizer: one(user, {
    fields: [meetups.organizerId],
    references: [user.id],
  }),
}));

// Static pages table - for editable static content
export const staticPages = sqliteTable("static_pages", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  content: text("content"), // HTML or Markdown content
  metaDescription: text("meta_description"),
  metaImage: text("meta_image"),
  featuredImage: text("featured_image"),
  featuredImageAlt: text("featured_image_alt"),
  status: text("status").notNull().default("published"), // published, draft
  authorId: text("author_id").references(() => user.id),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const staticPagesRelations = relations(staticPages, ({ one }) => ({
  author: one(user, {
    fields: [staticPages.authorId],
    references: [user.id],
  }),
}));

// Community guidelines acceptances table
export const communityGuidelinesAcceptances = sqliteTable(
  "community_guidelines_acceptances",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    version: text("version").notNull(),
    acceptedAt: integer("accepted_at").notNull(),
    ipAddress: text("ip_address"),
    turnstileToken: text("turnstile_token"),
  },
  (table) => [
    index("community_guidelines_acceptances_user_id_idx").on(table.userId),
  ]
);

// Build comments table
export const buildComments = sqliteTable(
  "build_comments",
  {
    id: text("id").primaryKey(),
    buildId: text("build_id")
      .notNull()
      .references(() => builds.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id),
    content: text("content").notNull(),
    parentId: text("parent_id"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at"),
    deletedAt: integer("deleted_at"),
  },
  (table) => [
    index("build_comments_build_id_idx").on(table.buildId),
    index("build_comments_parent_id_idx").on(table.parentId),
  ]
);

export const communityGuidelinesAcceptancesRelations = relations(
  communityGuidelinesAcceptances,
  ({ one }) => ({
    user: one(user, {
      fields: [communityGuidelinesAcceptances.userId],
      references: [user.id],
    }),
  })
);

export const buildCommentsRelations = relations(
  buildComments,
  ({ one }) => ({
    build: one(builds, {
      fields: [buildComments.buildId],
      references: [builds.id],
    }),
    author: one(user, {
      fields: [buildComments.authorId],
      references: [user.id],
    }),
    parent: one(buildComments, {
      fields: [buildComments.parentId],
      references: [buildComments.id],
    }),
  })
);

// Wiki comments table
export const wikiComments = sqliteTable(
  "wiki_comments",
  {
    id: text("id").primaryKey(),
    articleId: text("article_id")
      .notNull()
      .references(() => wikiArticles.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id),
    content: text("content").notNull(),
    parentId: text("parent_id"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at"),
    deletedAt: integer("deleted_at"),
  },
  (table) => [
    index("wiki_comments_article_id_idx").on(table.articleId),
    index("wiki_comments_parent_id_idx").on(table.parentId),
  ]
);

export const wikiCommentsRelations = relations(wikiComments, ({ one }) => ({
  article: one(wikiArticles, {
    fields: [wikiComments.articleId],
    references: [wikiArticles.id],
  }),
  author: one(user, {
    fields: [wikiComments.authorId],
    references: [user.id],
  }),
  parent: one(wikiComments, {
    fields: [wikiComments.parentId],
    references: [wikiComments.id],
  }),
}));
