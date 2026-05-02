import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import useAuthStore from "@/stores/authStore";

// ─── Protected Route ───
// WHY? Certain parts of the app (Dashboard, Products, etc.) should only be
// accessible to authenticated users. This component:
//   1. On mount → calls fetchUser() (hits GET /api/users/me) to check the session.
//   2. While loading → shows a centered spinner.
//   3. If the user is null → redirects to /login.
//   4. If the user exists → renders the child routes via <Outlet />.
//
// USAGE (in App.tsx):
//   <Route element={<ProtectedRoute />}>
//     <Route element={<AppLayout />}>
//       <Route path="/dashboard" element={<Dashboard />} />
//     </Route>
//   </Route>

export default function ProtectedRoute() {
    const user = useAuthStore((s) => s.user);
    const isLoading = useAuthStore((s) => s.isLoading);
    const fetchUser = useAuthStore((s) => s.fetchUser);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    // ── Loading state ──
    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-surface-alt">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                    <p className="text-sm font-medium text-text-muted">
                        Loading your workspace…
                    </p>
                </div>
            </div>
        );
    }

    // ── Not authenticated ──
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // ── Authenticated — render child routes ──
    return <Outlet />;
}
