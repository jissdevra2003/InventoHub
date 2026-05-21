// ─── Shared TypeScript types for API data ───
// These match the shapes returned by the backend.
// WHY? A single source of truth — every component uses the same types.

import type { UserRole } from "./roles";

/** The logged-in user object returned by the auth endpoints. */
export interface User {
  _id: string;
  username: string;
  name: string;
  email: string;
  phone?: string;
  builtInRole?: UserRole;
  customRole?: string;
  permissions: string[];
  isSuperAdmin: boolean;
  assignedShops_id?: string[];
  market_id: string;
  profile_image?: string;
  address?: string;
  isActive: boolean;
  status: "invited" | "active" | "disabled";
}

/** A shop document from the backend. */
export interface Shop {
  _id: string;
  name: string;
  location?: string;
  market_id: string;
}

/** Standard API response wrapper (your backend wraps data in this shape). */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
