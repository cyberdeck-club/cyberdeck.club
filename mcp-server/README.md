# cyberdeck-mcp-server

MCP (Model Context Protocol) server for [cyberdeck.club](https://cyberdeck.club) — enables AI assistants to interact with the cyberdeck.club API using Personal Access Tokens (PATs).

## Overview

This package provides an MCP server that exposes tools for managing:

- **Builds** — List, view, create, and update cyberdeck build showcases
- **Wiki** — Browse and edit wiki articles with revision history
- **Forum** — Participate in community discussions
- **Meetups** — Discover and create community events
- **Profile** — Manage your user profile
- **Admin** — Administrative operations (token management, user roles)

## Installation

```bash
npm install @cyberdeck-club/mcp-server
```

## Configuration

The server requires a Personal Access Token (PAT) from cyberdeck.club.

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CYBERDECK_PAT` | Yes | — | Personal Access Token from cyberdeck.club/settings |
| `CYBERDECK_API_URL` | No | `https://cyberdeck.club` | Base URL of the cyberdeck.club API |

### Generating a Personal Access Token

1. Log in to [cyberdeck.club](https://cyberdeck.club)
2. Go to Settings → Personal Access Tokens
3. Create a new token with the desired scopes
4. Copy the token and store it securely

## Usage

### Running as a Standalone Server

```bash
# Set your PAT
export CYBERDECK_PAT="your_personal_access_token"

# Run the server
npx @cyberdeck-club/mcp-server
```

### Using with Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "cyberdeck": {
      "command": "npx",
      "args": ["@cyberdeck-club/mcp-server"],
      "env": {
        "CYBERDECK_PAT": "your_personal_access_token"
      }
    }
  }
}
```

### Using with Other MCP Clients

The server communicates over stdio. Configure your MCP client to spawn it as a subprocess:

```bash
CYBERDECK_PAT=your_token node ./node_modules/@cyberdeck-club/mcp-server/dist/index.js
```

## Available Tools

### Build Tools

| Tool | Description | Required Scope |
|------|-------------|----------------|
| `list_builds` | List all published builds with pagination | `builds:read` |
| `get_build` | Get details of a specific build | `builds:read` |
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

## Token Scopes

When creating a PAT, you can select from these scopes:

| Scope | Description |
|-------|-------------|
| `builds:read` | Read builds and build comments |
| `builds:write` | Create and update builds |
| `wiki:read` | Read wiki articles and history |
| `wiki:write` | Create and edit wiki articles |
| `forum:read` | Read forum threads and posts |
| `forum:write` | Create forum threads and reply |
| `meetups:read` | Read meetup events |
| `meetups:write` | Create meetup events |
| `profile:read` | Read your profile |
| `profile:write` | Update your profile |
| `moderation:read` | View moderation queue |
| `moderation:write` | Approve/reject content |
| `admin:read` | Administrative read operations |
| `admin:write` | Administrative write operations |
| `*` | Full access to all endpoints |

## Role Requirements

Some tools require specific user roles:

| Tool | Required Role |
|------|---------------|
| `create_wiki_article` | Maker or higher |
| `update_wiki_article` | Maker or higher |
| `create_forum_thread` | Maker or higher |
| `create_meetup` | Trusted Maker or higher |
| `update_user_role` | Admin only |
| `list_all_tokens` | Admin only |

## Development

```bash
# Clone the repository
git clone https://github.com/cyberdeck-club/cyberdeck.club.git
cd cyberdeck.club/mcp-server

# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev
```

## License

MIT