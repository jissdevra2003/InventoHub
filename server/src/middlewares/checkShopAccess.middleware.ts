import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import { Shop } from "../models/Shop.model";
import { Types } from "mongoose";


declare global {
    namespace Express {
        interface Request {
            shop?: {
                shopId: string;
                marketId: string;
                createdBy: string;
            }
        }
    }
}


export const checkShopAccess = async (req: Request, res: Response, next: NextFunction) => {

    const shopId = req.params.shopId || req.body.shopId;
    if (!shopId) {
        throw new ApiError(400, "Shop ID is required");
    }

    if(!req.user){
        throw new ApiError(401, "Unauthorized");
    }

    if (req.user.isSuperAdmin && req.user.permissions?.includes("*")) { 
        return next();
    }

    const shop = await Shop.findById(shopId).select('_id market_id created_by');
    if (!shop) {
        throw new ApiError(404, "Shop not found");
    }

    if (shop.market_id.toString() !== req.user.marketId) {
        throw new ApiError(403, "Shop does not belong to this market. Access to this shop is forbidden");
    }

    const userId = req.user.userId;
    const shopIdStr = shop._id.toString();

  const hasAccess =
        // shop.created_by?.toString() === userId ||
        req.user.assignedShopsId.includes(shopIdStr);
    // ||          shop.managers.some((id: Types.ObjectId) => id.toString() === userId) ||
    // shop.staff.some((id: Types.ObjectId) => id.toString() === userId);


  if (!hasAccess) {
    throw new ApiError(403, "You are not assigned to this shop");
  }

    req.shop = {
        shopId: shopIdStr,
        marketId: shop.market_id.toString(),
        createdBy: shop.created_by?.toString() || ''
    }
    next();
};