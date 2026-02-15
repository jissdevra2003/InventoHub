import { Request, Response } from "express";
import { Inventory } from "../models/Inventory.model";
import { Shop } from "../models/Shop.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import asyncHandler from "../utils/asyncHandler";

export const listInventoryByShop = asyncHandler(
  async (req: Request, res: Response) => {

    const user = req.user;
    if (!user) {
      throw new ApiError(401, "Unauthorized");
    }

    const { shopId } = req.params;

    // 1. Check shop exists in same market
    const shop = await Shop.findOne({
      _id: shopId,
      market_id: user.marketId,
      isActive: true,
    });

    if (!shop) {
      throw new ApiError(404, "Shop not found");
    }

    // 2. Manager can access only assigned shops
    if (
      user.builtInRole === "manager" &&
      !shop.managers?.some(
        (id:any) => id.toString() === user.userId
      )
    ) {
      throw new ApiError(403, "Access denied for this shop");
    }

    // 3. Get inventory for this shop
    const inventory = await Inventory.find({
      shop_id: shopId,
      market_id: user.marketId,
    }).populate("product_id");

    // 4. Build response
    const items = inventory
      .filter(inv => inv.product_id && inv.product_id.isActive !== false)
      .map(inv => {
        let status = "IN_STOCK";

        if (inv.quantity === 0)
            {
            status = "OUT_OF_STOCK";
            }
        else if (
          inv.min_stock !== undefined &&
          inv.quantity <= inv.min_stock
        ) 
        {
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
