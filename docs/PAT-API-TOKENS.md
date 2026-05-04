# Personal Access Tokens — API Documentation

Personal Access Tokens (PATs) allow programmatic access to the cyberdeck.club API without using session cookies. They are designed for the MCP server integration, API scripting, and third-party tool access.

## Overview

PATs authenticate API requests the same way session cookies do — they resolve to a user + role. Scopes restrict what a token CAN do; the user's role restricts what they're ALLOWED to do. Both checks apply on every request.

**Key design principles:**

- Raw tokens are shown exactly once at creation; only SHA-256 hashes are stored
- Scopes are validated both at token creation AND at request time
- Token management (create, revoke, list) requires session authentication — PAT auth is blocked on `/api/tokens/*`
- Every PAT-authenticated API call is logged for audit trails
- Maximum 10 active tokens per user

---

## Token Format

```
cdc_<64 hex chars>
```

- **Prefix:** `cdc_` (identifies a cyberdeck.club PAT)
- **Body:** 64 hexadecimal characters (32 random bytes)
- **Total length:** 68 characters
- **Example:** `cdc_a1b2c3d4e5f6...` (truncated for display)

**Storage:** Tokens are stored as SHA-256 hashes. The raw token is only shown once at creation time — store it immediately in a password manager or secrets manager.

---

## Available Scopes

| Scope | Label | Description | Min Role |
|-------|-------|------------|----------|
| `builds:read` | Read builds | View builds and build details | Visitor (0) |
| `builds:write` | Create/edit builds | Submit, edit, and comment on builds | Member (10) |
| `wiki:read` | Read wiki | View wiki articles and history | Visitor (0) |
| `wiki:write` | Create/edit wiki | Create and edit wiki articles | Maker (20) |
| `forum:read` | Read forum | View forum threads and posts | Visitor (0) |
| `forum:write` | Create/reply forum | Create threads and reply to posts | Maker (20) |
| `meetups:read` | Read meetups | View meetup listings | Visitor (0) |
| `meetups:write` | Create meetups | Create and manage meetup events | Trusted Maker (30) |
| `profile:read` | Read your profile | View your profile information | Member (10) |
| `profile:write` | Edit your profile | Update your profile and settings | Member (10) |
| `moderation:read` | View mod queue | View the build moderation queue | Trusted Maker (30) |
| `moderation:write` | Approve/reject builds | Approve or reject builds in the mod queue | Trusted Maker (30) |
| `admin:read` | Admin read access | View admin panels and user data | Admin (50) |
| `admin:write` | Admin write access | Modify roles, ban users, manage site | Admin (50) |
| `*` | Full access | Unrestricted access to all API endpoints | Member (10) |

The global `*` scope grants access to all endpoints. Use it for development or when you need broad access.

---

## API Endpoints Reference

### User Token Management

#### `GET /api/tokens`

Returns all non-revoked tokens for the authenticated user. Requires session auth.

**Response:**
```json
{
  "tokens": [
    {
      "id": "uuid",
      "name": "My MCP Token",
      "tokenPrefix": "cdc_ab12",
      "scopes": ["builds:read", "wiki:read"],
      "expiresAt": null,
      "lastUsedAt": "2026-05-03T10:00:00Z",
      "createdAt": 1746259200
    }
  ]
}
```

#### `POST /api/tokens`

Creates a new personal access token. Requires session auth.

**Request body:**
```json
{
  "name": "My MCP Token",
  "scopes": ["builds:read", "wiki:read"],
  "expiresAt": null
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | User-chosen label (max 100 chars) |
| `scopes` | string[] | Yes | Non-empty array of valid scope strings |
| `expiresAt` | number \| null | No | Unix timestamp (seconds) for expiration; `null` = never expires |

**Response (201):**
```json
{
  "id": "uuid",
  "name": "My MCP Token",
  "rawToken": "cdc_a1b2c3d4e5f6...",
  "tokenPrefix": "cdc_ab12",
  "scopes": ["builds:read", "wiki:read"],
  "expiresAt": null,
  "createdAt": 1746259200
}
```

> **Important:** The `rawToken` field is only returned once, at creation time. Store it securely — it cannot be retrieved again.

#### `GET /api/tokens/[id]`

Returns details for a specific token. Requires session auth. Token must belong to the authenticated user.

**Response:**
```json
{
  "id": "uuid",
  "name": "My MCP Token",
  "tokenPrefix": "cdc_ab12",
  "scopes": ["builds:read", "wiki:read"],
  "expiresAt": null,
  "lastUsedAt": "2026-05-03T10:00:00Z",
  "createdAt": 1746259200
}
```

#### `DELETE /api/tokens/[id]`

Revokes a token. Requires session auth. Token must belong to the authenticated user.

**Response:**
```json
{ "success": true }
```

Revocation sets `revokedAt` to the current Unix timestamp. The token becomes invalid immediately.

#### `GET /api/tokens/[id]/logs`

Returns paginated usage logs for a specific token. Requires session auth. Token must belong to the authenticated user.

**Query params:**
- `page` (default: 1)
- `pageSize` (default: 50, max: 100)

**Response:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "method": "GET",
      "path": "/api/builds",
      "statusCode": 200,
      "ipAddress": "203.0.113.42",
      "userAgent": "cyberdeck-mcp-server/1.0.0",
      "createdAt": 1746259200
    }
  ],
  "total": 142,
  "page": 1,
  "pageSize": 50
}
```

### Admin Endpoints

#### `GET /api/admin/tokens`

Returns all tokens across all users (including revoked tokens). Requires ADMIN (50) role.

**Query params:**
- `page` (default: 1)
- `pageSize` (default: 50, max: 100)
- `userId` (optional filter)

**Response:**
```json
{
  "tokens": [
    {
      "id": "uuid",
      "userId": "user-uuid",
      "name": "My MCP Token",
      "tokenPrefix": "cdc_ab12",
      "scopes": ["builds:read", "wiki:read"],
      "expiresAt": null,
      "lastUsedAt": "2026-05-03T10:00:00Z",
      "revokedAt": null,
      "createdAt": 1746259200,
      "ownerName": "Ada Lovelace",
      "ownerEmail": "ada@example.com"
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 50
}
```

#### `GET /api/admin/tokens/logs`

Returns paginated token usage logs across all tokens. Requires ADMIN (50) role.

**Query params:**
- `page` (default: 1)
- `pageSize` (default: 50, max: 100)
- `userId` (optional filter)
- `tokenId` (optional filter)

**Response:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "tokenId": "token-uuid",
      "tokenName": "My MCP Token",
      "userId": "user-uuid",
      "ownerName": "Ada Lovelace",
      "ownerEmail": "ada@example.com",
      "method": "GET",
      "path": "/api/builds",
      "statusCode": 200,
      "ipAddress": "203.0.113.42",
      "userAgent": "cyberdeck-mcp-server/1.0.0",
      "createdAt": 1746259200
    }
  ],
  "total": 1420,
  "page": 1,
  "pageSize": 50
}
```

---

## Authentication

Include the PAT in the `Authorization` header as a Bearer token:

```http
GET /api/builds HTTP/1.1
Host: cyberdeck.club
Authorization: Bearer cdc_a1b2c3d4e5f6...
```

**Example with curl:**
```bash
curl -X GET "https://cyberdeck.club/api/builds" \
  -H "Authorization: Bearer cdc_a1b2c3d4e5f6..." \
  -H "Content-Type: application/json"
```

---

## Security Model

### Token Storage

- Raw tokens are generated using `crypto.getRandomValues()` (32 bytes of cryptographically secure randomness)
- Only the SHA-256 hash of the raw token is stored in the database
- The first 8 characters (`tokenPrefix`) are stored separately for token identification in UIs
- Raw tokens are never stored server-side and cannot be retrieved after creation

### Scope Validation

Scopes are validated at two points:

1. **Token creation time:** The user's current role is checked against each scope's minimum requirement. If the user doesn't qualify for a requested scope, token creation fails with `400` and `invalidScopes` listed.

2. **Request time:** The user's current role is re-checked. If the user has been demoted since token creation, their effective scopes are narrowed to only those their current role permits. If all scopes are invalidated, the request is rejected with `403`.

### Session-Only Operations

Token management endpoints (`/api/tokens/*`) block PAT authentication. This prevents token-create-token chains and ensures that:
- Only the account owner can create or revoke tokens
- Auth changes (password, magic link) require session auth

### Usage Logging

Every PAT-authenticated request is logged with:
- Token ID and user ID
- HTTP method and request path
- Response status code
- Client IP address (from `CF-Connecting-IP`)
- User-Agent header
- Unix timestamp

Logs are written non-blocking via `waitUntil()` to avoid adding latency to API responses.

### Token Limits

- Maximum 10 active (non-revoked) tokens per user
- Tokens can optionally have an expiration timestamp
- Revoked tokens are marked with `revokedAt` and become invalid immediately

---

## Middleware Integration

PAT authentication is integrated into the site-wide middleware ([`src/middleware.ts`](src/middleware.ts)). The flow:

1. Check for `Authorization: Bearer cdc_...` header
2. If present, validate the PAT against the database
3. Check scope permissions for the requested route
4. Block session-only paths (`/api/tokens/*`, `/api/auth/*`)
5. Log usage non-blocking via `waitUntil()`
6. If no Bearer header, fall through to existing session cookie auth

**Scope enforcement:** The middleware uses a route-to-scope map in [`src/lib/token-scopes.ts`](src/lib/token-scopes.ts) to determine which scope is required for each API path + HTTP method. If the token lacks the required scope, the request returns `403` with details about the required vs granted scopes.

---

## Database Schema

See [`src/db/schema.ts`](src/db/schema.ts) for the full schema definitions.

### `personal_access_tokens`

| Column | Type | Description |
|--------|------|-------------|
| `id` | text (UUID) | Primary key |
| `user_id` | text (FK) | References `user.id` |
| `name` | text | User-chosen label |
| `token_hash` | text | SHA-256 hash of raw token (indexed) |
| `token_prefix` | text | First 8 chars of raw token |
| `scopes` | text (JSON) | Array of scope strings, e.g. `["builds:read"]` |
| `expires_at` | text (ISO 8601) | Expiration timestamp or null |
| `last_used_at` | text (ISO 8601) | Last usage timestamp |
| `revoked_at` | text (ISO 8601) | Revocation timestamp or null |
| `created_at` | integer | Unix timestamp (seconds) |

### `pat_usage_logs`

| Column | Type | Description |
|--------|------|-------------|
| `id` | text (UUID) | Primary key |
| `token_id` | text (FK) | References `personal_access_tokens.id` |
| `user_id` | text (FK) | References `user.id` |
| `method` | text | HTTP method (GET, POST, etc.) |
| `path` | text | Request path |
| `status_code` | integer | HTTP response status |
| `ip_address` | text | Client IP address |
| `user_agent` | text | Request User-Agent header |
| `created_at` | integer | Unix timestamp (seconds) |

---

## Reference

- [`src/lib/token-scopes.ts`](src/lib/token-scopes.ts) — Scope definitions and route-to-scope mapping
- [`src/lib/pat-auth.ts`](src/lib/pat-auth.ts) — Token generation, validation, and usage logging
- [`src/middleware.ts`](src/middleware.ts) — PAT auth middleware integration
- [`plans/PAT-MCP-SERVER-DESIGN.md`](plans/PAT-MCP-SERVER-DESIGN.md) — Full design document
