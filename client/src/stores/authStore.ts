import { create } from "zustand";
import api from "@/lib/api";
import type { User } from "@/types/api.types";

// ─── Auth Store ───
// WHY? The logged-in user's info is needed in many places (Topbar, Sidebar,
// ProtectedRoute, permission checks). Zustand makes it available globally
// without passing props through every component.

interface AuthState {
  user: User | null; // null = not logged in
  isLoading: boolean; // true while checking session on page load

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true, // starts true — we check the session before rendering

  // ── Log in ──
  login: async (email, password) => {
    const res = await api.post("/api/auth/login", { email, password });
    set({ user: res.data.data.user });
  },

  // ── Log out ──
  logout: async () => {
    await api.post("/api/auth/logout");
    set({ user: null });
  },

  // ── Check session on page load / refresh ──
  // Called once in ProtectedRoute to see if the cookie is still valid.
  fetchUser: async () => {
    try {
      const res = await api.get("/api/auth/me");
      set({ user: res.data.data.user, isLoading: false });
    } catch {
      set({ user: null, isLoading: false });
    }
  },
}));

export default useAuthStore;
