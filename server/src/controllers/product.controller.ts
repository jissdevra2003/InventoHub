import { Product } from "../models/Product.model";
import {Request,Response} from "express"
import {asyncHandler} from "../utils/asyncHandler"
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { productCreateValidator } from "../validators/product.validator";
import { createProductDto } from "../dtos/product.dto";



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

    const data:createProductDto=result.data;


    const existingProduct=await Product.findOne({sku:data.sku.trim(),

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
    ...data

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


export const listProducts=asyncHandler(async(req:Request,res:Response)=>{


    const user=req.user;
    if(!user)
    {
        throw new ApiError(401,"Unauthorized");
    }

        // /api/products/skip=0&limit=20
    const skip=Math.max(Number(req.query.skip) || 0,0);   //max of the two values 
    const limit=Math.min(Number(req.query.limit) || 10,50);    //minimum of the two values


    //fetch products from this market
    const products=await Product.find({
        market_id:user.marketId,
        isActive:true
    })
    .select("name sku category unit selling_price stock_quantity createdAt")
    .sort({createdAt:-1})    //sort in descending order
    .skip(skip)
    .limit(limit);

    return res
    .status(200)
    .json(
        new ApiResponse(200,"Products retrieved successfully",
            {
                items:products,    //products array
                hasMore:products.length===limit
            }
        )
    )
})