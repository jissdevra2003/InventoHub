import { create } from "zustand";
import api from "@/lib/api";
import type { User } from "@/types/api.types";

// ─── Auth Store ───
// WHY? The logged-in user's info is needed in many places (Topbar, Sidebar,
// ProtectedRoute, permission checks). Zustand makes it available globally
// without passing props through every component.

interface UpdateProfileData {
  username?: string;
  name?: string;
  phone?: string;
  address?: string;
  profile_image?: string;
}

interface AuthState {
  user: User | null; // null = not logged in
  isLoading: boolean; // true while checking session on page load

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
}

const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true, // starts true — we check the session before rendering

  // ── Log in ──
  login: async (email, password)=>{
    const res = await api.post("/api/users/login", { email, password });
    const { token, user } = res.data.data;
    if (token) {
      localStorage.setItem("token", token);
    }
    set({ user });
  },

  // ── Log out ──
  logout: async () => {
    try {
      await api.post("/api/users/logout");
    } finally {
      localStorage.removeItem("token");
      set({ user: null });
    }
  },

  // ── Check session on page load / refresh ──
  // Called once in ProtectedRoute to see if the cookie is still valid.
  fetchUser: async () => {
    try {
      const res = await api.get("/api/users/me");
      set({ user: res.data.data.user, isLoading: false });
    } catch {
      localStorage.removeItem("token");
      set({ user: null, isLoading: false });
    }
  },

  // ── Update own profile ──
  // Calls PATCH /api/users/update-me and merges the result into the store
  // so Topbar/Sidebar reflect changes immediately.
  updateProfile: async (data: UpdateProfileData) => {
    const res = await api.patch("/api/users/update-me", data);
    const updatedFields = res.data.data.user;
    const currentUser = get().user;
    if (currentUser) {
      set({ user: { ...currentUser, ...updatedFields } });
    }
  },
}));

export default useAuthStore;

