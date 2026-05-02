import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

// ─── App Layout ───
// WHY? Every page inside the app (Dashboard, Products, etc.) needs the same
// Sidebar + Topbar. Instead of repeating them in every page, we wrap all
// protected routes in this layout. The <Outlet /> renders the current page.
//
// USAGE (in App.tsx):
//   <Route element={<AppLayout />}>
//     <Route path="/dashboard" element={<Dashboard />} />
//     <Route path="/products" element={<Products />} />
//   </Route>

export default function AppLayout() {
  return (
    <div className="flex h-screen" style={{ background: "#0b1120" }}>
      {/* Left — Sidebar navigation */}
      <Sidebar />

      {/* Right — Topbar + page content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto" style={{ background: "#0f1729" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
