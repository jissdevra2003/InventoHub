import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Store,
  Package,
  Warehouse,
  Truck,
  ShoppingCart,
  Receipt,
  Users,
  Settings,
  Boxes,
  ChevronLeft,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

// ─── Sidebar Navigation ───
// WHY a separate component? Every protected page needs this sidebar.
// By extracting it, we write it once and reuse it in AppLayout.

/** Each link in the sidebar menu. */
const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/shops", label: "Shops", icon: Store },
  { to: "/products", label: "Products", icon: Package },
  { to: "/inventory", label: "Inventory", icon: Warehouse },
  { to: "/suppliers", label: "Suppliers", icon: Truck },
  { to: "/purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
  { to: "/sales-orders", label: "Sales Orders", icon: Receipt },
  { to: "/users", label: "Users", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-border bg-surface transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-600">
          <Boxes className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight text-text-primary">
            InventoHub
          </span>
        )}
      </div>

      {/* ── Navigation Links ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive =
              location.pathname === to ||
              location.pathname.startsWith(to + "/");

            return (
              <li key={to}>
                <NavLink
                  to={to}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary-50 text-primary-700 shadow-sm"
                      : "text-text-secondary hover:bg-primary-50/50 hover:text-primary-600"
                  )}
                >
                  <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary-600")} />
                  {!collapsed && <span>{label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Collapse Toggle ── */}
      <div className="border-t border-border px-3 py-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-xl p-2 text-text-muted transition-colors hover:bg-primary-50 hover:text-primary-600"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className={cn(
              "h-5 w-5 transition-transform duration-300",
              collapsed && "rotate-180"
            )}
          />
        </button>
      </div>
    </aside>
  );
}
