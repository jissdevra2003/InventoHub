import { Product } from "../models/Product.model";
import {Request,Response} from "express"
import {asyncHandler} from "../utils/asyncHandler"
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { productCreateValidator } from "../validators/product.validator";



export const createProduct=asyncHandler(async (req:Request,res:Response)=>{


    //req.user added in auth middleware 
    const user=req.user;

    if(!user) throw new ApiError(401,"Unauthorized");

    const result=productCreateValidator.safeParse(req.body)

    if(!result.success)
    {
        const errors=result.error.issues.map(err=>({
            field:err.path.join("."),
            message:err.message

        }));

        throw new ApiError(400,`Validation error :${errors.map(e=>`${e.field}:${e.message}`).join(", ")}`);                                 
    }

    const {
        name,
        sku,
        description,
        category,
      unit,
      barcode,
      cost_price,
      selling_price,
      stock_quantity,
      image_urls,
      attributes,

    }=result.data;


    const existingProduct=await Product.findOne({sku,

        market_id:user.marketId
    });

    if(existingProduct)
    {
        throw new ApiError(
        409,
        "Product with this SKU already exists in this market"
      );
    }


    //create product and save in the database
    const product=await Product.create({
    market_id:user.marketId,
    name,
    sku,
    description,
    category,
    unit,
    barcode,
    cost_price,
    selling_price,
    stock_quantity,
    image_urls,
    attributes

    });

    const responseData={
        id:product._id,
        name:product.name,
        sku:product.sku,
        category:product.category,
        unit:product.unit,
        selling_price:product.selling_price,
        stock_quantity:product.stock_quantity,
        createdAt:product.createdAt

    }

    return res
    .status(201)
    .json(
        new ApiResponse(201,
            "Product created successfully",
            responseData

        )
    )
})