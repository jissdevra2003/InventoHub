import "./Dashboard.css";
import { motion } from "framer-motion";
import {
    Package,
    DollarSign,
    TrendingUp,
    AlertTriangle,
    Info,
} from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";


// ─── Dummy Data ─────────────────────────────────────────

const statsData = [
    {
        title: "Total Stock",
        value: "14,352",
        unit: "units",
        change: "+3.1%",
        positive: true,
        icon: Package,
        color: "#6366f1",      // indigo
        bgColor: "#6366f115",
    },
    {
        title: "Stock Value",
        value: "$892,104",
        unit: "",
        change: "+1.2%",
        positive: true,
        icon: DollarSign,
        color: "#10b981",      // emerald
        bgColor: "#10b98115",
    },
    {
        title: "Revenue (MTD)",
        value: "$56,780",
        unit: "",
        change: "+15.8%",
        positive: true,
        icon: TrendingUp,
        color: "#f43f5e",      // rose
        bgColor: "#f43f5e15",
    },
    {
        title: "Low Stock Alerts",
        value: "28",
        unit: "items",
        change: "-3 items",
        positive: false,
        icon: AlertTriangle,
        color: "#a855f7",      // purple
        bgColor: "#a855f715",
    },
];

// Generate 30 days of chart data
const chartData = Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    const baseOrders = 800 + Math.sin(day * 0.3) * 400 + Math.random() * 200;
    const baseUnits = 1200 + Math.sin(day * 0.25) * 600 + Math.random() * 300;
    return {
        day: day.toString(),
        orders: Math.round(baseOrders),
        units: Math.round(baseUnits),
    };
});

// Special points
chartData[9] = { day: "10", orders: 1800, units: 2450 };
chartData[16] = { day: "17", orders: 1600, units: 2200 };
chartData[24] = { day: "25", orders: 1900, units: 2450 };

const stockMovements = [
    {
        id: "1",
        itemName: "UltraWidget Pro",
        sku: "SK-401",
        type: "Inbound",
        quantity: "+Wh-A",
        quantityNum: 500,
        date: "28 Oct 2023 10:46 AM",
        status: "Received",
        statusColor: "#10b981",
    },
    {
        id: "2",
        itemName: "NeoGadget X",
        sku: "SK-402",
        type: "Outbound",
        quantity: "-120",
        quantityNum: -120,
        date: "28 Oct 2023 10:43 AM",
        status: "Shipped",
        statusColor: "#f59e0b",
    },
    {
        id: "3",
        itemName: "UltraWidget Pro",
        sku: "SK-403",
        type: "Outbound",
        quantity: "-120",
        quantityNum: -120,
        date: "28 Oct 2023 10:33 AM",
        status: "Shipped",
        statusColor: "#f59e0b",
    },
];


// ─── Custom Tooltip ─────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="chart-tooltip">
            <p className="chart-tooltip-label">Day {label}</p>
            {payload.map((entry: any, idx: number) => (
                <p key={idx} className="chart-tooltip-value" style={{ color: entry.color }}>
                    {entry.name}: {entry.value.toLocaleString()}
                </p>
            ))}
        </div>
    );
}


// ─── Stat Card ──────────────────────────────────────────

function StatCard({
    title,
    value,
    unit,
    change,
    positive,
    icon: Icon,
    color,
    bgColor,
    delay = 0,
}: {
    title: string;
    value: string;
    unit: string;
    change: string;
    positive: boolean;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: "easeOut" }}
            className="dashboard-stat-card"
        >
            <div className="stat-card-header">
                <div
                    className="stat-card-icon"
                    style={{ backgroundColor: bgColor, color }}
                >
                    <Icon size={20} />
                </div>
                <button className="stat-card-info" aria-label={`Info about ${title}`}>
                    <Info size={16} />
                </button>
            </div>
            <div className="stat-card-body">
                <p className="stat-card-title">{title}</p>
                <div className="stat-card-value-row">
                    <span className="stat-card-value">{value}</span>
                    {unit && <span className="stat-card-unit">{unit}</span>}
                </div>
                <span
                    className="stat-card-change"
                    style={{ color: positive ? "#10b981" : "#f43f5e" }}
                >
                    {change}
                </span>
            </div>
        </motion.div>
    );
}


// ─── Status Badge ───────────────────────────────────────

function StatusBadge({ status, color }: { status: string; color: string }) {
    return (
        <span
            className="status-badge"
            style={{
                backgroundColor: `${color}18`,
                color,
                border: `1px solid ${color}30`,
            }}
        >
            {status}
        </span>
    );
}


// ────────────────────────────────────────────────────────
// MAIN DASHBOARD PAGE
// ────────────────────────────────────────────────────────

export default function Dashboard() {
    return (
        <div className="dashboard-container">

            {/* ── Page Header ── */}
            <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="dashboard-header"
            >
                <h1 className="dashboard-title">Inventory Overview</h1>
            </motion.div>


            {/* ── Stat Cards ── */}
            <div className="stats-grid">
                {statsData.map((stat, idx) => (
                    <StatCard key={stat.title} {...stat} delay={idx * 0.1} />
                ))}
            </div>


            {/* ── Sales Velocity Chart ── */}
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="dashboard-card chart-card"
            >
                <div className="card-header">
                    <h2 className="card-title">Sales Velocity (Last 30 Days)</h2>
                    <span className="card-badge">Last today</span>
                </div>

                <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                            <defs>
                                <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="unitsGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="var(--chart-grid)"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="day"
                                stroke="var(--chart-axis)"
                                tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
                                tickLine={false}
                                axisLine={{ stroke: "var(--chart-grid)" }}
                                label={{ value: "Dates", position: "insideBottomRight", offset: -5, fill: "var(--chart-axis)", fontSize: 12 }}
                            />
                            <YAxis
                                stroke="var(--chart-axis)"
                                tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                                label={{ value: "Units", angle: -90, position: "insideLeft", offset: 0, fill: "var(--chart-axis)", fontSize: 12 }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                verticalAlign="top"
                                align="left"
                                iconType="circle"
                                iconSize={8}
                                wrapperStyle={{ paddingBottom: 16, fontSize: 13, color: "var(--chart-axis)" }}
                            />
                            <Line
                                type="monotone"
                                dataKey="orders"
                                name="Orders"
                                stroke="#6366f1"
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 6, strokeWidth: 2, fill: "#6366f1" }}
                            />
                            <Line
                                type="monotone"
                                dataKey="units"
                                name="Units"
                                stroke="#38bdf8"
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 6, strokeWidth: 2, fill: "#38bdf8" }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Peak Velocity Annotation */}
                <div className="chart-annotation" style={{ right: "18%", top: "28%" }}>
                    <div className="annotation-box">
                        <span className="annotation-label">Peak43 Velocity</span>
                        <span className="annotation-value">$2,450</span>
                    </div>
                </div>

                {/* Tontips Annotation */}
                <div className="chart-annotation" style={{ left: "35%", top: "48%" }}>
                    <div className="annotation-box">
                        <span className="annotation-label">Tontips</span>
                        <span className="annotation-value">$2,450</span>
                    </div>
                </div>
            </motion.div>


            {/* ── Recent Stock Movements ── */}
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="dashboard-card"
            >
                <div className="card-header">
                    <h2 className="card-title">Recent Stock Movements</h2>
                </div>

                <div className="table-wrapper">
                    <table className="movements-table">
                        <thead>
                            <tr>
                                <th>Item Name</th>
                                <th>SKU</th>
                                <th>Type</th>
                                <th>Quantity</th>
                                <th>Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stockMovements.map((movement) => (
                                <tr key={movement.id}>
                                    <td className="item-name-cell">{movement.itemName}</td>
                                    <td className="sku-cell">{movement.sku}</td>
                                    <td>
                                        <span className={`type-label ${movement.type === "Inbound" ? "type-inbound" : "type-outbound"}`}>
                                            {movement.type}
                                        </span>
                                    </td>
                                    <td>
                                        <span
                                            className="quantity-cell"
                                            style={{ color: movement.quantityNum >= 0 ? "#10b981" : "#f43f5e" }}
                                        >
                                            {movement.quantityNum >= 0 ? "+" : ""}{movement.quantityNum}
                                        </span>
                                    </td>
                                    <td className="date-cell">{movement.date}</td>
                                    <td>
                                        <StatusBadge status={movement.status} color={movement.statusColor} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
}
