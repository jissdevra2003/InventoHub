import { Request, Response } from "express";
import { Types } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { StockLedger } from "../models/StockLedger.model";
import { Inventory } from "../models/Inventory.model";

// ─── Helper ───────────────────────────────────────────────────────────────────
const ownerBypass = (user: NonNullable<Request["user"]>) =>
    user.isSuperAdmin && user.permissions?.includes("*");

// Builds the shop filter object for aggregation match stages
const buildShopFilter = (user: NonNullable<Request["user"]>, shopId?: string) => {
    if (ownerBypass(user) || user.builtInRole === "admin") {
        return shopId ? { shop_id: new Types.ObjectId(shopId) } : {};
    }
    // Managers and staff are restricted to their assigned shops
    if (shopId) {
        if (!user.assignedShopsId.includes(shopId)) {
            throw new ApiError(403, "Access denied for this shop.");
        }
        return { shop_id: new Types.ObjectId(shopId) };
    }
    return { shop_id: { $in: user.assignedShopsId.map((id: string) => new Types.ObjectId(id)) } };
};

// Parses date range from query string, with full day coverage
const buildDateFilter = (startDate?: string, endDate?: string) => {
    if (!startDate && !endDate) return {};
    const filter: any = {};
    if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.$gte = start;
    }
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.$lte = end;
    }
    return filter;
};


// ─── 1. Ledger Activity Feed ───────────────────────────────────────────────────
// Returns a paginated, filterable list of all stock movements.
// Supports: shopId, productId, change_type, startDate, endDate
// Used for: Activity logs, audit trails
// GET /api/stock-ledger/activity
export const getLedgerActivity = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const shopId = req.query.shopId as string | undefined;
    const productId = req.query.productId as string | undefined;
    const changeType = req.query.changeType as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const filter: any = { market_id: user.marketId };

    // Apply shop restriction
    Object.assign(filter, buildShopFilter(user, shopId));

    if (productId) filter.product_id = new Types.ObjectId(productId);
    if (changeType) filter.change_type = changeType;

    const dateFilter = buildDateFilter(startDate, endDate);
    if (Object.keys(dateFilter).length > 0) filter.createdAt = dateFilter;

    const [entries, total] = await Promise.all([
        StockLedger.find(filter)
            .populate("product_id", "name sku")
            .populate("shop_id", "name")
            .populate("user_id", "name email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        StockLedger.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json(
        new ApiResponse(200, "Ledger activity fetched successfully", {
            entries,
            pagination: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
        })
    );
});


// ─── 2. Shrinkage & Loss Report ───────────────────────────────────────────────
// Answers: "How much stock is disappearing due to damage, theft, or errors?"
// Filters for NEGATIVE stock_adjustment entries (manual downward adjustments).
// Groups by shop → gives owner a shop-by-shop comparison.
//
// FRONTEND: Bar chart — "Shrinkage by Shop this Month"
//   Y-axis: Total units/value lost | X-axis: Shop names
//   Insight: "Shop 2 is losing 3x more inventory than Shop 1. Investigate!"
// GET /api/stock-ledger/shrinkage
export const getShrinkageReport = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    const shopId = req.query.shopId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const matchFilter: any = {
        market_id: new Types.ObjectId(user.marketId),
        change_type: "stock_adjustment",
        quantity_changed: { $lt: 0 },           // only NEGATIVE adjustments = loss/shrinkage
    };

    Object.assign(matchFilter, buildShopFilter(user, shopId));

    const dateFilter = buildDateFilter(startDate, endDate);
    if (Object.keys(dateFilter).length > 0) matchFilter.createdAt = dateFilter;

    const result = await StockLedger.aggregate([
        { $match: matchFilter },
        {
            $group: {
                _id: "$shop_id",
                total_units_lost: { $sum: { $abs: "$quantity_changed" } },  // absolute value
                incident_count: { $sum: 1 },                               // how many events
            },
        },
        {
            $lookup: {
                from: "shops", // collection name in database not the model name
                localField: "_id",
                foreignField: "_id",
                as: "shop",
            },
        },
        { $unwind: { path: "$shop", preserveNullAndEmptyArrays: true } },
        {// $project = choose fields(0,1) + rename fields + create new fields
            $project: {
                _id: 0,
                shop_id: "$_id", // custom name for _id created in project
                shop_name: { $ifNull: ["$shop.name", "Unknown Shop"] }, //custom name for shop.name creacted in project
                total_units_lost: 1, // custom name created in group stage
                incident_count: 1, // custom name created in group stage
            },
        },
        { $sort: { total_units_lost: -1 } },    // worst offenders first
    ]);

    const totalUnitsLost = result.reduce((sum, r) => sum + r.total_units_lost, 0);

    return res.status(200).json(
        new ApiResponse(200, "Shrinkage report fetched", {
            // Summary card
            summary: {
                total_units_lost: totalUnitsLost,
                shops_with_shrinkage: result.length,
            },
            // Per-shop breakdown for chart
            by_shop: result,
        })
    );
});


// ─── 3. Stock Velocity (Turnover Rate) ────────────────────────────────────────
// Answers: "Which products sell fastest? Which are sitting as dead stock?"
// Aggregates sales_order ledger deductions (negative quantity_changed) per product.
//
// FRONTEND: Horizontal bar chart ranked by units sold
//   Top bar: "Product A — 500 units sold in 30 days"
//   Bottom: "Product B — 2 units sold in 30 days (dead stock alert)"
//   Insight: Stop reordering Product B. Discount it to free up cash.
// GET /api/stock-ledger/velocity
export const getStockVelocity = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    const shopId    = req.query.shopId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate   = req.query.endDate as string | undefined;
    const limit     = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const matchFilter: any = {
        market_id: new Types.ObjectId(user.marketId),
        change_type: "sales_order",       // only outgoing stock due to sales
        quantity_changed: { $lt: 0 },     // all SO entries are negative
    };

    const shopFilterObj = buildShopFilter(user, shopId);
    Object.assign(matchFilter, shopFilterObj);

    // 1. Fix date mismatch: default to last 30 days if no dates provided
    let sDate = startDate;
    let eDate = endDate;
    if (!startDate && !endDate) {
        sDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }
    const dateFilter = buildDateFilter(sDate, eDate);
    if (Object.keys(dateFilter).length > 0) matchFilter.createdAt = dateFilter;

    // Calculate the number of days in the period for daily rate calculation
    const totalDays = (() => {
        const s = sDate ? new Date(sDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const e = eDate ? new Date(eDate) : new Date();
        if (isNaN(s.getTime()) || isNaN(e.getTime())) throw new ApiError(400, "Invalid Date Format");
        if (s > e) throw new ApiError(400, "Invalid date range: startDate cannot be after endDate");
        return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
    })();

    const result = await StockLedger.aggregate([
        { $match: matchFilter },
        {
            $group: {
                // Grouping only by product_id ensures we get exactly 1 row per product in the final list.
                // If shopId is passed, this correctly shows velocity for that shop.
                // If shopId is NOT passed, it correctly shows market-wide velocity.
                _id: "$product_id",
                total_units_sold: { $sum: { $abs: "$quantity_changed" } },
                transaction_count: { $sum: 1 },
            },
        },
        { $sort: { total_units_sold: -1 } },
        { $limit: limit },
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "product",
            },
        },
        { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "inventories",
                let: { pid: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ["$product_id", "$$pid"] },
                            market_id: new Types.ObjectId(user.marketId),
                            // 2. We explicitly inject the EXACT SAME shop filter here!
                            // This guarantees current_stock perfectly matches the shops we analyzed sales for.
                            ...shopFilterObj
                        }
                    },
                    { $group: { _id: null, current_stock: { $sum: "$quantity" } } },
                ],
                as: "inventoryData",
            },
        },
        {
            $project: {
                _id: 0,
                product_id: "$_id",
                product_name: { $ifNull: ["$product.name", "Unknown Product"] },
                sku: { $ifNull: ["$product.sku", "-"] },
                total_units_sold: 1,
                transaction_count: 1,
                // Units sold per day — key metric for reorder forecasting
                daily_velocity: {
                    $round: [{ $divide: ["$total_units_sold", totalDays] }, 2],
                },
                current_stock: {
                    $ifNull: [{ $arrayElemAt: ["$inventoryData.current_stock", 0] }, 0],
                },
            },
        },
        {
            // Days until stockout at current velocity
            // If daily_velocity = 0, set to null (product not selling)
            $addFields: {
                days_until_stockout: {
                    $cond: {
                        if: { $gt: ["$daily_velocity", 0] },
                        then: { $round: [{ $divide: ["$current_stock", "$daily_velocity"] }, 0] },
                        else: null,
                    },
                },
            },
        },
    ]);

    return res.status(200).json(
        new ApiResponse(200, "Stock velocity fetched", {
            period_days: totalDays,
            // Products ranked fastest → slowest sellers
            products: result,
        })
    );
});


// ─── 4. Inventory Flow Summary (In vs. Out) ───────────────────────────────────
// Answers: "Is my total stock growing or shrinking? What's the net movement?"
// Groups ALL ledger entries into "in" (positive) and "out" (negative) per shop.
//
// FRONTEND: Stacked bar or grouped bar per shop
//   Green bar = Stock IN  (purchases, returns, adjustments up)
//   Red bar   = Stock OUT (sales, returns to supplier, transfers out)
//   Net line  = In - Out
//   Insight: "Shop 1 is moving 2x more stock than Shop 2 — is Shop 2 understaffed?"
// GET /api/stock-ledger/flow
export const getInventoryFlowSummary = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    const shopId = req.query.shopId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const matchFilter: any = { market_id: new Types.ObjectId(user.marketId) };

    Object.assign(matchFilter, buildShopFilter(user, shopId));

    const dateFilter = buildDateFilter(startDate, endDate);
    if (Object.keys(dateFilter).length > 0) matchFilter.createdAt = dateFilter;

    const result = await StockLedger.aggregate([
        { $match: matchFilter },
        {
            $group: {
                _id: "$shop_id",
                // Stock IN: all positive quantity_changed entries
                total_in: {
                    $sum: {
                        $cond: [{ $gt: ["$quantity_changed", 0] }, "$quantity_changed", 0],
                    },
                },
                // Stock OUT: absolute value of all negative entries
                total_out: {
                    $sum: {
                        $cond: [{ $lt: ["$quantity_changed", 0] }, { $abs: "$quantity_changed" }, 0],
                    },
                },
                total_events: { $sum: 1 },
            },
        },
        {
            $lookup: {
                from: "shops",
                localField: "_id",
                foreignField: "_id",
                as: "shop",
            },
        },
        { $unwind: { path: "$shop", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 0,
                shop_id: "$_id",
                shop_name: { $ifNull: ["$shop.name", "Unknown Shop"] },
                total_in: 1,
                total_out: 1,
                net_flow: { $subtract: ["$total_in", "$total_out"] },   // + = growing, - = shrinking
                total_events: 1,
            },
        },
        { $sort: { total_out: -1 } },   // busiest shops first
    ]);

    // Market-level totals
    const marketTotals = result.reduce(
        (acc, r) => {
            acc.total_in += r.total_in;
            acc.total_out += r.total_out;
            acc.net_flow += r.net_flow;
            return acc;
        },
        { total_in: 0, total_out: 0, net_flow: 0 }
    );

    return res.status(200).json(
        new ApiResponse(200, "Inventory flow summary fetched", {
            // Market-level summary card
            market_summary: marketTotals,
            // Per-shop breakdown for chart
            by_shop: result,
        })
    );
});


// ─── 5. Smart Reorder Forecast ─────────────────────────────────────────────────
// Answers: "Which products will run out soon? What should I order right now?"
// Combines stock velocity (daily sales rate) with current inventory to predict stockout.
//
// FRONTEND: Alert-style table or card list
//   🔴 "Milk — Shop 1 will run out in 2 DAYS at current sales speed"
//   🟡 "Rice — Shop 2 will run out in 8 DAYS"
//   ✅ "Sugar — Well stocked (45+ days)"
//   Insight: One-click "Auto create PO" button next to each alert
// GET /api/stock-ledger/reorder-forecast
export const getReorderForecast = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    const shopId = req.query.shopId as string | undefined;
    const urgencyDaysStr = req.query.urgencyDays as string | undefined;
    const urgencyDays = parseInt(urgencyDaysStr || "7", 10);   // default: warn if < 7 days left
    const velocityWindow = 30;                                     // look at last 30 days of sales

    // Build shop scope
    const shopFilter = buildShopFilter(user, shopId);
    const shopIds = shopId
        ? [new Types.ObjectId(shopId)]
        : user.assignedShopsId.map((id: string) => new Types.ObjectId(id));

    // ── Step 1: Get velocity per product per shop (last 30 days of sales_order entries) ──
    const thirtyDaysAgo = new Date(Date.now() - velocityWindow * 24 * 60 * 60 * 1000);

    const velocityData = await StockLedger.aggregate([
        {
            $match: {
                market_id: new Types.ObjectId(user.marketId),
                change_type: "sales_order",
                quantity_changed: { $lt: 0 },
                createdAt: { $gte: thirtyDaysAgo },
                ...(ownerBypass(user) || user.builtInRole === "admin"
                    ? shopId ? { shop_id: new Types.ObjectId(shopId) } : {}
                    : { shop_id: { $in: shopIds } }),
            },
        },
        {
            $group: {
                _id: { shop_id: "$shop_id", product_id: "$product_id" },
                units_sold: { $sum: { $abs: "$quantity_changed" } },
            },
        },
        {
            $addFields: {
                daily_velocity: { $round: [{ $divide: ["$units_sold", velocityWindow] }, 3] },
            },
        },
    ]);

    if (velocityData.length === 0) {
        return res.status(200).json(
            new ApiResponse(200, "No recent sales data to generate forecast", { forecasts: [] })
        );
    }

    // ── Step 2: Get current inventory for same shop/product pairs ──
    const inventoryMap = new Map<string, number>();
    const shopProductPairs = velocityData.map((v) => ({
        shop_id: v._id.shop_id,
        product_id: v._id.product_id,
    }));

    const inventoryRecords = await Inventory.find({
        $or: shopProductPairs,
    }).select("shop_id product_id quantity");

    inventoryRecords.forEach((inv) => {
        const key = `${inv.shop_id.toString()}_${inv.product_id.toString()}`;
        inventoryMap.set(key, inv.quantity);
    });

    // ── Step 3: Compute days until stockout, return only urgent items ──
    const forecasts = velocityData
        .map((v) => {
            const key = `${v._id.shop_id}_${v._id.product_id}`;
            const currentStock = inventoryMap.get(key) ?? 0;
            const daysUntilStockout = v.daily_velocity > 0
                ? Math.floor(currentStock / v.daily_velocity)
                : null;

            return {
                shop_id: v._id.shop_id,
                product_id: v._id.product_id,
                current_stock: currentStock,
                daily_velocity: v.daily_velocity,
                units_sold_in_period: v.units_sold,
                days_until_stockout: daysUntilStockout,
                urgency: daysUntilStockout === null
                    ? "no_sales"
                    : daysUntilStockout <= 3 ? "critical"
                        : daysUntilStockout <= urgencyDays ? "urgent"
                            : "ok",
            };
        })
        .filter((f) => f.urgency === "critical" || f.urgency === "urgent")
        .sort((a, b) => (a.days_until_stockout ?? 999) - (b.days_until_stockout ?? 999));

    // ── Step 4: Populate shop and product names ──
    const populated = await StockLedger.populate(forecasts, [
        { path: "shop_id", select: "name", model: "Shop" },
        { path: "product_id", select: "name sku", model: "Product" },
    ]);

    return res.status(200).json(
        new ApiResponse(200, "Reorder forecast fetched", {
            velocity_window_days: velocityWindow,
            urgency_threshold_days: urgencyDays,
            forecasts: populated,
        })
    );
});
