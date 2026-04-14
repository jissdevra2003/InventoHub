import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    Package,
    Store,
    AlertTriangle,
    DollarSign,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    Loader2,
} from "lucide-react";

import api from "../lib/api";
import useAuthStore from "../stores/authStore";

// ─── Types ──────────────────────────────────────────────
interface DashboardStats {
    totalProducts: number;
    totalShops: number;
    lowStockCount: number;
    todaySales: {
        revenue: number;
        orders: number;
    };
    recentActivity: ActivityItem[];
}

interface ActivityItem {
    _id: string;
    change_type: "purchase_order" | "sales_order" | "adjustment" | "transfer" | "initial";
    quantity_changed: number;
    reason?: string;
    createdAt: string;
    product_id?: { name: string; sku: string };
    shop_id?: { name: string };
    user_id?: { name: string; email: string };
}


// ─── Stat Card ──────────────────────────────────────────
function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
    color,
    delay = 0,
}: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ElementType;
    color: "indigo" | "emerald" | "amber" | "sky";
    delay?: number;
}) {
    const palette = {
        indigo: {
            bg: "bg-primary-50",
            icon: "text-primary-600",
            ring: "ring-primary-100",
        },
        emerald: {
            bg: "bg-emerald-50",
            icon: "text-emerald-600",
            ring: "ring-emerald-100",
        },
        amber: {
            bg: "bg-amber-50",
            icon: "text-amber-600",
            ring: "ring-amber-100",
        },
        sky: {
            bg: "bg-sky-50",
            icon: "text-sky-600",
            ring: "ring-sky-100",
        },
    }[color];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
            className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
        >
            {/* Decorative gradient in top-right corner */}
            <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full ${palette.bg} opacity-60 blur-2xl transition-opacity group-hover:opacity-100`} />

            <div className="relative flex items-start justify-between">
                <div className="space-y-3">
                    <p className="text-sm font-medium text-text-muted">{title}</p>
                    <p className="text-3xl font-bold tracking-tight text-text-primary">
                        {value}
                    </p>
                    {subtitle && (
                        <p className="text-xs text-text-muted">{subtitle}</p>
                    )}
                </div>
                <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${palette.bg} ring-4 ${palette.ring} transition-transform group-hover:scale-110`}
                >
                    <Icon className={`h-6 w-6 ${palette.icon}`} />
                </div>
            </div>
        </motion.div>
    );
}


// ─── Activity Badge ─────────────────────────────────────
function ActivityBadge({ type }: { type: string }) {
    const config: Record<string, { label: string; class: string }> = {
        purchase_order: {
            label: "Purchase",
            class: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        },
        sales_order: {
            label: "Sale",
            class: "bg-sky-50 text-sky-700 ring-sky-200",
        },
        adjustment: {
            label: "Adjustment",
            class: "bg-amber-50 text-amber-700 ring-amber-200",
        },
        transfer: {
            label: "Transfer",
            class: "bg-purple-50 text-purple-700 ring-purple-200",
        },
        initial: {
            label: "Initial",
            class: "bg-gray-50 text-gray-700 ring-gray-200",
        },
    };

    const c = config[type] || config.initial;

    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${c.class}`}
        >
            {c.label}
        </span>
    );
}


// ─── Format helpers ─────────────────────────────────────
function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}


// ────────────────────────────────────────────────────────
// MAIN DASHBOARD PAGE
// ────────────────────────────────────────────────────────

export default function Dashboard() {
    const user = useAuthStore((s) => s.user);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchStats() {
            try {
                setLoading(true);
                const res = await api.get("/api/dashboard/stats");
                setStats(res.data.data);
            } catch (err: any) {
                setError(
                    err?.response?.data?.message || "Failed to load dashboard data"
                );
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);


    // ── Loading state ──
    if (loading) {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                    <p className="text-sm text-text-muted">Loading dashboard…</p>
                </div>
            </div>
        );
    }

    // ── Error state ──
    if (error) {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <div className="max-w-sm rounded-2xl border border-error/30 bg-error-light p-6 text-center">
                    <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-error" />
                    <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
            </div>
        );
    }

    const data = stats!;

    return (
        <div className="space-y-8 p-6 lg:p-8">

            {/* ── Welcome Header ── */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
                    Welcome back, {user?.name?.split(" ")[0] || "there"} 👋
                </h1>
                <p className="mt-1 text-sm text-text-muted">
                    Here's what's happening with your inventory today.
                </p>
            </motion.div>


            {/* ── Stat Cards ── */}
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Total Products"
                    value={data.totalProducts}
                    subtitle="Active catalog items"
                    icon={Package}
                    color="indigo"
                    delay={0}
                />
                <StatCard
                    title="Total Shops"
                    value={data.totalShops}
                    subtitle="Locations managed"
                    icon={Store}
                    color="emerald"
                    delay={0.1}
                />
                <StatCard
                    title="Low Stock Alerts"
                    value={data.lowStockCount}
                    subtitle="Items below threshold"
                    icon={AlertTriangle}
                    color="amber"
                    delay={0.2}
                />
                <StatCard
                    title="Today's Sales"
                    value={formatCurrency(data.todaySales.revenue)}
                    subtitle={`${data.todaySales.orders} order${data.todaySales.orders !== 1 ? "s" : ""} today`}
                    icon={DollarSign}
                    color="sky"
                    delay={0.3}
                />
            </div>


            {/* ── Recent Activity ── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="rounded-2xl border border-border bg-surface shadow-sm"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <div className="flex items-center gap-2.5">
                        <Clock className="h-5 w-5 text-text-muted" />
                        <h2 className="text-base font-semibold text-text-primary">
                            Recent Activity
                        </h2>
                    </div>
                    <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-600">
                        Last 10
                    </span>
                </div>

                {/* Activity list */}
                {data.recentActivity.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <TrendingUp className="mx-auto mb-3 h-8 w-8 text-text-muted" />
                        <p className="text-sm text-text-muted">
                            No activity yet. Start by adding products and managing stock!
                        </p>
                    </div>
                ) : (
                    <ul className="divide-y divide-border">
                        {data.recentActivity.map((item, idx) => (
                            <motion.li
                                key={item._id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.25, delay: 0.45 + idx * 0.05 }}
                                className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-surface-alt"
                            >
                                {/* Quantity indicator */}
                                <div
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                        item.quantity_changed >= 0
                                            ? "bg-emerald-50 text-emerald-600"
                                            : "bg-red-50 text-red-600"
                                    }`}
                                >
                                    {item.quantity_changed >= 0 ? (
                                        <ArrowUpRight className="h-4 w-4" />
                                    ) : (
                                        <ArrowDownRight className="h-4 w-4" />
                                    )}
                                </div>

                                {/* Description */}
                                <div className="flex-1 min-w-0">
                                    <p className="truncate text-sm font-medium text-text-primary">
                                        {item.product_id?.name || "Unknown product"}
                                        {item.product_id?.sku && (
                                            <span className="ml-2 text-xs text-text-muted">
                                                #{item.product_id.sku}
                                            </span>
                                        )}
                                    </p>
                                    <p className="truncate text-xs text-text-muted">
                                        {item.shop_id?.name || "—"} • by {item.user_id?.name || "System"}
                                        {item.reason && ` • ${item.reason}`}
                                    </p>
                                </div>

                                {/* Badge + qty + time */}
                                <div className="flex shrink-0 items-center gap-3">
                                    <ActivityBadge type={item.change_type} />
                                    <span
                                        className={`w-16 text-right text-sm font-semibold ${
                                            item.quantity_changed >= 0
                                                ? "text-emerald-600"
                                                : "text-red-600"
                                        }`}
                                    >
                                        {item.quantity_changed >= 0 ? "+" : ""}
                                        {item.quantity_changed}
                                    </span>
                                    <span className="w-14 text-right text-xs text-text-muted">
                                        {timeAgo(item.createdAt)}
                                    </span>
                                </div>
                            </motion.li>
                        ))}
                    </ul>
                )}
            </motion.div>
        </div>
    );
}
