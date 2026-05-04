/**
 * Shared types for the cyberdeck.club MCP server
 */

// ---------------------------------------------------------------------------
// API Response types
// ---------------------------------------------------------------------------

export interface ApiError {
  error: string;
  message?: string;
  status?: string;
  reason?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// ---------------------------------------------------------------------------
// Build types
// ---------------------------------------------------------------------------

export interface Build {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  content: string | null;
  heroImageUrl: string | null;
  status: BuildStatus;
  authorId: string;
  createdAt: number;
  updatedAt: number;
  publishedAt: string | null;
}

export type BuildStatus =
  | "planning"
  | "in-progress"
  | "complete"
  | "draft"
  | "published"
  | "pending_auto"
  | "pending_human"
  | "rejected_auto"
  | "rejected";

export interface BuildListResponse {
  builds: Build[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BuildComment {
  id: string;
  buildId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: number;
}

export interface BuildCommentListResponse {
  comments: BuildComment[];
}

// ---------------------------------------------------------------------------
// Wiki types
// ---------------------------------------------------------------------------

export interface WikiArticle {
  id: string;
  categoryId: string;
  slug: string;
  title: string;
  content: string;
  authorId: string;
  authorName?: string;
  status: "published" | "draft" | "archived";
  viewCount: number;
  createdAt: number;
  updatedAt: number;
  publishedAt: number | null;
}

export interface WikiArticleListResponse {
  articles: WikiArticle[];
  total: number;
  page: number;
  pageSize: number;
}

export interface WikiRevision {
  id: string;
  articleId: string;
  content: string;
  title: string;
  authorId: string;
  authorName?: string;
  diffSummary: string | null;
  createdAt: number;
}

export interface WikiArticleHistoryResponse {
  revisions: WikiRevision[];
}

// ---------------------------------------------------------------------------
// Forum types
// ---------------------------------------------------------------------------

export interface ForumThread {
  id: string;
  categoryId: string;
  authorId: string;
  authorName?: string;
  slug: string;
  title: string;
  isPinned: number;
  isLocked: number;
  postCount: number;
  lastReplyAt: number;
  lastReplyUserId: string;
  createdAt: number;
  updatedAt: number;
}

export interface ForumThreadListResponse {
  threads: ForumThread[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ForumPost {
  id: string;
  threadId: string;
  authorId: string;
  authorName?: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface ForumPostListResponse {
  posts: ForumPost[];
}

// ---------------------------------------------------------------------------
// Meetup types
// ---------------------------------------------------------------------------

export interface Meetup {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  content: string | null;
  location: string | null;
  startsAt: number | null;
  endsAt: number | null;
  status: "upcoming" | "ongoing" | "past" | "cancelled";
  organizerId: string;
  organizerName?: string;
  createdAt: number;
  updatedAt: number;
}

export interface MeetupListResponse {
  meetups: Meetup[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// User / Profile types
// ---------------------------------------------------------------------------

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  bio: string | null;
  role: string;
}

export interface TokenInfo {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: number;
}

export interface TokenListResponse {
  tokens: TokenInfo[];
}

export interface TokenUsageLog {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: number;
}

export interface TokenLogsResponse {
  logs: TokenUsageLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

// ---------------------------------------------------------------------------
// Admin types
// ---------------------------------------------------------------------------

export interface AdminTokenInfo extends TokenInfo {
  userId: string;
  ownerName: string;
  ownerEmail: string;
}

export interface AdminTokenListResponse {
  tokens: AdminTokenInfo[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  image: string | null;
  bio: string | null;
  createdAt: number;
}

export interface AdminUserListResponse {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// MCP tool result types
// ---------------------------------------------------------------------------

export interface McpTextContent {
  type: "text";
  text: string;
  [key: string]: unknown;
}

export interface McpToolResult {
  content: McpTextContent[];
  isError?: boolean;
  [key: string]: unknown;
}
