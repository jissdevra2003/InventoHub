import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { Market } from "../models/Market.model";


// ─── Update Market Profile ────────────────────────────────────────────────────
// Only the SuperAdmin can update their market/company profile.
// Allowed fields: market_name, address, logoUrl, gstNumber, industryType,
//                 country, state, city, postal_code, currency, timezone

export const updateMarketProfile = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    // SuperAdmin-only check
    const ownerAccess = user.isSuperAdmin && user.permissions?.includes("*");
    if (!ownerAccess) {
        throw new ApiError(403, "Only the Super Admin can update the market profile.");
    }

    // Whitelist of updatable fields (prevents accidental changes to critical fields)
    const allowedFields = [
        "market_name", "address", "logoUrl", "gstNumber", "industryType",
        "country", "state", "city", "postal_code", "currency", "timezone",
        "market_phone",
    ];

    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
            updates[field] = req.body[field];
        }
    }

    if (Object.keys(updates).length === 0) {
        throw new ApiError(400, "No valid fields provided for update.");
    }

    const updatedMarket = await Market.findByIdAndUpdate(
        user.marketId,
        { $set: updates },
        { new: true, runValidators: true }
    ).select("-__v");

    if (!updatedMarket) {
        throw new ApiError(404, "Market not found.");
    }

    return res.status(200).json(
        new ApiResponse(200, "Market profile updated successfully", updatedMarket)
    );
});
