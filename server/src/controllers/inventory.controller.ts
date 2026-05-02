import { Request, Response } from "express";
import { Inventory } from "../models/Inventory.model";
import { Shop } from "../models/Shop.model";
import { StockLedger } from "../models/StockLedger.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import asyncHandler from "../utils/asyncHandler";
import { updateInventoryValidator } from "../validators/inventory.validator";
import { UpdateInventoryDto } from "../dtos/inventory.dto";

export const listInventoryByShop = asyncHandler(
  async (req: Request, res: Response) => {

    const user = req.user;
    if (!user) {
      throw new ApiError(401, "Unauthorized");
    }

    const { shopId } = req.params;

    // 1. Find the active shop that belongs to the user's market using the given shop ID
    const shop = await Shop.findOne({
      _id: shopId,
      market_id: user.marketId,
      isActive: true,
    });

    if (!shop) {
      throw new ApiError(404, "Shop not found");
    }

    // 2. Manager and Staff can access only assigned shops
    const ownerAccess = user.isSuperAdmin && user.permissions?.includes("*");
    if (
      !ownerAccess && user.builtInRole !== "admin" &&
      !user.assignedShopsId.includes(shopId.toString())
    ) {
      throw new ApiError(403, "Access denied for this shop");
    }

    // 3. Fetch all inventory items for this specific shop and market, and include full details of the linked products
    const inventory = await Inventory.find({
      shop_id: shopId,
      market_id: user.marketId,
    }).populate("product_id");

    // 4. Build response
    const items = inventory
    //If a product was soft deleted, it should not appear in inventory results.
      .filter(inv => inv.product_id && inv.product_id.isActive !== false)
      .map(inv => {
        let status = "IN_STOCK";

        if (inv.quantity === 0) {
          status = "OUT_OF_STOCK";
        }
        else if (
          inv.min_stock !== undefined &&
          inv.quantity <= inv.min_stock
        ) {
          status = "LOW_STOCK";
        }

        return {
          productId: inv.product_id._id,
          name: inv.product_id.name,
          sku: inv.product_id.sku,
          selling_price: inv.product_id.selling_price,
          quantity: inv.quantity,
          stock_status: status,
        };
      });

    return res.status(200).json(
      new ApiResponse(200, "Inventory fetched successfully", items)
    );
  }
);

/**
 * Increase Inventory (Stock In)
 * Logic: quantity += value
 */
export const increaseInventory = asyncHandler(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    const result = updateInventoryValidator.safeParse(req.body);
    if (!result.success) {
      throw new ApiError(400, "Validation failed: " + result.error.issues.map(i => i.message).join(", "));
    }

    const { shopId, productId, quantity, reason }: UpdateInventoryDto = result.data;

    const ownerAccess = user.isSuperAdmin && user.permissions?.includes("*");
    if (!ownerAccess && user.builtInRole !== "admin" && !user.assignedShopsId.includes(shopId.toString())) {
      throw new ApiError(403, "Access denied. You are not assigned to this shop.");
    }

    // 1. Look for an existing inventory record for this specific product in the given shop and market
    let inventory = await Inventory.findOne({
      shop_id: shopId,
      product_id: productId,
      market_id: user.marketId,
    });

    const previousStock = inventory ? inventory.quantity : 0;

    if (!inventory) {
      inventory = new Inventory({
        shop_id: shopId,
        product_id: productId,
        market_id: user.marketId,
        quantity: 0,
      });
    }

    // 2. Increase the stock count and save the new total to the database
    inventory.quantity += quantity;
    await inventory.save(); // Updates the existing product record in the database

    // 3. Create a history log entry showing how much stock was added so we can track the transaction
    await StockLedger.create({
      market_id: user.marketId,
      shop_id: shopId,
      product_id: productId,
      quantity_changed: quantity,
      change_type: "stock_adjustment",
      previous_stock: previousStock,
      new_stock: inventory.quantity,
      reason: reason || "Manual stock increase",
      user_id: user.userId,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, "Inventory increased successfully", inventory));
  }
);

/**
 * Decrease Inventory (Stock Out)
 * Logic: quantity -= value (if sufficient)
 */
export const decreaseInventory = asyncHandler(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    const result = updateInventoryValidator.safeParse(req.body);
    if (!result.success) {
      throw new ApiError(400, "Validation failed: " + result.error.issues.map(i => i.message).join(", "));
    }

    const { shopId, productId, quantity, reason }: UpdateInventoryDto = result.data;

    const ownerAccess = user.isSuperAdmin && user.permissions?.includes("*");
    if (!ownerAccess && user.builtInRole !== "admin" && !user.assignedShopsId.includes(shopId.toString())) {
      throw new ApiError(403, "Access denied. You are not assigned to this shop.");
    }

    // 1. Find the current inventory details for this product in the given shop
    const inventory = await Inventory.findOne({
      shop_id: shopId,
      product_id: productId,
      market_id: user.marketId,
    });

    if (!inventory || inventory.quantity < quantity) {
      throw new ApiError(400, "Insufficient stock or product not found in shop");
    }

    const previousStock = inventory.quantity;

    // 2. Decrease the stock count and save the updated amount to the database
    inventory.quantity -= quantity;
    await inventory.save(); // Removes the stock from our database record

    // 3. Create a history log entry showing how much stock was removed to keep a paper trail
    await StockLedger.create({
      market_id: user.marketId,
      shop_id: shopId,
      product_id: productId,
      quantity_changed: -quantity,
      change_type: "stock_adjustment",
      previous_stock: previousStock,
      new_stock: inventory.quantity,
      reason: reason || "Manual stock decrease",
      user_id: user.userId,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, "Inventory decreased successfully", inventory));
  }
);

/**
 * Low Stock Alerts
 * Logic: quantity <= min_stock
 */
export const listLowStockInventory = asyncHandler(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    // Build the query filter securely
    const filter: any = {
      market_id: user.marketId,
      min_stock: { $exists: true, $ne: null },
      $expr: { $lte: ["$quantity", "$min_stock"] }
    };

    const ownerAccess = user.isSuperAdmin && user.permissions?.includes("*");
    if (!ownerAccess && user.builtInRole !== "admin") {
      filter.shop_id = { $in: user.assignedShopsId };
    }

    // Search the database for all inventory items that match our low-stock filters,
    // and pull in the full details of the related products and their shops at the same time
    const lowStockItems = await Inventory.find(filter).populate("product_id shop_id");

    const items = lowStockItems.map((inv) => ({
      inventoryId: inv._id,
      shop: {
        id: inv.shop_id._id,
        name: inv.shop_id.name,
      },
      product: {
        id: inv.product_id._id,
        name: inv.product_id.name,
        sku: inv.product_id.sku,
      },
      quantity: inv.quantity,
      minStock: inv.min_stock,
    }));

    return res
      .status(200)
      .json(new ApiResponse(200, "Low stock inventory fetched successfully", items));
  }
);

