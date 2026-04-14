import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import PlaceholderPage from "./pages/PlaceholderPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";

function App() {
  return (
    <Routes>
      {/* ── Public routes ── */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* ── Protected routes ── */}
      {/* ProtectedRoute checks the session (GET /api/users/me).
          If the user is not logged in → redirect to /login.
          If logged in → render the AppLayout shell with Sidebar + Topbar. */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/shops" element={<PlaceholderPage title="Shops" description="Manage your shops and store locations. Add, edit, and organize all your business locations." />} />
          <Route path="/products" element={<PlaceholderPage title="Products" description="View and manage your product catalog. Add new products, update pricing, and organize categories." />} />
          <Route path="/inventory" element={<PlaceholderPage title="Inventory" description="Track stock levels across all shops. Monitor quantities, set thresholds, and manage transfers." />} />
          <Route path="/suppliers" element={<PlaceholderPage title="Suppliers" description="Manage your supplier contacts and relationships. Track orders and payment history." />} />
          <Route path="/purchase-orders" element={<PlaceholderPage title="Purchase Orders" description="Create and track purchase orders. Manage procurement from your suppliers." />} />
          <Route path="/sales-orders" element={<PlaceholderPage title="Sales Orders" description="Process and track sales orders. Monitor revenue and order fulfillment." />} />
          <Route path="/users" element={<PlaceholderPage title="Users" description="Manage team members, roles, and permissions. Invite new users and control access." />} />
          <Route path="/settings" element={<PlaceholderPage title="Settings" description="Configure your account, business preferences, and application settings." />} />
        </Route>
      </Route>

      {/* ── Catch-all → redirect to login ── */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
