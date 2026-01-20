import { Shop } from "../models/Shop.model";
import asyncHandler from "../utils/asyncHandler";
import { Request, Response } from "express";
import { createShopValidator } from "../validators/shop.validator";
import { ApiError } from "../utils/ApiError";
import { createShopDto } from "../dtos/shop.dto";
import { ApiResponse } from "../utils/ApiResponse";



export const createShop = asyncHandler(async (req: Request, res: Response) => { 
 
    const result = createShopValidator.safeParse(req.body);

    if (!result.success) {
        const errors = result.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
        }));

        throw new ApiError(400, `Validation Error: ${errors.map(e => e.field + ' => ' + e.message ).join('; ')}`);
    }

    const data : createShopDto = result.data;

    if (!data) {
        throw new ApiError(400, "Invalid data");
    }

    const { name, address, city, state, country, postal_code, contact_number, contact_email } = data;

    //Same market cannot have two shops with the same name
    const existingShop = await Shop.findOne({
        market_id: req.user!.marketId,
        name: name.trim()
    });
    if (existingShop) {
        throw new ApiError(409, "Shop with the same name already exists in the market");
    }

    const newShop = await Shop.create({
        name: name.trim(),
        market_id: req.user!.marketId,
        created_by: req.user!.userId,
        address,
        city,
        state,
        country,
        postal_code,
        contact_number,
        contact_email
    });

    res.status(201).json(new ApiResponse(
        201,
        "Shop created successfully",
        newShop));
});