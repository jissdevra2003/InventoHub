import { Request, Response } from "express";
import { Types } from "mongoose";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { Transfer } from "../models/Transfer.model";
import { Inventory } from "../models/Inventory.model";
import { StockLedger } from "../models/StockLedger.model";
import { Shop } from "../models/Shop.model";

// ─── Helper ───────────────────────────────────────────────────────────────────
const ownerBypass = (user: NonNullable<Request["user"]>) =>
    user.isSuperAdmin && user.permissions?.includes("*");

// ─── 1. Create Transfer (Pending) ─────────────────────────────────────────────
// Initiates a stock transfer request for one product from one shop to another.
// No inventory or ledger changes happen here — only when status = "completed".
export const createTransfer = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    const { from_shop_id, to_shop_id, product_id, quantity, notes } = req.body;

    // --- Basic validation ---
    if (!from_shop_id || !to_shop_id || !product_id || !quantity) {
        throw new ApiError(400, "from_shop_id, to_shop_id, product_id and quantity are required");
    }
    if (typeof quantity !== "number" || quantity < 1) {
        throw new ApiError(400, "quantity must be a positive integer");
    }
    if (from_shop_id === to_shop_id) {
        throw new ApiError(400, "from_shop_id and to_shop_id cannot be the same shop");
    }

    // --- Shop access check for managers and staff ---
    // Non-admin users must be assigned to the source shop to initiate a transfer
    if (!ownerBypass(user) && user.builtInRole !== "admin") {
        if (!user.assignedShopsId.includes(from_shop_id.toString())) {
            throw new ApiError(403, "Access denied. You are not assigned to the source shop.");
        }
    }

    // --- Validate both shops belong to this market ---
    const [fromShop, toShop] = await Promise.all([
        Shop.findOne({ _id: from_shop_id, market_id: user.marketId, isActive: true }),
        Shop.findOne({ _id: to_shop_id, market_id: user.marketId, isActive: true }),
    ]);

    if (!fromShop) throw new ApiError(404, "Source shop not found in this market");
    if (!toShop) throw new ApiError(404, "Destination shop not found in this market");

    // --- Check stock is actually available in source shop ---
    const sourceInventory = await Inventory.findOne({
        market_id: user.marketId,
        shop_id: from_shop_id,
        product_id,
    });

    const availableQty = sourceInventory ? sourceInventory.quantity : 0;
    if (availableQty < quantity) {
        throw new ApiError(
            400,
            `Insufficient stock in source shop. Available: ${availableQty}, Requested: ${quantity}`
        );
    }

    // --- Auto-generate transfer number (TR-00000001) per market ---
    const lastTransfer = await Transfer.findOne({ market_id: user.marketId })
        .sort({ count: -1 })
        .select("count")
        .lean();

    const nextCount = (lastTransfer?.count ?? 0) + 1;
    const transfer_number = `TR-${nextCount.toString().padStart(8, "0")}`;

    const transfer = await Transfer.create({
        market_id: user.marketId,
        transfer_number,
        count: nextCount,
        from_shop_id,
        to_shop_id,
        product_id,
        quantity,
        notes,
        status: "pending",
        created_by: user.userId,
    });

    return res.status(201).json(
        new ApiResponse(201, "Transfer request created successfully", transfer)
    );
});


// ─── 2. List Transfers ────────────────────────────────────────────────────────
// Managers/staff see only transfers where their assigned shops are involved
// (either from_shop_id OR to_shop_id). Admins/owners see all.
export const listTransfers = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const skip = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    const shopId = req.query.shopId as string | undefined;

    const filter: any = { market_id: user.marketId };

    if (status) filter.status = status;

    if (!ownerBypass(user) && user.builtInRole !== "admin") {
        // Managers/staff: show transfers touching any of their assigned shops
        const shopFilter = shopId && user.assignedShopsId.includes(shopId)
            ? [new Types.ObjectId(shopId)]
            : user.assignedShopsId.map((id: string) => new Types.ObjectId(id));

        if (shopId && !user.assignedShopsId.includes(shopId)) {
            throw new ApiError(403, "Access denied for this shop.");
        }

        filter.$or = [
            { from_shop_id: { $in: shopFilter } },
            { to_shop_id:   { $in: shopFilter } },
        ];
    } else {
        if (shopId) {
            filter.$or = [
                { from_shop_id: new Types.ObjectId(shopId) },
                { to_shop_id:   new Types.ObjectId(shopId) },
            ];
        }
    }

    const [transfers, total] = await Promise.all([
        Transfer.find(filter)
            .populate("from_shop_id", "name")
            .populate("to_shop_id", "name")
            .populate("product_id", "name sku")
            .populate("created_by", "name email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Transfer.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json(
        new ApiResponse(200, "Transfers fetched successfully", {
            transfers,
            pagination: {
                total,
                page,
                limit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        })
    );
});


// ─── 3. Get Transfer By ID ────────────────────────────────────────────────────
export const getTransferById = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    const { id } = req.params;

    const transfer = await Transfer.findOne({ _id: id, market_id: user.marketId })
        .populate("from_shop_id", "name address")
        .populate("to_shop_id", "name address")
        .populate("product_id", "name sku unit")
        .populate("created_by", "name email")
        .populate("completed_by", "name email");

    if (!transfer) throw new ApiError(404, "Transfer not found");

    // Non-admins must be assigned to either shop
    if (!ownerBypass(user) && user.builtInRole !== "admin") {
        const fromId = transfer.from_shop_id.toString();
        const toId   = transfer.to_shop_id.toString();
        if (!user.assignedShopsId.includes(fromId) && !user.assignedShopsId.includes(toId)) {
            throw new ApiError(403, "Access denied. You are not assigned to either shop in this transfer.");
        }
    }

    return res.status(200).json(
        new ApiResponse(200, "Transfer fetched successfully", transfer)
    );
});


// ─── 4. Mark In-Transit ───────────────────────────────────────────────────────
// The goods have left the source shop but not yet arrived at destination.
// No inventory change — just a status update.
export const markInTransit = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    const { id } = req.params;

    const transfer = await Transfer.findOne({ _id: id, market_id: user.marketId });
    if (!transfer) throw new ApiError(404, "Transfer not found");

    // Only admins/owners OR users assigned to source shop can dispatch
    if (!ownerBypass(user) && user.builtInRole !== "admin") {
        if (!user.assignedShopsId.includes(transfer.from_shop_id.toString())) {
            throw new ApiError(403, "Access denied. Only the source shop can mark a transfer as in-transit.");
        }
    }

    if (transfer.status !== "pending") {
        throw new ApiError(400, `Cannot mark in-transit. Current status is '${transfer.status}'. Only pending transfers can be dispatched.`);
    }

    transfer.status = "in_transit";
    await transfer.save();

    return res.status(200).json(
        new ApiResponse(200, "Transfer marked as in-transit", transfer)
    );
});


// ─── 5. Complete Transfer (Inventory + Ledger) ────────────────────────────────
// The destination shop confirms receipt.
// This is the ONLY place where stock actually moves and ledger entries are written.
// Uses a transaction: inventory deduction + addition + 2 ledger entries, all atomically.
export const completeTransfer = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    const { id } = req.params;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const transfer = await Transfer.findOne({ _id: id, market_id: user.marketId }).session(session);
        if (!transfer) throw new ApiError(404, "Transfer not found");

        // Only admins/owners OR users assigned to DESTINATION shop can confirm receipt
        if (!ownerBypass(user) && user.builtInRole !== "admin") {
            if (!user.assignedShopsId.includes(transfer.to_shop_id.toString())) {
                throw new ApiError(403, "Access denied. Only the destination shop can complete a transfer.");
            }
        }

        if (transfer.status !== "in_transit") {
            throw new ApiError(400, `Cannot complete transfer. Current status is '${transfer.status}'. Transfer must be in-transit first.`);
        }

        // ── 1. Deduct from source shop ──
        const fromInventory = await Inventory.findOne({
            market_id: transfer.market_id,
            shop_id: transfer.from_shop_id,
            product_id: transfer.product_id,
        }).session(session);

        if (!fromInventory || fromInventory.quantity < transfer.quantity) {
            throw new ApiError(400, `Insufficient stock in source shop. Available: ${fromInventory?.quantity ?? 0}, Required: ${transfer.quantity}`);
        }

        const fromPrevious = fromInventory.quantity;
        fromInventory.quantity -= transfer.quantity;
        await fromInventory.save({ session });

        // ── 2. Add to destination shop ──
        let toInventory = await Inventory.findOne({
            market_id: transfer.market_id,
            shop_id: transfer.to_shop_id,
            product_id: transfer.product_id,
        }).session(session);

        const toPrevious = toInventory ? toInventory.quantity : 0;

        if (!toInventory) {
            toInventory = new Inventory({
                market_id: transfer.market_id,
                shop_id: transfer.to_shop_id,
                product_id: transfer.product_id,
                quantity: transfer.quantity,
            });
        } else {
            toInventory.quantity += transfer.quantity;
        }
        await toInventory.save({ session });

        // ── 3. Write TWO ledger entries (one per shop) ──
        await StockLedger.create([
            // transfer_out: stock leaving source shop
            {
                market_id: transfer.market_id,
                shop_id: transfer.from_shop_id,
                product_id: transfer.product_id,
                quantity_changed: -transfer.quantity,
                change_type: "transfer_out",
                previous_stock: fromPrevious,
                new_stock: fromInventory.quantity,
                reason: `Transfer OUT to shop (${transfer.transfer_number})`,
                user_id: user.userId,
                reference_id: transfer._id,
                from_shop_id: transfer.from_shop_id,
                to_shop_id: transfer.to_shop_id,
            },
            // transfer_in: stock arriving at destination shop
            {
                market_id: transfer.market_id,
                shop_id: transfer.to_shop_id,
                product_id: transfer.product_id,
                quantity_changed: transfer.quantity,
                change_type: "transfer_in",
                previous_stock: toPrevious,
                new_stock: toInventory.quantity,
                reason: `Transfer IN from shop (${transfer.transfer_number})`,
                user_id: user.userId,
                reference_id: transfer._id,
                from_shop_id: transfer.from_shop_id,
                to_shop_id: transfer.to_shop_id,
            },
        ], { session });

        // ── 4. Mark transfer as completed ──
        transfer.status = "completed";
        transfer.completed_by = new Types.ObjectId(user.userId);
        transfer.completed_at = new Date();
        await transfer.save({ session });

        await session.commitTransaction();

        return res.status(200).json(
            new ApiResponse(200, "Transfer completed. Stock moved and ledger updated.", transfer)
        );

    } catch (error) {
        await session.abortTransaction();
        throw error instanceof ApiError ? error : new ApiError(500, "Failed to complete transfer");
    } finally {
        session.endSession();
    }
});


// ─── 6. Cancel Transfer ───────────────────────────────────────────────────────
// Can only cancel from "pending" status. In-transit is too risky to cancel
// without verifying goods are physically returned.
export const cancelTransfer = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    const { id } = req.params;

    const transfer = await Transfer.findOne({ _id: id, market_id: user.marketId });
    if (!transfer) throw new ApiError(404, "Transfer not found");

    // Admins/owners OR the original creator can cancel
    const isCreator = transfer.created_by.toString() === user.userId;
    if (!ownerBypass(user) && user.builtInRole !== "admin" && !isCreator) {
        throw new ApiError(403, "Access denied. Only the creator or an admin can cancel this transfer.");
    }

    if (transfer.status !== "pending") {
        throw new ApiError(
            400,
            `Cannot cancel. Current status is '${transfer.status}'. Only pending transfers can be cancelled. ` +
            (transfer.status === "in_transit" ? "Goods are in transit — contact the destination shop to refuse delivery." : "")
        );
    }

    transfer.status = "cancelled";
    await transfer.save();

    return res.status(200).json(
        new ApiResponse(200, "Transfer cancelled successfully", transfer)
    );
});
