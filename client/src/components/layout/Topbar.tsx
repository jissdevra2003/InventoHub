import { Bell, User as UserIcon } from "lucide-react";
import useAuthStore from "@/stores/authStore";

// ─── Top Bar ───
// WHY? Displays the logged-in user's name/role and provides quick actions
// like logout and notifications. Stays consistent across all pages.

export default function Topbar() {
  const { user } = useAuthStore();

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "12px 32px",
        borderBottom: "1px solid #1e2d4a",
        background: "#0f1729",
        gap: 12,
        flexShrink: 0,
      }}
    >
      {/* Notification bell */}
      <button
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 8,
          borderRadius: 10,
          color: "#5a6a8a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "color 0.2s ease",
        }}
        aria-label="Notifications"
        onMouseEnter={(e) => { e.currentTarget.style.color = "#8896b3"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "#5a6a8a"; }}
      >
        <Bell size={20} />
      </button>

      {/* User avatar + name */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <button
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6366f1, #818cf8)",
            border: "2px solid #1e2d4a",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            transition: "border-color 0.2s ease",
          }}
          aria-label="User profile"
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#6366f1"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1e2d4a"; }}
        >
          <UserIcon size={16} color="#ffffff" />
        </button>
        <span
          style={{
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "#e8edf5",
          }}
        >
          {user?.name || "User"}
        </span>
      </div>
    </header>
  );
}

