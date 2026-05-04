/**
 * PAT (Personal Access Token) scope definitions and route mapping.
 *
 * Scopes follow a `resource:action` pattern and map to the API surface
 * at `src/pages/api/`. Each scope has a minimum role requirement — the
 * user's role must meet this level both at token creation AND at request
 * time (scopes never escalate beyond the user's actual role).
 *
 * @see plans/PAT-MCP-SERVER-DESIGN.md §2 for full design rationale
 */

import { ROLES, getRoleLevel } from "./roles";

// ---------------------------------------------------------------------------
// Scope constants
// ---------------------------------------------------------------------------

export const TOKEN_SCOPES = {
  "builds:read": { label: "Read builds", description: "View builds and build details", minRole: ROLES.VISITOR },
  "builds:write": { label: "Create/edit builds", description: "Submit, edit, and comment on builds", minRole: ROLES.MEMBER },
  "wiki:read": { label: "Read wiki", description: "View wiki articles and history", minRole: ROLES.VISITOR },
  "wiki:write": { label: "Create/edit wiki", description: "Create and edit wiki articles", minRole: ROLES.MAKER },
  "forum:read": { label: "Read forum", description: "View forum threads and posts", minRole: ROLES.VISITOR },
  "forum:write": { label: "Create/reply forum", description: "Create threads and reply to posts", minRole: ROLES.MAKER },
  "meetups:read": { label: "Read meetups", description: "View meetup listings", minRole: ROLES.VISITOR },
  "meetups:write": { label: "Create meetups", description: "Create and manage meetup events", minRole: ROLES.TRUSTED_MAKER },
  "profile:read": { label: "Read your profile", description: "View your profile information", minRole: ROLES.MEMBER },
  "profile:write": { label: "Edit your profile", description: "Update your profile and settings", minRole: ROLES.MEMBER },
  "moderation:read": { label: "View mod queue", description: "View the build moderation queue", minRole: ROLES.TRUSTED_MAKER },
  "moderation:write": { label: "Approve/reject builds", description: "Approve or reject builds in the mod queue", minRole: ROLES.TRUSTED_MAKER },
  "admin:read": { label: "Admin read access", description: "View admin panels and user data", minRole: ROLES.ADMIN },
  "admin:write": { label: "Admin write access", description: "Modify roles, ban users, manage site", minRole: ROLES.ADMIN },
  "*": { label: "Full access", description: "Unrestricted access to all API endpoints", minRole: ROLES.MEMBER },
} as const;

export type TokenScope = keyof typeof TOKEN_SCOPES;

/** All valid scope string values */
const VALID_SCOPE_SET = new Set<string>(Object.keys(TOKEN_SCOPES));

// ---------------------------------------------------------------------------
// Scope validation helpers
// ---------------------------------------------------------------------------

/** Check if a string is a valid scope key */
export function isValidScope(scope: string): scope is TokenScope {
  return VALID_SCOPE_SET.has(scope);
}

/**
 * Check if a token's scopes array includes the required scope.
 * The global `*` scope grants access to everything.
 */
export function hasScope(tokenScopes: string[], requiredScope: TokenScope): boolean {
  if (tokenScopes.includes("*")) return true;
  return tokenScopes.includes(requiredScope);
}

/**
 * Filter scopes to only those the user's role qualifies for.
 * Used to show available scopes in the token creation UI.
 */
export function getAvailableScopes(userRole: string | null | undefined): TokenScope[] {
  const level = getRoleLevel(userRole);
  return (Object.entries(TOKEN_SCOPES) as Array<[TokenScope, typeof TOKEN_SCOPES[TokenScope]]>)
    .filter(([, config]) => level >= config.minRole)
    .map(([scope]) => scope);
}

/**
 * Validate that every scope in the array is valid AND the user's role
 * meets the minimum requirement for each scope.
 *
 * Used at token creation time and again at request time.
 */
export function validateScopesForRole(
  scopes: string[],
  userRole: string | null | undefined
): { valid: boolean; invalidScopes: string[] } {
  const level = getRoleLevel(userRole);
  const invalidScopes: string[] = [];

  for (const scope of scopes) {
    if (!isValidScope(scope)) {
      invalidScopes.push(scope);
      continue;
    }
    if (level < TOKEN_SCOPES[scope].minRole) {
      invalidScopes.push(scope);
    }
  }

  return { valid: invalidScopes.length === 0, invalidScopes };
}

/**
 * Return all scope metadata for display in the settings UI.
 */
export function getAllScopes(): Array<{
  value: TokenScope;
  label: string;
  description: string;
  minRole: number;
}> {
  return (Object.entries(TOKEN_SCOPES) as Array<[TokenScope, typeof TOKEN_SCOPES[TokenScope]]>)
    .map(([value, config]) => ({
      value,
      label: config.label,
      description: config.description,
      minRole: config.minRole,
    }));
}

// ---------------------------------------------------------------------------
// Route-to-scope mapping
// ---------------------------------------------------------------------------

/**
 * Maps API route patterns + HTTP methods to the scope required for access.
 * Order matters — more specific patterns must come before general ones so
 * that e.g. `/api/builds/[slug]/review` matches `moderation:write` before
 * the generic `/api/builds` matches `builds:write`.
 */
const ROUTE_SCOPE_MAP: Array<{
  pattern: RegExp;
  method: string;
  scope: TokenScope;
}> = [
    // Build moderation (must precede generic builds)
    { pattern: /^\/api\/builds\/[^/]+\/review$/, method: "POST", scope: "moderation:write" },

    // Admin — moderation queue read (must precede generic admin)
    { pattern: /^\/api\/admin\/builds(\/|$)/, method: "GET", scope: "moderation:read" },

    // Builds
    { pattern: /^\/api\/builds(\/|$)/, method: "GET", scope: "builds:read" },
    { pattern: /^\/api\/builds(\/|$)/, method: "POST", scope: "builds:write" },
    { pattern: /^\/api\/builds(\/|$)/, method: "PATCH", scope: "builds:write" },
    { pattern: /^\/api\/builds(\/|$)/, method: "DELETE", scope: "builds:write" },

    // Wiki
    { pattern: /^\/api\/wiki(\/|$)/, method: "GET", scope: "wiki:read" },
    { pattern: /^\/api\/wiki(\/|$)/, method: "POST", scope: "wiki:write" },
    { pattern: /^\/api\/wiki(\/|$)/, method: "PATCH", scope: "wiki:write" },
    { pattern: /^\/api\/wiki(\/|$)/, method: "DELETE", scope: "wiki:write" },

    // Forum
    { pattern: /^\/api\/forum(\/|$)/, method: "GET", scope: "forum:read" },
    { pattern: /^\/api\/forum(\/|$)/, method: "POST", scope: "forum:write" },
    { pattern: /^\/api\/forum(\/|$)/, method: "PATCH", scope: "forum:write" },
    { pattern: /^\/api\/forum(\/|$)/, method: "DELETE", scope: "forum:write" },

    // Meetups
    { pattern: /^\/api\/meetups(\/|$)/, method: "GET", scope: "meetups:read" },
    { pattern: /^\/api\/meetups(\/|$)/, method: "POST", scope: "meetups:write" },
    { pattern: /^\/api\/meetups(\/|$)/, method: "PATCH", scope: "meetups:write" },
    { pattern: /^\/api\/meetups(\/|$)/, method: "DELETE", scope: "meetups:write" },

    // Profile
    { pattern: /^\/api\/users\/me$/, method: "GET", scope: "profile:read" },
    { pattern: /^\/api\/users\/me$/, method: "PATCH", scope: "profile:write" },

    // Admin (generic — after moderation-specific patterns)
    { pattern: /^\/api\/admin(\/|$)/, method: "GET", scope: "admin:read" },
    { pattern: /^\/api\/admin(\/|$)/, method: "POST", scope: "admin:write" },
    { pattern: /^\/api\/admin(\/|$)/, method: "PATCH", scope: "admin:write" },
    { pattern: /^\/api\/admin(\/|$)/, method: "DELETE", scope: "admin:write" },
  ];

/**
 * Determine the scope required for a given HTTP method + API path.
 * Returns `null` if the route doesn't require PAT scope validation
 * (e.g. public routes, non-API routes, auth routes).
 */
export function getRequiredScope(method: string, path: string): TokenScope | null {
  const upperMethod = method.toUpperCase();
  const match = ROUTE_SCOPE_MAP.find(
    (r) => r.method === upperMethod && r.pattern.test(path)
  );
  return match?.scope ?? null;
}
