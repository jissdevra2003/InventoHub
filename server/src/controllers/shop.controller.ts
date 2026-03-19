import { Shop } from "../models/Shop.model";
import asyncHandler from "../utils/asyncHandler";
import { Request, Response } from "express";
import { createShopValidator } from "../validators/shop.validator";
import { ApiError } from "../utils/ApiError";
import { createShopDto } from "../dtos/shop.dto";
import { ApiResponse } from "../utils/ApiResponse";
import { Types } from "mongoose";
import { includes } from "zod";
import { User } from "../models/User.model";



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

export const assignUserToShop = asyncHandler(async (req: Request, res: Response) => { 

    const { shopId } = req.params;
    // const { userId } = req.body; //it is the id of user to be assigned to shop
    const { email } = req.body; //it is the email of user to be assigned to shop

    if (!shopId) {
        throw new ApiError(400, "Shop ID is required");
    }   

    if (!email) {
        throw new ApiError(400, "User email is required");
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if(user._id.toString() === req.user!.userId){
        throw new ApiError(400, "You cannot assign yourself to the shop");
    }

    if(user.status !== "active"){
        throw new ApiError(403, "Only active users can be assigned to shops");
    }

    // do not assign inactive users. Maybe due to logut or admin deactivation or deletion
    if(!user.isActive){
        throw new ApiError(403, "Inactive users cannot be assigned to shops");
    }

    //market isolation : both assigner and assignee market id should be same.
    if(user.market_id.toString() !== req.user!.marketId){
        throw new ApiError(403, "User does not belong to this market");
    }

    //prevent duplicate assignment
    const isAlreadyAssigned = user.assignedShops_id?.some((id: any) => id.toString() === shopId);
    if(isAlreadyAssigned){
        throw new ApiError(409, "User is already assigned to this shop");
    }

    //Assign user to shop
    if(!user.assignedShops_id) user.assignedShops_id = [];
    user.assignedShops_id.push(shopId as any);
    await user.save();


    return res.status(200).json(new ApiResponse(
        200,
        "User assigned to shop successfully",
        {   email,
            userId: user._id,
            shopId
        }
    ));

});

export const removeUserFromShop = asyncHandler(async (req: Request, res: Response) => {

    const { shopId } = req.params;
    // const { userId } = req.body; //it is the id of user to be removed from shop
    const { email } = req.body; //it is the email of user to be removed from shop

    if (!shopId) {
        throw new ApiError(400, "Shop ID is required");
    }   
    if(!email){
        throw new ApiError(400, "User email is required");
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    const userId = user._id;

    // prevent removing self
    if(userId === req.user!.userId){
        throw new ApiError(400, "You cannot remove yourself from the shop");
    }

    //market isolation : both remover and removee market id should be same.
    if(user.market_id.toString() !== req.user!.marketId){
        throw new ApiError(403, "User does not belong to this market");
    }

    //check if user is assigned to shop
    const isAssigned = user.assignedShops_id?.some((id:Types.ObjectId) => id.toString() === shopId);
    if (!isAssigned) {
        throw new ApiError(409, "User is not assigned to this shop");
    }

    //Remove user from shop
    if (user.assignedShops_id) {
        user.assignedShops_id = user.assignedShops_id.filter((id: Types.ObjectId) => id.toString() !== shopId);
    }

    await user.save();

    return res.status(200).json(new ApiResponse(
        200,
        "User removed from shop successfully",
        {
            userId: user._id,
            shopId
        }
    ));

});

export const listShops = asyncHandler(async (req: Request, res: Response) => {

    if (!req.user) {
        throw new ApiError(401, "Unauthorized access");
    }

    let shops;

    if (req.user.isSuperAdmin && req.user.permissions?.includes("*")) {
        shops = await Shop.find({ market_id: req.user.marketId });
    }
    else {
        shops = await Shop.find({
            market_id: req.user.marketId,
            _id: { $in: req.user.assignedShopsId }
        });
    }

    return res.status(200).json(new ApiResponse(
        200,
        "Shops fetched successfully",
        shops
    ));


});

export const deleteShop = asyncHandler(async (req: Request, res: Response) => {
  // another logic do not delete shop just make  isActive false for this controller.
    const { shopId } = req.params;
    if (!shopId) {  
        throw new ApiError(400, "Shop ID is required");
    }

    const shop = await Shop.findById(shopId);
    if (!shop) {
        throw new ApiError(404, "Shop not found");
    }

    if (!shop.isActive) {
    throw new ApiError(400, "Shop already deleted");
    }

    //market isolation
    if (shop.market_id.toString() !== req.user!.marketId) {
        throw new ApiError(403, "Shop does not belong to this market");
    }

    //remove all user assignments to this shop before deletion(soft) or Give error that is done in below code
    // await User.updateMany(
    //     { assignedShops_id: shop._id },
    //     { $pull: { assignedShops_id: shop._id } }
    // );

    //Optinal safety check: prevent deletion if there are users assigned to this shop
    const assignedUsersCount = await User.countDocuments({
        assignedShops_id: shop._id
    });

    if (assignedUsersCount > 0) {
        throw new ApiError(409, "Cannot delete shop. There are users assigned to this shop.");
    }

    // permanently deleted
    // await shop.remove();
    
    //partially deactivate recommended
    shop.isActive = false;
    await shop.save();

    return res.status(200).json(new ApiResponse(
        200,
        "Shop deleted successfully",
        {
            shopId: shop._id
        }
    ));

});