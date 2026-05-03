/**
 * Role-based access control system for cyberdeck.club.
 *
 * Better Auth uses string roles stored in the database.
 * This module maps string roles to numeric levels for hierarchical permission checks.
 *
 * IMPORTANT: Always use >= comparison via requireRole(). NEVER use === to check roles.
 * Higher roles inherit all permissions of lower roles.
 */

export const ROLES = {
  VISITOR: 0,
  MEMBER: 10,
  MAKER: 20,
  TRUSTED_MAKER: 30,
  MODERATOR: 40,
  ADMIN: 50,
} as const;

export type RoleLevel = (typeof ROLES)[keyof typeof ROLES];
export type RoleName = keyof typeof ROLES;

// Map string role values (from DB) to numeric levels
const ROLE_STRING_TO_LEVEL: Record<string, RoleLevel> = {
  member: ROLES.MEMBER,
  maker: ROLES.MAKER,
  trusted_maker: ROLES.TRUSTED_MAKER,
  moderator: ROLES.MODERATOR,
  admin: ROLES.ADMIN,
};

/**
 * Convert a string role (from Better Auth) to a numeric level.
 * Returns VISITOR (0) for unknown/null roles.
 */
export function getRoleLevel(role: string | null | undefined): RoleLevel {
  if (!role) return ROLES.VISITOR;
  return ROLE_STRING_TO_LEVEL[role] ?? ROLES.VISITOR;
}

/**
 * Check if a user's role meets the minimum required level.
 * ALWAYS uses >= comparison — higher roles inherit lower permissions.
 */
export function requireRole(
  userRole: string | null | undefined,
  minRole: RoleLevel
): boolean {
  return getRoleLevel(userRole) >= minRole;
}

/**
 * Get the display name for a role string.
 * Returns the highest role name that the level qualifies for.
 */
export function getRoleName(role: string | null | undefined): RoleName {
  const level = getRoleLevel(role);
  const entries = Object.entries(ROLES) as [RoleName, number][];
  const match = entries
    .filter(([, v]) => v <= level)
    .sort(([, a], [, b]) => b - a)[0];
  return match?.[0] ?? "VISITOR";
}

/**
 * Check if a role string represents a valid role.
 */
export function isValidRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return role in ROLE_STRING_TO_LEVEL;
}

/**
 * All valid role string values.
 */
export const VALID_ROLES = Object.keys(ROLE_STRING_TO_LEVEL) as string[];