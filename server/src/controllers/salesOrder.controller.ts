import { Request, Response } from "express";
import { Types } from "mongoose";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { SalesOrder, ISaleItem } from "../models/SalesOrder.model";
import { Inventory } from "../models/Inventory.model";
import { StockLedger } from "../models/StockLedger.model";
import { createSalesOrderValidator } from "../validators/salesOrder.validator";
import { CreateSalesOrderDto } from "../dtos/salesOrder.dto";


// ─── 1. Create Sales Order (Instant Sale) ─────────────────────────────────────
// Unlike PO (draft → received), a Sales Order is completed instantly.
// It deducts inventory and records StockLedger entries in a single transaction.
export const createSalesOrder = asyncHandler(async (req: Request, res: Response) => {
const user = req.user;
if (!user) throw new ApiError(401, "Unauthorized");

// Validate request body
const result = createSalesOrderValidator.safeParse(req.body);
if (!result.success) {
const errors = result.error.issues.map(e => `${e.path.join(".")}: ${e.message}`);
throw new ApiError(400, `Validation error: ${errors.join(", ")}`);
}

const data: CreateSalesOrderDto = result.data;

// Strict shop access check for Managers and Staff
const ownerAccess = user.isSuperAdmin && user.permissions?.includes("*");
if (!ownerAccess && user.builtInRole !== "admin" && !user.assignedShopsId.includes(data.shop_id.toString())) {
throw new ApiError(403, "Access denied. You cannot create a sale for a shop you are not assigned to.");
}

// Use a transaction — we modify Inventory + StockLedger + create SalesOrder
const session = await mongoose.startSession();
session.startTransaction();

try {
// 1. Check stock availability for ALL items first (fail early)
for (const item of data.items) {
const inventory = await Inventory.findOne({
market_id: user.marketId,
shop_id: data.shop_id,
product_id: item.product_id,
}).session(session);

const availableQty = inventory ? inventory.quantity : 0;

if (availableQty < item.quantity) {
throw new ApiError(
    400,
    `Insufficient stock for product "${item.product_name || item.product_id}". ` +
    `Available: ${availableQty}, Requested: ${item.quantity}`
);
}
}

// 2. Deduct inventory and create StockLedger entries
const formattedItems: ISaleItem[] = [];

for (const item of data.items) {
const inventory = await Inventory.findOne({
market_id: user.marketId,
shop_id: data.shop_id,
product_id: item.product_id,
}).session(session);

// inventory guaranteed to exist from the check above
const previousStock = inventory!.quantity;
inventory!.quantity -= item.quantity;
await inventory!.save({ session });

// Record in StockLedger (negative quantity = stock going out)
await StockLedger.create([{
market_id: user.marketId,
shop_id: data.shop_id,
product_id: item.product_id,
quantity_changed: -item.quantity,
change_type: "sales_order",
previous_stock: previousStock,
new_stock: inventory!.quantity,
reason: `Sale created`,
user_id: user.userId,
// reference_id will be set after SO is created (below)
}], { session });

// Build formatted item (totals computed by model pre-validate hook)
formattedItems.push({
product_id: new Types.ObjectId(item.product_id),
product_name: item.product_name,
sku: item.sku,
quantity: item.quantity,
selling_price: item.selling_price,
});
}

// 3. Create the Sales Order (model hook auto-generates sale_number & computes totals)
const [salesOrder] = await SalesOrder.create([{
market_id: user.marketId,
shop_id: data.shop_id,
items: formattedItems,
customer_name: data.customer_name,
payment_method: data.payment_method || "none",
notes: data.notes,
status: "completed",
created_by: user.userId,
}], { session });

// 4. Update StockLedger entries with the SO reference_id
await StockLedger.updateMany(
{
market_id: user.marketId,
shop_id: data.shop_id,
user_id: user.userId,
change_type: "sales_order",
reason: "Sale created",
reference_id: { $exists: false },
},
{ $set: { reference_id: salesOrder._id } },
{ session }
);

await session.commitTransaction();

return res.status(201).json(
new ApiResponse(201, "Sales Order created successfully", salesOrder)
);

} catch (error) {
await session.abortTransaction();
throw error instanceof ApiError ? error : new ApiError(500, "Failed to create Sales Order");
} finally {
session.endSession();
}
});


// ─── 2. List Sales Orders ─────────────────────────────────────────────────────
export const listSalesOrders = asyncHandler(async (req: Request, res: Response) => {
const user = req.user;
if (!user) throw new ApiError(401, "Unauthorized");

const page = Math.max(parseInt(req.query.page as string) || 1, 1);
const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
const skip = (page - 1) * limit;
const status = req.query.status as string | undefined;
const shopId = req.query.shopId as string | undefined;
const startDate = req.query.startDate as string | undefined;
const endDate = req.query.endDate as string | undefined;

const filter: any = { market_id: user.marketId };

// Status filter
if (status) filter.status = status;

// Date range filter
if (startDate || endDate) {
filter.createdAt = {};
if (startDate) filter.createdAt.$gte = new Date(startDate);
if (endDate) filter.createdAt.$lte = new Date(endDate);
}

// Restrict visibility for managers and staff (same pattern as PO)
const ownerAccess = user.isSuperAdmin && user.permissions?.includes("*");
if (!ownerAccess && user.builtInRole !== "admin") {
if (shopId && !user.assignedShopsId.includes(shopId)) {
throw new ApiError(403, "Access denied for this shop.");
}
filter.shop_id = shopId ? shopId : { $in: user.assignedShopsId };
} else {
if (shopId) filter.shop_id = shopId;
}

const [salesOrders, total] = await Promise.all([
SalesOrder.find(filter)
.populate("shop_id", "name")
.populate("created_by", "name email")
.sort({ createdAt: -1 })
.skip(skip)
.limit(limit),
SalesOrder.countDocuments(filter),
]);

const totalPages = Math.ceil(total / limit);

return res.status(200).json(
new ApiResponse(200, "Sales Orders fetched successfully", {
salesOrders,
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


// ─── 3. Get Single Sales Order ────────────────────────────────────────────────
export const getSalesOrderById = asyncHandler(async (req: Request, res: Response) => {
const user = req.user;
if (!user) throw new ApiError(401, "Unauthorized");

const { id } = req.params;

const salesOrder = await SalesOrder.findOne({
_id: id,
market_id: user.marketId,
})
.populate("shop_id", "name address contact_number")
.populate("items.product_id", "name sku")
.populate("created_by", "name email");

if (!salesOrder) {
throw new ApiError(404, "Sales Order not found");
}

// Manager and Staff can only view SOs from assigned shops
const ownerAccess = user.isSuperAdmin && user.permissions?.includes("*");
if (!ownerAccess && user.builtInRole !== "admin" && !user.assignedShopsId.includes(salesOrder.shop_id.toString())) {
throw new ApiError(403, "Access denied. You are not assigned to this shop.");
}

return res.status(200).json(
new ApiResponse(200, "Sales Order fetched successfully", salesOrder)
);
});


// ─── 4. Cancel Sales Order (Restore Inventory) ───────────────────────────────
// Cancelling a completed SO reverses the stock deduction.
export const cancelSalesOrder = asyncHandler(async (req: Request, res: Response) => {
const user = req.user;
if (!user) throw new ApiError(401, "Unauthorized");

//id here is sales order id
const { id } = req.params;

const session = await mongoose.startSession();
session.startTransaction();

try {
const salesOrder = await SalesOrder.findOne({
_id: id,
market_id: user.marketId,
}).session(session);

if (!salesOrder) {
throw new ApiError(404, "Sales Order not found");
}

// Manager and Staff shop isolation
const ownerAccess = user.isSuperAdmin && user.permissions?.includes("*");
if (!ownerAccess && user.builtInRole !== "admin" && !user.assignedShopsId.includes(salesOrder.shop_id.toString())) {
throw new ApiError(403, "Access denied. You cannot cancel sales orders for a shop you are not assigned to.");
}

if (salesOrder.status !== "completed") {
throw new ApiError(400, `Cannot cancel SO. Current status is '${salesOrder.status}'. Only completed SOs can be cancelled.`);
}

// Restore inventory for each item
for (const item of salesOrder.items) {
const inventory = await Inventory.findOne({
market_id: salesOrder.market_id,
shop_id: salesOrder.shop_id,
product_id: item.product_id,
}).session(session);

if (!inventory) {
throw new ApiError(500, `Inventory record not found for product ${item.product_id}. Cannot restore stock.`);
}

const previousStock = inventory.quantity;
inventory.quantity += item.quantity;
await inventory.save({ session });

// Record reverse entry in StockLedger (positive = stock coming back)
await StockLedger.create([{
market_id: salesOrder.market_id,      // "64aa11bb22cc33dd44ee55ff" → Organization ID

shop_id: salesOrder.shop_id,          // "64aa11bb22cc33dd44ee6600" → Shop where sale happened

product_id: item.product_id,          // "64aa11bb22cc33dd44ee7700" → Product (e.g., Rice)

quantity_changed: item.quantity,      // 5 → Quantity added back after cancellation

change_type: "sales_return",          // "sales_return" → Stock came back due to cancel

previous_stock: previousStock,        // 15 → Stock before cancellation

new_stock: inventory.quantity,        // 20 → Stock after restoration

reason: `Cancelled SO ${salesOrder.sale_number}`,  
// "Cancelled SO SO-00023" → Human-readable reason

user_id: user.userId,                 // "64aa11bb22cc33dd44ee9999" → User who performed action

reference_id: salesOrder._id,         // "65f1a2b3c4d5e6f7890abc12" → SalesOrder ID

}], { session });
}

// Mark SO as cancelled
salesOrder.status = "cancelled";
await salesOrder.save({ session });

await session.commitTransaction();

return res.status(200).json(
new ApiResponse(200, "Sales Order cancelled and inventory restored", salesOrder)
);

} catch (error) {
await session.abortTransaction();
throw error instanceof ApiError ? error : new ApiError(500, "Failed to cancel Sales Order");
} finally {
session.endSession();
}
});


// ─── 5. Get Sales Summary ─────────────────────────────────────────────────────
// Returns basic stats: total count, total revenue, total items sold.
// Supports optional shopId, startDate, endDate filters.
export const getSalesSummary = asyncHandler(async (req: Request, res: Response) => {
const user = req.user;
if (!user) throw new ApiError(401, "Unauthorized");

const shopId = req.query.shopId as string | undefined;
const startDate = req.query.startDate as string | undefined;
const endDate = req.query.endDate as string | undefined;

const matchFilter: any = {
market_id: new Types.ObjectId(user.marketId),
status: "completed", // only count completed sales
};

// Date range
if (startDate || endDate) {
matchFilter.createdAt = {};
if (startDate) matchFilter.createdAt.$gte = new Date(startDate);
if (endDate) matchFilter.createdAt.$lte = new Date(endDate);
}

// Shop filter + Admin bypass
const ownerAccess = user.isSuperAdmin && user.permissions?.includes("*");
if (!ownerAccess && user.builtInRole !== "admin") {
if (shopId && !user.assignedShopsId.includes(shopId)) {
throw new ApiError(403, "Access denied for this shop.");
}
if (shopId) {
matchFilter.shop_id = new Types.ObjectId(shopId);
} else {
matchFilter.shop_id = { $in: user.assignedShopsId.map((id: string) => new Types.ObjectId(id)) };
}
} else {
if (shopId) matchFilter.shop_id = new Types.ObjectId(shopId);
}

const result = await SalesOrder.aggregate([
{ $match: matchFilter },
{ $unwind: "$items" },
{
$group: {
_id: null,
totalOrders: { $addToSet: "$_id" },     // unique SO ids
totalRevenue: { $sum: "$items.total" },  // sum of all line totals
totalItemsSold: { $sum: "$items.quantity" },
},
},
{
$project: {
_id: 0,
totalOrders: { $size: "$totalOrders" },
totalRevenue: 1,
totalItemsSold: 1,
},
},
]);

const summary = result[0] || { totalOrders: 0, totalRevenue: 0, totalItemsSold: 0 };

return res.status(200).json(
new ApiResponse(200, "Sales summary fetched successfully", summary)
);
});


// ─── 6. Return Sale Items (Partial or Full) ───────────────────────────────────
// Processes a customer return against a COMPLETED sales order.
// Accepts an array of { product_id, quantity } items to return.
// Restores inventory and writes a "sales_return" ledger entry per item.
// NOTE: for a FULL cancellation use the cancelSalesOrder endpoint instead.
export const returnSaleItems = asyncHandler(async (req: Request, res: Response) => {
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
        const salesOrder = await SalesOrder.findOne({
            _id: id,
            market_id: user.marketId,
        }).session(session);

        if (!salesOrder) throw new ApiError(404, "Sales Order not found");

        // Shop access check
        const ownerAccess = user.isSuperAdmin && user.permissions?.includes("*");
        if (!ownerAccess && user.builtInRole !== "admin" && !user.assignedShopsId.includes(salesOrder.shop_id.toString())) {
            throw new ApiError(403, "Access denied. You are not assigned to this shop.");
        }

        // Can only return from a completed SO
        if (salesOrder.status !== "completed") {
            throw new ApiError(400, `Cannot return items. SO status is '${salesOrder.status}'. Only completed sales orders support returns.`);
        }

        for (const returnItem of items) {
            if (!returnItem.product_id || typeof returnItem.quantity !== "number" || returnItem.quantity < 1) {
                throw new ApiError(400, "Each return item must have a valid product_id and a positive quantity");
            }

            // Validate the product is on this SO
            const soItem = salesOrder.items.find(
                (i) => i.product_id.toString() === returnItem.product_id.toString()
            );
            if (!soItem) {
                throw new ApiError(400, `Product ${returnItem.product_id} is not part of this Sales Order`);
            }
            if (returnItem.quantity > soItem.quantity) {
                throw new ApiError(
                    400,
                    `Cannot return ${returnItem.quantity} units of product ${returnItem.product_id}. Original sold quantity was ${soItem.quantity}.`
                );
            }

            // Find or create inventory record and restore stock
            let inventory = await Inventory.findOne({
                market_id: salesOrder.market_id,
                shop_id: salesOrder.shop_id,
                product_id: returnItem.product_id,
            }).session(session);

            const previousStock = inventory ? inventory.quantity : 0;

            if (!inventory) {
                // Edge case: inventory record was deleted — recreate it
                inventory = new Inventory({
                    market_id: salesOrder.market_id,
                    shop_id: salesOrder.shop_id,
                    product_id: returnItem.product_id,
                    quantity: returnItem.quantity,
                });
            } else {
                inventory.quantity += returnItem.quantity;
            }
            await inventory.save({ session });

            // Write ledger entry
            await StockLedger.create([{
                market_id: salesOrder.market_id,
                shop_id: salesOrder.shop_id,
                product_id: returnItem.product_id,
                quantity_changed: returnItem.quantity,     // positive = stock coming back
                change_type: "sales_return",
                previous_stock: previousStock,
                new_stock: inventory.quantity,
                reason: `Sales return from SO ${salesOrder.sale_number}`,
                user_id: user.userId,
                reference_id: salesOrder._id,
            }], { session });
        }

        await session.commitTransaction();

        return res.status(200).json(
            new ApiResponse(200, "Sales return processed. Inventory restored.", {
                sales_order_id: salesOrder._id,
                sale_number: salesOrder.sale_number,
                returned_items: items,
            })
        );

    } catch (error) {
        await session.abortTransaction();
        throw error instanceof ApiError ? error : new ApiError(500, "Failed to process sales return");
    } finally {
        session.endSession();
    }
});

