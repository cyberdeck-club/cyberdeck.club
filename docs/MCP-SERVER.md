# MCP Server — Setup and Usage Guide

The cyberdeck.club MCP (Model Context Protocol) server enables AI assistants to interact with the cyberdeck.club API on behalf of users. It exposes tools for managing builds, wiki articles, forum threads, meetups, and user profiles.

## What is MCP?

The [Model Context Protocol](https://modelcontextprotocol.io/) is a standardized way for AI assistants to connect to external tools and data sources. The cyberdeck.club MCP server acts as a bridge — it maps MCP tool calls to the cyberdeck.club REST API, using Personal Access Tokens (PATs) for authentication.

---

## Quick Start

### 1. Create a Personal Access Token

1. Log in to [cyberdeck.club](https://cyberdeck.club)
2. Go to **Settings → Personal Access Tokens**
3. Create a new token with the scopes you need
4. Copy the token immediately — it is only shown once

For most MCP use cases, select these scopes:
- `builds:read` — Browse builds
- `wiki:read` — Browse wiki articles
- `forum:read` — Read forum threads
- `profile:read` — View your profile

Add more scopes as needed for write operations.

### 2. Install the MCP Server

```bash
npm install @cyberdeck-club/mcp-server
```

### 3. Connect to an MCP Client

Configure your AI assistant or MCP client to use the server. See [Claude Desktop Setup](#claude-desktop-setup) or [Other MCP Clients](#other-mcp-clients) below.

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CYBERDECK_PAT` | Yes | — | Personal Access Token from cyberdeck.club/settings |
| `CYBERDECK_API_URL` | No | `https://cyberdeck.club` | Base URL of the cyberdeck.club API |

Set the PAT before starting the server:

```bash
export CYBERDECK_PAT="cdc_a1b2c3d4e5f6..."
npx @cyberdeck-club/mcp-server
```

Or pass it inline:

```bash
CYBERDECK_PAT="cdc_a1b2c3d4e5f6..." npx @cyberdeck-club/mcp-server
```

---

## Claude Desktop Setup

Add the cyberdeck.club MCP server to your Claude Desktop configuration:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "cyberdeck": {
      "command": "npx",
      "args": ["@cyberdeck-club/mcp-server"],
      "env": {
        "CYBERDECK_PAT": "cdc_a1b2c3d4e5f6..."
      }
    }
  }
}
```

Restart Claude Desktop after updating the config. The cyberdeck tools will appear in the tool list.

---

## Other MCP Clients

The server communicates over stdio. Configure your MCP client to spawn it as a subprocess:

```bash
CYBERDECK_PAT=your_token node ./node_modules/@cyberdeck-club/mcp-server/dist/index.js
```

Or with a custom API URL:

```bash
CYBERDECK_PAT=your_token CYBERDECK_API_URL=https://beta.cyberdeck.club node ./node_modules/@cyberdeck-club/mcp-server/dist/index.js
```

---

## Available Tools

### Build Tools

| Tool | Description | Required Scope |
|------|-------------|----------------|
| `list_builds` | List all published builds with pagination | `builds:read` |
| `get_build` | Get details of a specific build by slug | `builds:read` |
| `create_build` | Submit a new build for publication | `builds:write` |
| `update_build` | Update an existing build | `builds:write` |
| `list_build_comments` | Get comments on a build | `builds:read` |
| `add_build_comment` | Add a comment to a build | `builds:write` |

### Wiki Tools

| Tool | Description | Required Scope |
|------|-------------|----------------|
| `list_wiki_articles` | List wiki articles with optional category filter | `wiki:read` |
| `get_wiki_article` | Get a specific wiki article by category and slug | `wiki:read` |
| `create_wiki_article` | Create a new wiki article | `wiki:write` |
| `update_wiki_article` | Update an existing wiki article | `wiki:write` |
| `get_wiki_article_history` | Get revision history for a wiki article | `wiki:read` |

### Forum Tools

| Tool | Description | Required Scope |
|------|-------------|----------------|
| `list_forum_threads` | List forum threads with optional category filter | `forum:read` |
| `get_forum_thread` | Get a specific forum thread with posts | `forum:read` |
| `create_forum_thread` | Create a new forum thread | `forum:write` |
| `list_forum_posts` | Get posts in a thread | `forum:read` |
| `create_forum_post` | Reply to a forum thread | `forum:write` |

### Meetup Tools

| Tool | Description | Required Scope |
|------|-------------|----------------|
| `list_meetups` | List upcoming meetup events | `meetups:read` |
| `create_meetup` | Create a new meetup event | `meetups:write` |

### Profile Tools

| Tool | Description | Required Scope |
|------|-------------|----------------|
| `get_my_profile` | Get your user profile | `profile:read` |
| `update_my_profile` | Update your display name, bio, or avatar | `profile:write` |

### Admin Tools

| Tool | Description | Required Scope |
|------|-------------|----------------|
| `list_all_tokens` | List all personal access tokens (admin) | `admin:read` |
| `list_token_logs` | View usage logs for tokens (admin) | `admin:read` |
| `list_users` | List all users (admin) | `admin:read` |
| `update_user_role` | Update a user's role (admin) | `admin:write` |

---

## Role Requirements

Some tools require specific user roles beyond the PAT scope:

| Tool | Required Role |
|------|---------------|
| `create_wiki_article` | Maker or higher |
| `update_wiki_article` | Maker or higher |
| `create_forum_thread` | Maker or higher |
| `create_meetup` | Trusted Maker or higher |
| `update_user_role` | Admin only |
| `list_all_tokens` | Admin only |

Your PAT scope grants access to the API endpoints, but your user role determines what operations you can perform. If your role is insufficient, the API returns a `403` error.

---

## Building from Source

To build and run the MCP server from the repository source:

```bash
# Clone the repository
git clone https://github.com/cyberdeck-club/cyberdeck.club.git
cd cyberdeck.club/mcp-server

# Install dependencies
npm install

# Build the TypeScript
npm run build

# Run in standalone mode
CYBERDECK_PAT="cdc_a1b2c3d4e5f6..." node dist/index.js
```

For development with watch mode:

```bash
npm run dev
```

---

## Troubleshooting

### Invalid token

```
Error: Invalid token
```

The PAT is malformed or was revoked. Create a new token in **Settings → Personal Access Tokens**.

### Token has expired

```
Error: Token has expired
```

The PAT has passed its expiration date. Create a new token with no expiration or a future expiration date.

### Insufficient token scope

```
Error: Insufficient token scope
Required: wiki:write
Granted: ["builds:read", "wiki:read"]
```

The PAT lacks the required scope for this operation. Create a new token with the appropriate scope.

### Account suspended

```
Error: Account suspended
```

Your account has been suspended. Contact a moderator or admin for more information.

### Connection errors

If you see connection errors when the server starts:

1. Verify `CYBERDECK_API_URL` is correct (use `https://cyberdeck.club` for production)
2. Check your network connection
3. Verify the cyberdeck.club API is operational at [status.cyberdeck.club](https://status.cyberdeck.club)

### MCP client not finding the server

1. Verify the server package is installed: `npm list @cyberdeck-club/mcp-server`
2. Check that the `command` and `args` in your MCP client config match the examples
3. Try running the server directly to see error output: `CYBERDECK_PAT=... node ./node_modules/@cyberdeck-club/mcp-server/dist/index.js`

---

## Reference

- [`mcp-server/README.md`](mcp-server/README.md) — MCP server package documentation
- [`docs/PAT-API-TOKENS.md`](docs/PAT-API-TOKENS.md) — PAT system and API authentication
- [`plans/PAT-MCP-SERVER-DESIGN.md`](plans/PAT-MCP-SERVER-DESIGN.md) — Full design document
