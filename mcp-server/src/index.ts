#!/usr/bin/env node
/**
 * MCP Server entry point for cyberdeck.club
 *
 * This server exposes tools for managing builds, wiki articles, forum threads,
 * meetups, user profiles, and administrative operations via the Model Context Protocol.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { CyberdeckClient } from "./client.js";
import { registerBuildTools } from "./tools/builds.js";
import { registerWikiTools } from "./tools/wiki.js";
import { registerForumTools } from "./tools/forum.js";
import { registerMeetupTools } from "./tools/meetups.js";
import { registerProfileTools } from "./tools/profile.js";
import { registerAdminTools } from "./tools/admin.js";

// ---------------------------------------------------------------------------
// Server class
// ---------------------------------------------------------------------------

class CyberdeckMCPServer {
  private server: McpServer;
  private client: CyberdeckClient;

  constructor(baseUrl: string, token: string) {
    this.client = new CyberdeckClient(baseUrl, token);

    this.server = new McpServer(
      {
        name: "cyberdeck-mcp-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Register all tool handlers
    this.registerTools();
  }

  private registerTools(): void {
    // Build tools (list_builds, get_build, create_build, update_build,
    //             list_build_comments, add_build_comment)
    registerBuildTools(this.server, this.client);

    // Wiki tools (list_wiki_articles, get_wiki_article, create_wiki_article,
    //            update_wiki_article, get_wiki_article_history)
    registerWikiTools(this.server, this.client);

    // Forum tools (list_forum_threads, get_forum_thread, create_forum_thread,
    //             list_forum_posts, create_forum_post)
    registerForumTools(this.server, this.client);

    // Meetup tools (list_meetups, create_meetup)
    registerMeetupTools(this.server, this.client);

    // Profile tools (get_my_profile, update_my_profile)
    registerProfileTools(this.server, this.client);

    // Admin tools (list_all_tokens, list_token_logs, list_users, update_user_role)
    registerAdminTools(this.server, this.client);
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("cyberdeck-mcp-server running on stdio");
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // Read configuration from environment variables
  const baseUrl = process.env.CYBERDECK_API_URL || "https://cyberdeck.club";
  const token = process.env.CYBERDECK_PAT;

  if (!token) {
    console.error(
      "Error: CYBERDECK_PAT environment variable is required.\n" +
      "Generate a Personal Access Token at https://cyberdeck.club/settings"
    );
    process.exit(1);
  }

  const server = new CyberdeckMCPServer(baseUrl, token);
  await server.run();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
