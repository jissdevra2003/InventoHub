import "./Inventory.css";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Package,
    PackageCheck,
    AlertTriangle,
    PackageX,
    Search,
    ChevronDown,
    Plus,
    Minus,
    X,
    Store,
} from "lucide-react";
import api from "../lib/api";
import useAuthStore from "../stores/authStore";

// ─── Types ─────────────────────────────────────────────────────
interface Shop {
    _id: string;
    name: string;
}

interface InventoryItem {
    productId: string;
    name: string;
    sku: string;
    selling_price: number;
    quantity: number;
    stock_status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
}

type StatusFilter = "ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

interface AdjustModal {
    type: "in" | "out";
    item: InventoryItem;
}


// ─── Stat Card ─────────────────────────────────────────────────
function StatCard({
    title,
    value,
    icon: Icon,
    color,
}: {
    title: string;
    value: number;
    icon: React.ElementType;
    color: string;
}) {
    return (
        <motion.div
            className="inventory-stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div
                className="inventory-stat-icon"
                style={{ background: `${color}15` }}
            >
                <Icon size={22} style={{ color }} />
            </div>
            <div className="inventory-stat-info">
                <h4>{title}</h4>
                <p>{value.toLocaleString()}</p>
            </div>
        </motion.div>
    );
}


// ─── Stock Adjustment Modal ────────────────────────────────────
function AdjustmentModal({
    modal,
    shopId,
    onClose,
    onSuccess,
}: {
    modal: AdjustModal;
    shopId: string;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [quantity, setQuantity] = useState("");
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit() {
        const qty = parseInt(quantity, 10);
        if (!qty || qty <= 0) {
            setError("Please enter a valid positive number");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const endpoint =
                modal.type === "in"
                    ? "/api/inventory/increase"
                    : "/api/inventory/decrease";
            await api.patch(endpoint, {
                shopId,
                productId: modal.item.productId,
                quantity: qty,
                reason: reason || undefined,
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(
                err?.response?.data?.message || "Failed to update stock."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <motion.div
            className="inv-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="inv-modal"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div>
                        <h3 className="inv-modal-title">
                            {modal.type === "in" ? "Stock In" : "Stock Out"}
                        </h3>
                        <p className="inv-modal-subtitle">{modal.item.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: "none",
                            border: "none",
                            color: "var(--dash-text-muted)",
                            cursor: "pointer",
                            padding: 4,
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Current stock */}
                <div className="inv-modal-current">
                    <span className="inv-modal-current-label">
                        Current Stock
                    </span>
                    <span className="inv-modal-current-value">
                        {modal.item.quantity}
                    </span>
                </div>

                {/* Quantity */}
                <div style={{ marginBottom: 16 }}>
                    <label className="inv-modal-label">
                        Quantity to {modal.type === "in" ? "add" : "remove"}
                    </label>
                    <input
                        type="number"
                        min={1}
                        className="inv-modal-input"
                        placeholder="Enter quantity"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        autoFocus
                    />
                </div>

                {/* Reason */}
                <div>
                    <label className="inv-modal-label">
                        Reason <span style={{ color: "var(--dash-text-muted)", fontWeight: 400 }}>(optional)</span>
                    </label>
                    <textarea
                        className="inv-modal-input inv-modal-textarea"
                        placeholder="e.g. Restocking from supplier"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    />
                </div>

                {/* Error */}
                {error && (
                    <p style={{ color: "#fb7185", fontSize: "0.8125rem", marginTop: 12 }}>
                        {error}
                    </p>
                )}

                {/* Actions */}
                <div className="inv-modal-actions">
                    <button className="inv-modal-btn cancel" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className={`inv-modal-btn ${modal.type === "in" ? "confirm-in" : "confirm-out"}`}
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading
                            ? "Updating…"
                            : modal.type === "in"
                                ? "Add Stock"
                                : "Remove Stock"}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}


// ═══════════════════════════════════════════════════════════════
// MAIN INVENTORY PAGE
// ═══════════════════════════════════════════════════════════════

export default function Inventory() {
    const user = useAuthStore((s) => s.user);

    // ── State ──
    const [shops, setShops] = useState<Shop[]>([]);
    const [selectedShopId, setSelectedShopId] = useState("");
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
    const [adjustModal, setAdjustModal] = useState<AdjustModal | null>(null);
    const [lowStockCount, setLowStockCount] = useState(0);

    // Can this user adjust stock? (Owner, Admin, Manager — not Staff)
    const canAdjust =
        user?.isSuperAdmin ||
        user?.builtInRole === "admin" ||
        user?.builtInRole === "manager";

    // ── Fetch shops on mount ──
    useEffect(() => {
        async function loadShops() {
            try {
                const res = await api.get("/api/shops");
                const shopList: Shop[] = res.data.data;
                setShops(shopList);
                if (shopList.length > 0) {
                    setSelectedShopId(shopList[0]._id);
                }
            } catch {
                setShops([]);
            }
        }
        loadShops();
    }, []);

    // ── Fetch inventory when shop changes ──
    const fetchInventory = useCallback(async () => {
        if (!selectedShopId) {
            setInventory([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const res = await api.get(
                `/api/inventory/shops/${selectedShopId}/inventory`
            );
            setInventory(res.data.data || []);
        } catch {
            setInventory([]);
        } finally {
            setLoading(false);
        }
    }, [selectedShopId]);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    // ── Fetch low stock count ──
    useEffect(() => {
        async function loadLowStock() {
            try {
                const res = await api.get("/api/inventory/low-stock");
                setLowStockCount((res.data.data || []).length);
            } catch {
                setLowStockCount(0);
            }
        }
        loadLowStock();
    }, [selectedShopId]);

    // ── Computed values ──
    const stats = {
        total: inventory.length,
        inStock: inventory.filter((i) => i.stock_status === "IN_STOCK").length,
        lowStock: inventory.filter((i) => i.stock_status === "LOW_STOCK").length,
        outOfStock: inventory.filter((i) => i.stock_status === "OUT_OF_STOCK").length,
    };

    const filteredInventory = inventory.filter((item) => {
        // Status filter
        if (statusFilter !== "ALL" && item.stock_status !== statusFilter) return false;
        // Search filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (
                item.name.toLowerCase().includes(q) ||
                item.sku.toLowerCase().includes(q)
            );
        }
        return true;
    });

    // ── Status badge helper ──
    function renderStatus(status: string) {
        const map: Record<string, { label: string; cls: string }> = {
            IN_STOCK: { label: "In Stock", cls: "in-stock" },
            LOW_STOCK: { label: "Low Stock", cls: "low-stock" },
            OUT_OF_STOCK: { label: "Out of Stock", cls: "out-of-stock" },
        };
        const s = map[status] || { label: status, cls: "" };
        return (
            <span className={`inv-status-badge ${s.cls}`}>
                <span className={`inv-status-dot ${s.cls}`} />
                {s.label}
            </span>
        );
    }

    // ── Render ──
    return (
        <div className="inventory-container">

            {/* ── Header ── */}
            <div className="inventory-header">
                <h1 className="inventory-title">Inventory</h1>

                {/* Shop selector */}
                <div className="shop-selector">
                    <select
                        value={selectedShopId}
                        onChange={(e) => setSelectedShopId(e.target.value)}
                        id="shop-selector"
                    >
                        {shops.length === 0 && (
                            <option value="">No shops available</option>
                        )}
                        {shops.map((shop) => (
                            <option key={shop._id} value={shop._id}>
                                {shop.name}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={16} className="shop-selector-icon" />
                </div>
            </div>

            {/* ── Low Stock Alert ── */}
            {lowStockCount > 0 && (
                <motion.div
                    className="low-stock-alert"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <AlertTriangle size={18} className="low-stock-alert-icon" />
                    <p>
                        <strong>{lowStockCount} item{lowStockCount > 1 ? "s" : ""}</strong> are
                        running low on stock across your shops.
                    </p>
                </motion.div>
            )}

            {/* ── Stats Grid ── */}
            <div className="inventory-stats-grid">
                <StatCard title="Total Products" value={stats.total} icon={Package} color="#6366f1" />
                <StatCard title="In Stock" value={stats.inStock} icon={PackageCheck} color="#10b981" />
                <StatCard title="Low Stock" value={stats.lowStock} icon={AlertTriangle} color="#f59e0b" />
                <StatCard title="Out of Stock" value={stats.outOfStock} icon={PackageX} color="#f43f5e" />
            </div>

            {/* ── Toolbar ── */}
            <div className="inventory-toolbar">
                <div className="inventory-search">
                    <Search size={16} className="inventory-search-icon" />
                    <input
                        type="text"
                        placeholder="Search by name or SKU..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        id="inventory-search"
                    />
                </div>

                <div className="status-filter-tabs">
                    {(
                        [
                            ["ALL", "All"],
                            ["IN_STOCK", "In Stock"],
                            ["LOW_STOCK", "Low Stock"],
                            ["OUT_OF_STOCK", "Out of Stock"],
                        ] as [StatusFilter, string][]
                    ).map(([value, label]) => (
                        <button
                            key={value}
                            className={`status-filter-tab ${statusFilter === value ? "active" : ""}`}
                            onClick={() => setStatusFilter(value)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Table ── */}
            <div className="inventory-table-card">
                {loading ? (
                    <div className="inventory-skeleton">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="skeleton-row" />
                        ))}
                    </div>
                ) : filteredInventory.length === 0 ? (
                    <div className="inventory-empty">
                        <div className="inventory-empty-icon">
                            <Store size={28} />
                        </div>
                        <h3>
                            {inventory.length === 0
                                ? "No inventory yet"
                                : "No items match your filters"}
                        </h3>
                        <p>
                            {inventory.length === 0
                                ? "Stock items will appear here once products are added to this shop."
                                : "Try adjusting your search or filter criteria."}
                        </p>
                    </div>
                ) : (
                    <div className="inventory-table-wrapper">
                        <table className="inventory-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>SKU</th>
                                    <th>Quantity</th>
                                    <th>Price</th>
                                    <th>Status</th>
                                    {canAdjust && <th>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInventory.map((item) => (
                                    <motion.tr
                                        key={item.productId}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <td className="product-name">
                                            {item.name}
                                        </td>
                                        <td className="sku">{item.sku}</td>
                                        <td className="quantity">
                                            {item.quantity.toLocaleString()}
                                        </td>
                                        <td className="price">
                                            ₹{item.selling_price?.toLocaleString() ?? "—"}
                                        </td>
                                        <td>{renderStatus(item.stock_status)}</td>
                                        {canAdjust && (
                                            <td>
                                                <div style={{ display: "flex", gap: 8 }}>
                                                    <button
                                                        className="inv-action-btn stock-in"
                                                        onClick={() =>
                                                            setAdjustModal({
                                                                type: "in",
                                                                item,
                                                            })
                                                        }
                                                    >
                                                        <Plus size={14} /> In
                                                    </button>
                                                    <button
                                                        className="inv-action-btn stock-out"
                                                        onClick={() =>
                                                            setAdjustModal({
                                                                type: "out",
                                                                item,
                                                            })
                                                        }
                                                    >
                                                        <Minus size={14} /> Out
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Stock Adjustment Modal ── */}
            <AnimatePresence>
                {adjustModal && (
                    <AdjustmentModal
                        modal={adjustModal}
                        shopId={selectedShopId}
                        onClose={() => setAdjustModal(null)}
                        onSuccess={fetchInventory}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
