import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  //Package,
  Warehouse,
  Truck,
  ShoppingCart,
  BarChart3,
  Settings,
  HelpCircle,
  Boxes,
} from "lucide-react";
import { cn } from "@/lib/cn";

// ─── Sidebar Navigation ───
// WHY a separate component? Every protected page needs this sidebar.
// By extracting it, we write it once and reuse it in AppLayout.

/** Each link in the sidebar menu. */
const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/inventory", label: "Inventory", icon: Warehouse },
  { to: "/sales-orders", label: "Orders", icon: ShoppingCart },
  { to: "/suppliers", label: "Shipments", icon: Truck },
  { to: "/products", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/users", label: "Support", icon: HelpCircle },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside
      className="sidebar-dark"
      style={{
        width: 240,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid #1e2d4a",
        background: "#0b1120",
        height: "100vh",
        flexShrink: 0,
      }}
    >
      {/* ── Logo ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "24px 24px 20px",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "linear-gradient(135deg, #6366f1, #818cf8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Boxes size={20} color="#ffffff" />
        </div>
        <span
          style={{
            fontSize: "1.125rem",
            fontWeight: 700,
            color: "#e8edf5",
            letterSpacing: "-0.02em",
          }}
        >
          InventoHub
        </span>
      </div>

      {/* ── Navigation Links ── */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive =
              location.pathname === to ||
              location.pathname.startsWith(to + "/");

            return (
              <li key={to}>
                <NavLink
                  to={to}
                  className={cn("sidebar-nav-link")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 16px",
                    borderRadius: 12,
                    fontSize: "0.875rem",
                    fontWeight: isActive ? 600 : 500,
                    textDecoration: "none",
                    transition: "all 0.2s ease",
                    color: isActive ? "#e8edf5" : "#5a6a8a",
                    background: isActive
                      ? "linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(99, 102, 241, 0.08))"
                      : "transparent",
                    borderLeft: isActive ? "3px solid #6366f1" : "3px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "rgba(99, 102, 241, 0.08)";
                      e.currentTarget.style.color = "#8896b3";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#5a6a8a";
                    }
                  }}
                >
                  <Icon
                    size={20}
                    style={{
                      flexShrink: 0,
                      color: isActive ? "#818cf8" : "inherit",
                    }}
                  />
                  <span>{label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
