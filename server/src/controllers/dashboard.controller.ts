import { Request, Response } from "express";
import { Types } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { Product } from "../models/Product.model";
import { Shop } from "../models/Shop.model";
import { Inventory } from "../models/Inventory.model";
import { SalesOrder } from "../models/SalesOrder.model";
import { StockLedger } from "../models/StockLedger.model";


// ─── Dashboard Stats ──────────────────────────────────────────────────────────
// Returns a snapshot of the business for the logged-in user's market:
//   totalProducts, totalShops, lowStockCount, todaySalesTotal, recentActivity

export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    const marketId = new Types.ObjectId(user.marketId);

    // Today's date range (midnight to midnight)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Run all queries in parallel for speed
    const [
        totalProducts,
        totalShops,
        lowStockItems,
        todaySalesAgg,
        recentActivity,
    ] = await Promise.all([

        // 1. Total products in this market
        Product.countDocuments({ market_id: marketId, is_deleted: { $ne: true } }),

        // 2. Total shops in this market
        Shop.countDocuments({ market_id: marketId }),

        // 3. Low stock count: items where quantity <= min_stock
        Inventory.countDocuments({
            market_id: marketId,
            $expr: {
                $and: [
                    { $gt: ["$min_stock", 0] },              // min_stock is set
                    { $lte: ["$quantity", "$min_stock"] },    // quantity at or below threshold
                ],
            },
        }),

        // 4. Today's sales total (only completed SOs)
        SalesOrder.aggregate([
            {
                $match: {
                    market_id: marketId,
                    status: "completed",
                    createdAt: { $gte: todayStart, $lte: todayEnd },
                },
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$total_amount" },
                    orderCount: { $sum: 1 },
                },
            },
        ]),

        // 5. Recent activity — last 10 stock ledger entries
        StockLedger.find({ market_id: marketId })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate("product_id", "name sku")
            .populate("shop_id", "name")
            .populate("user_id", "name email")
            .select("change_type quantity_changed reason createdAt"),
    ]);

    const todaySales = todaySalesAgg[0] || { totalRevenue: 0, orderCount: 0 };

    return res.status(200).json(
        new ApiResponse(200, "Dashboard stats fetched successfully", {
            totalProducts,
            totalShops,
            lowStockCount: lowStockItems,
            todaySales: {
                revenue: todaySales.totalRevenue,
                orders: todaySales.orderCount,
            },
            recentActivity,
        })
    );
});
