import { Request, Response } from "express";
import { Types } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { PurchaseOrder, IPurchaseOrderItem } from "../models/PurchaseOrder.model";
import { Inventory } from "../models/Inventory.model";
import { StockLedger } from "../models/StockLedger.model";
import { Supplier } from "../models/Supplier.model";
import { createPurchaseOrderValidator } from "../validators/purchaseOrder.validator";
import { CreatePurchaseOrderDto } from "../dtos/purchaseOrder.dto";
import mongoose from "mongoose";

// ─── 1. Create Purchase Order (Draft) ─────────────────────────────────────────
export const createPurchaseOrder = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    // Validate request body
    const result = createPurchaseOrderValidator.safeParse(req.body);
    if (!result.success) {
        const errors = result.error.issues.map(e => `${e.path.join(".")}: ${e.message}`);
        throw new ApiError(400, `Validation error: ${errors.join(", ")}`);
    }

    const data: CreatePurchaseOrderDto = result.data;

    // Strict shop access check for Managers and Staff
    const ownerAccess = user.isSuperAdmin && user.permissions?.includes("*");
    if (!ownerAccess && user.builtInRole !== "admin" && !user.assignedShopsId.includes(data.shop_id.toString())) {
        throw new ApiError(403, "Access denied. You cannot create a purchase order for a shop you are not assigned to.");
    }

    // Calculate subtotal and format items
    let subtotal = 0;
    const items: IPurchaseOrderItem[] = data.items.map((item) => {
        const itemTotal = item.quantity * item.cost_price;   //individual item total
        subtotal += itemTotal;                              //subtotal of all items
        //return each item in the form of IPurchaseOrderItem object
        return {
            product_id: new Types.ObjectId(item.product_id), //converting string to native mongodb object id
            product_name: item.product_name,
            sku: item.sku,
            quantity: item.quantity,
            cost_price: item.cost_price,
        };
    });

    // Auto-generate PO number (PO-00001, PO-00002, etc. per market)
    // Find the last PO for this market to get the count
    const lastPO = await PurchaseOrder.findOne({ market_id: user.marketId })
        .sort({ count: -1 })
        .select("count")
        .lean();
    
    const nextCount = (lastPO && lastPO.count ? lastPO.count : 0) + 1;
    const purchaseNumber = `PO-${nextCount.toString().padStart(8, "0")}`;

    // Create the draft PO
    const purchaseOrder = await PurchaseOrder.create({
        market_id: user.marketId,
        purchase_number: purchaseNumber,
        count: nextCount,
        shop_id: data.shop_id,
        supplier_id: data.supplier_id,
        items,
        subtotal,
        total_amount: subtotal, // For now, total = subtotal (no tax/discount yet)
        status: "draft",
        created_by: user.userId,
    });

    return res.status(201).json(
        new ApiResponse(201, "Draft Purchase Order created successfully", purchaseOrder)
    );
});


// ─── 2. List Purchase Orders ──────────────────────────────────────────────────
export const listPurchaseOrders = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const skip = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    const shopId = req.query.shopId as string | undefined;

    const filter: any = { market_id: user.marketId };

    if (status) filter.status = status;

    // Restrict visibility for managers and staff
    const ownerAccess = user.isSuperAdmin && user.permissions?.includes("*");
    if (!ownerAccess && user.builtInRole !== "admin") {
        if (shopId && !user.assignedShopsId.includes(shopId)) {
            throw new ApiError(403, "Access denied for this shop.");
        }
        filter.shop_id = shopId ? shopId : { $in: user.assignedShopsId };
    } else {
        if (shopId) filter.shop_id = shopId;
    }

    const [purchaseOrders, total] = await Promise.all([
        PurchaseOrder.find(filter)
            .populate("supplier_id", "company_name contact_name email contact_number")
            .populate("shop_id", "name")
            .populate("created_by", "name email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        PurchaseOrder.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json(
        new ApiResponse(200, "Purchase Orders fetched successfully", {
            purchaseOrders,
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


// ─── 3. Get Single Purchase Order ─────────────────────────────────────────────
export const getPurchaseOrderById = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    const { id } = req.params;

    const purchaseOrder = await PurchaseOrder.findOne({
        _id: id,
        market_id: user.marketId,
    })
    .populate("supplier_id", "company_name contact_name email contact_number address gstin")
    .populate("shop_id", "name address contact_number")
    .populate("items.product_id", "name sku")
    .populate("created_by", "name email");

    if (!purchaseOrder) {
        throw new ApiError(404, "Purchase Order not found");
    }

    const ownerAccess = user.isSuperAdmin && user.permissions?.includes("*");
    if (!ownerAccess && user.builtInRole !== "admin" && !user.assignedShopsId.includes(purchaseOrder.shop_id.toString())) {
        throw new ApiError(403, "Access denied. You are not assigned to this shop's purchase order.");
    }

    return res.status(200).json(
        new ApiResponse(200, "Purchase Order fetched successfully", purchaseOrder)
    );
});


// ─── 4. Receive Purchase Order (Update Inventory) ─────────────────────────────
export const receivePurchaseOrder = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    const { id } = req.params;

    // We must use a transaction to ensure PO status, Inventory, Ledger, and Supplier all update safely
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const purchaseOrder = await PurchaseOrder.findOne({
            _id: id,
            market_id: user.marketId,
        }).session(session);

        if (!purchaseOrder) {
            throw new ApiError(404, "Purchase Order not found");
        }

        const ownerAccess = user.isSuperAdmin && user.permissions?.includes("*");
        if (!ownerAccess && user.builtInRole !== "admin" && !user.assignedShopsId.includes(purchaseOrder.shop_id.toString())) {
            throw new ApiError(403, "Access denied. You cannot receive purchase orders for a shop you are not assigned to.");
        }

        if (purchaseOrder.status !== "draft") {
            throw new ApiError(400, `Cannot receive PO. Current status is '${purchaseOrder.status}'`);
        }

        // 1. Update Inventory and Create StockLedger Entries for each item
        for (const item of purchaseOrder.items) {
            let inventory = await Inventory.findOne({
                market_id: purchaseOrder.market_id,
                shop_id: purchaseOrder.shop_id,
                product_id: item.product_id,
            }).session(session);

            const previousStock = inventory ? inventory.quantity : 0;
            //inventory does not exist then create new inventory record
            if (!inventory) {
                // Create new inventory record if it doesn't exist
                inventory = new Inventory({
                    market_id: purchaseOrder.market_id,
                    shop_id: purchaseOrder.shop_id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                });
            } else {
                inventory.quantity += item.quantity;
            }

            await inventory.save({ session });

            // Record in StockLedger
            await StockLedger.create([{
                market_id: purchaseOrder.market_id,
                shop_id: purchaseOrder.shop_id,
                product_id: item.product_id,
                quantity_changed: item.quantity,
                change_type: "purchase_order",
                previous_stock: previousStock,
                new_stock: inventory.quantity,
                reason: `Received PO ${purchaseOrder.purchase_number}`,
                user_id: user.userId,
                reference_id: purchaseOrder._id,
            }], { session });
        }

        // 2. Update Supplier Stats (Total Purchased & Outstanding Balance)
        const supplier = await Supplier.findById(purchaseOrder.supplier_id).session(session);
        if (supplier) {
            supplier.total_purchased = (supplier.total_purchased || 0) + purchaseOrder.total_amount;
            supplier.outstanding_balance = (supplier.outstanding_balance || 0) + purchaseOrder.total_amount;
            supplier.last_bill_date = new Date();
            supplier.last_bill_amount = purchaseOrder.total_amount;
            supplier.bills_count = (supplier.bills_count || 0) + 1;
            await supplier.save({ session });
        }

        // 3. Mark PO as Received
        purchaseOrder.status = "received";
        await purchaseOrder.save({ session });

        await session.commitTransaction();

        return res.status(200).json(
            new ApiResponse(200, "Purchase Order received and inventory updated", purchaseOrder)
        );

    } catch (error) {
        await session.abortTransaction();
        throw error instanceof ApiError ? error : new ApiError(500, "Failed to receive Purchase Order");
    } finally {
        session.endSession();
    }
});


// ─── 5. Cancel Purchase Order ─────────────────────────────────────────────────
export const cancelPurchaseOrder = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    const { id } = req.params;

    const purchaseOrder = await PurchaseOrder.findOne({
        _id: id,
        market_id: user.marketId,
    });

    if (!purchaseOrder) {
        throw new ApiError(404, "Purchase Order not found");
    }

    const ownerAccess = user.isSuperAdmin && user.permissions?.includes("*");
    if (!ownerAccess && user.builtInRole !== "admin" && !user.assignedShopsId.includes(purchaseOrder.shop_id.toString())) {
        throw new ApiError(403, "Access denied. You cannot cancel purchase orders for a shop you are not assigned to.");
    }

    if (purchaseOrder.status !== "draft") {
        throw new ApiError(400, `Cannot cancel PO. Current status is '${purchaseOrder.status}'. Only draft POs can be cancelled.`);
    }

    purchaseOrder.status = "cancelled";
    await purchaseOrder.save();

    return res.status(200).json(
        new ApiResponse(200, "Purchase Order cancelled successfully", purchaseOrder)
    );
});


// ─── 6. Return Purchase Items ─────────────────────────────────────────────────
// Returns one or more items (partially or fully) back to the supplier.
// Only works on POs with status "received".
// Deducts inventory and writes a "purchase_return" ledger entry per item.
export const returnPurchaseItems = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    const { id } = req.params;
    const { items } = req.body as { items: { product_id: string; quantity: number }[] };

    if (!Array.isArray(items) || items.length === 0) {
        throw new ApiError(400, "items array is required and cannot be empty");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const purchaseOrder = await PurchaseOrder.findOne({
            _id: id,
            market_id: user.marketId,
        }).session(session);

        if (!purchaseOrder) throw new ApiError(404, "Purchase Order not found");

        // Shop access check
        const ownerAccess = user.isSuperAdmin && user.permissions?.includes("*");
        if (!ownerAccess && user.builtInRole !== "admin" && !user.assignedShopsId.includes(purchaseOrder.shop_id.toString())) {
            throw new ApiError(403, "Access denied. You are not assigned to this shop.");
        }

        // Can only return from a received PO
        if (purchaseOrder.status !== "received") {
            throw new ApiError(400, `Cannot return items. PO status is '${purchaseOrder.status}'. Only received POs support returns.`);
        }

        for (const returnItem of items) {
            if (!returnItem.product_id || typeof returnItem.quantity !== "number" || returnItem.quantity < 1) {
                throw new ApiError(400, "Each return item must have a valid product_id and a positive quantity");
            }

            // Validate the product is actually on this PO
            const poItem = purchaseOrder.items.find(
                (i) => i.product_id.toString() === returnItem.product_id.toString()
            );
            if (!poItem) {
                throw new ApiError(400, `Product ${returnItem.product_id} is not part of this Purchase Order`);
            }
            if (returnItem.quantity > poItem.quantity) {
                throw new ApiError(
                    400,
                    `Cannot return ${returnItem.quantity} units of product ${returnItem.product_id}. Original PO quantity was ${poItem.quantity}.`
                );
            }

            // Deduct from inventory
            const inventory = await Inventory.findOne({
                market_id: purchaseOrder.market_id,
                shop_id: purchaseOrder.shop_id,
                product_id: returnItem.product_id,
            }).session(session);

            if (!inventory || inventory.quantity < returnItem.quantity) {
                throw new ApiError(
                    400,
                    `Insufficient stock to return ${returnItem.quantity} units. Current stock: ${inventory?.quantity ?? 0}`
                );
            }

            const previousStock = inventory.quantity;
            inventory.quantity -= returnItem.quantity;
            await inventory.save({ session });

            // Write ledger entry
            await StockLedger.create([{
                market_id: purchaseOrder.market_id,
                shop_id: purchaseOrder.shop_id,
                product_id: returnItem.product_id,
                quantity_changed: -returnItem.quantity,
                change_type: "purchase_return",
                previous_stock: previousStock,
                new_stock: inventory.quantity,
                reason: `Purchase return from PO ${purchaseOrder.purchase_number}`,
                user_id: user.userId,
                reference_id: purchaseOrder._id,
            }], { session });
        }

        await session.commitTransaction();

        return res.status(200).json(
            new ApiResponse(200, "Purchase return processed. Inventory updated.", {
                purchase_order_id: purchaseOrder._id,
                purchase_number: purchaseOrder.purchase_number,
                returned_items: items,
            })
        );

    } catch (error) {
        await session.abortTransaction();
        throw error instanceof ApiError ? error : new ApiError(500, "Failed to process purchase return");
    } finally {
        session.endSession();
    }
});
