// ─── Role Constants ───
// Use these instead of hardcoded strings like "admin" or "manager"
// WHY? If a role name changes, you update it in ONE place, not everywhere.

export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  STAFF: "staff",
} as const;

// This creates a type: "admin" | "manager" | "staff"
export type UserRole = (typeof ROLES)[keyof typeof ROLES];
