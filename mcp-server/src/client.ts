/**
 * HTTP client wrapper for cyberdeck.club API
 *
 * Handles authentication via Bearer token, JSON serialization,
 * and error handling with typed responses.
 */

import type {
  ApiError,
  BuildListResponse,
  Build,
  BuildCommentListResponse,
  WikiArticleListResponse,
  WikiArticle,
  WikiArticleHistoryResponse,
  ForumThreadListResponse,
  ForumThread,
  ForumPostListResponse,
  MeetupListResponse,
  Meetup,
  UserProfile,
  TokenListResponse,
  TokenLogsResponse,
  AdminTokenListResponse,
  AdminUserListResponse,
} from "./types.js";

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class CyberdeckApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public path: string
  ) {
    super(`API error ${status} on ${path}: ${message}`);
    this.name = "CyberdeckApiError";
  }
}

// ---------------------------------------------------------------------------
// Client class
// ---------------------------------------------------------------------------

export class CyberdeckClient {
  private readonly userAgent = "cyberdeck-mcp-server/0.1.0";

  constructor(
    private readonly baseUrl: string,
    private readonly token: string
  ) { }

  /**
   * Make a typed GET request
   */
  async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  /**
   * Make a typed POST request with a body
   */
  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  /**
   * Make a typed PATCH request with a body
   */
  async patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }

  /**
   * Make a typed PUT request with a body
   */
  async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PUT", path, body);
  }

  /**
   * Make a typed DELETE request
   */
  async delete<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }

  /**
   * Core request method with error handling
   */
  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
      "User-Agent": this.userAgent,
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const errorData = (await response.json()) as ApiError;
        errorMessage = errorData.error ?? errorData.message ?? errorMessage;
      } catch {
        // Response body is not JSON
      }
      throw new CyberdeckApiError(response.status, errorMessage, path);
    }

    const data = (await response.json()) as T;
    return data;
  }

  // ---------------------------------------------------------------------------
  // Convenience methods with specific return types
  // ---------------------------------------------------------------------------

  // Builds
  async listBuilds(params?: { page?: number; status?: string; category?: string }): Promise<BuildListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.status) searchParams.set("status", params.status);
    if (params?.category) searchParams.set("category", params.category);
    const query = searchParams.toString();
    return this.get<BuildListResponse>(`/api/builds${query ? `?${query}` : ""}`);
  }

  async getBuild(slug: string): Promise<{ build: Build }> {
    return this.get<{ build: Build }>(`/api/builds/${slug}`);
  }

  async createBuild(body: {
    title: string;
    description?: string;
    content?: string;
    imageUrl?: string;
  }): Promise<{ id: string; slug: string; status: string }> {
    return this.post<{ id: string; slug: string; status: string }>("/api/builds", body);
  }

  async updateBuild(
    slug: string,
    body: {
      title?: string;
      description?: string;
      content?: string;
      imageUrl?: string;
    }
  ): Promise<{ build: Build }> {
    return this.patch<{ build: Build }>(`/api/builds/${slug}`, body);
  }

  async listBuildComments(slug: string): Promise<BuildCommentListResponse> {
    return this.get<BuildCommentListResponse>(`/api/builds/${slug}/comments`);
  }

  async addBuildComment(slug: string, body: { content: string }): Promise<{ success: boolean; commentId: string }> {
    return this.post<{ success: boolean; commentId: string }>(`/api/builds/${slug}/comments`, body);
  }

  // Wiki
  async listWikiArticles(params?: { category?: string; page?: number }): Promise<WikiArticleListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set("category", params.category);
    if (params?.page) searchParams.set("page", String(params.page));
    const query = searchParams.toString();
    return this.get<WikiArticleListResponse>(`/api/wiki/articles${query ? `?${query}` : ""}`);
  }

  async getWikiArticle(id: string): Promise<{ article: WikiArticle }> {
    return this.get<{ article: WikiArticle }>(`/api/wiki/articles/${id}`);
  }

  async createWikiArticle(body: {
    categoryId: string;
    title: string;
    slug: string;
    content: string;
  }): Promise<{ success: boolean; articleId: string }> {
    return this.post<{ success: boolean; articleId: string }>("/api/wiki/articles", body);
  }

  async updateWikiArticle(
    id: string,
    body: { content: string; editSummary?: string }
  ): Promise<{ success: boolean; revisionId: string }> {
    return this.put<{ success: boolean; revisionId: string }>(`/api/wiki/articles/${id}`, body);
  }

  async getWikiArticleHistory(id: string): Promise<WikiArticleHistoryResponse> {
    return this.get<WikiArticleHistoryResponse>(`/api/wiki/articles/${id}/history`);
  }

  // Forum
  async listForumThreads(params?: { category?: string; page?: number }): Promise<ForumThreadListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set("category", params.category);
    if (params?.page) searchParams.set("page", String(params.page));
    const query = searchParams.toString();
    return this.get<ForumThreadListResponse>(`/api/forum/threads${query ? `?${query}` : ""}`);
  }

  async getForumThread(id: string): Promise<{ thread: ForumThread }> {
    return this.get<{ thread: ForumThread }>(`/api/forum/threads?id=${id}`);
  }

  async createForumThread(body: {
    categoryId: string;
    title: string;
    content: string;
  }): Promise<{ success: boolean; threadId: string }> {
    return this.post<{ success: boolean; threadId: string }>("/api/forum/threads", body);
  }

  async listForumPosts(params: { threadId: string; page?: number }): Promise<ForumPostListResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set("threadId", params.threadId);
    if (params?.page) searchParams.set("page", String(params.page));
    return this.get<ForumPostListResponse>(`/api/forum/posts?${searchParams.toString()}`);
  }

  async createForumPost(body: { threadId: string; content: string }): Promise<{ success: boolean; postId: string }> {
    return this.post<{ success: boolean; postId: string }>("/api/forum/posts", body);
  }

  // Meetups
  async listMeetups(params?: { page?: number }): Promise<MeetupListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    const query = searchParams.toString();
    return this.get<MeetupListResponse>(`/api/meetups${query ? `?${query}` : ""}`);
  }

  async createMeetup(body: {
    title: string;
    slug?: string;
    description?: string;
    content?: string;
    location?: string;
    startsAt?: number;
    endsAt?: number;
  }): Promise<{ id: string; slug: string }> {
    return this.post<{ id: string; slug: string }>("/api/meetups", body);
  }

  // Profile
  async getMyProfile(): Promise<UserProfile> {
    return this.get<UserProfile>("/api/users/me");
  }

  async updateMyProfile(body: {
    name?: string;
    bio?: string;
    image?: string;
  }): Promise<UserProfile> {
    return this.patch<UserProfile>("/api/users/me", body);
  }

  // Admin - Tokens
  async listAllTokens(params?: { page?: number; pageSize?: number; userId?: string }): Promise<AdminTokenListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));
    if (params?.userId) searchParams.set("userId", params.userId);
    const query = searchParams.toString();
    return this.get<AdminTokenListResponse>(`/api/admin/tokens${query ? `?${query}` : ""}`);
  }

  async listTokenLogs(params: {
    page?: number;
    limit?: number;
    userId?: string;
    tokenId?: string;
  }): Promise<TokenLogsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.userId) searchParams.set("userId", params.userId);
    if (params?.tokenId) searchParams.set("tokenId", params.tokenId);
    return this.get<TokenLogsResponse>(`/api/admin/tokens/logs?${searchParams.toString()}`);
  }

  // Admin - Users
  async listUsers(params?: { page?: number; limit?: number }): Promise<AdminUserListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return this.get<AdminUserListResponse>(`/api/admin/users${query ? `?${query}` : ""}`);
  }

  async updateUserRole(
    userId: string,
    body: { role: "member" | "maker" | "trusted_maker" | "moderator" | "admin" }
  ): Promise<{ success: boolean }> {
    return this.put<{ success: boolean }>(`/api/admin/users/${userId}/role`, body);
  }
}
