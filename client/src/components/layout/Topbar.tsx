import { LogOut, Bell, User as UserIcon } from "lucide-react";
import useAuthStore from "@/stores/authStore";
import { cn } from "@/lib/cn";

// ─── Top Bar ───
// WHY? Displays the logged-in user's name/role and provides quick actions
// like logout and notifications. Stays consistent across all pages.

export default function Topbar() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Even if the API call fails, clear local state
      window.location.href = "/login";
    }
  }

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
      {/* Left side — can be used for breadcrumbs or page title later */}
      <div />

      {/* Right side — user info + actions */}
      <div className="flex items-center gap-3">
        {/* Notification bell (placeholder for now) */}
        <button
          className="relative rounded-xl p-2 text-text-muted transition-colors hover:bg-primary-50 hover:text-primary-600"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>

        {/* User info */}
        <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-2">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full",
              "bg-primary-100 text-primary-600"
            )}
          >
            <UserIcon className="h-4 w-4" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-text-primary">
              {user?.name || "User"}
            </p>
            <p className="text-xs text-text-muted capitalize">
              {user?.isSuperAdmin ? "Owner" : user?.builtInRole || "User"}
            </p>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="rounded-xl p-2 text-text-muted transition-colors hover:bg-red-50 hover:text-error"
          aria-label="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
