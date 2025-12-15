import {Request,Response,NextFunction} from 'express';
import jwt from 'jsonwebtoken'
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { User } from "../models/User.model";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        marketId: string;
        role: string;
        isSuperAdmin:boolean
      };
    }
  }
}

interface JwtPayload {
  user_id: string;
  market_id: string;
  role?: string;
}

export const authMiddleware=asyncHandler(
    
    async(req:Request,res:Response,next:NextFunction)=>{
        let token:string|undefined;

         // Get token from cookie OR Authorization header
    if (req.cookies?.token) {
      console.log("Cookie :"+req.cookies)
      token = req.cookies.token;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

     if (!token) {
      throw new ApiError(401, "Authentication required");
    }

      // Verify token
    if (!process.env.JWT_SECRET) {
      throw new ApiError(500, "JWT secret not configured");
    }

     let decoded: JwtPayload;
    try {

      decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;

    } catch (error) {
      throw new ApiError(401, "Invalid or expired token");
    }

    //fetch user from DB based on userId

    //decoded payload contains user_id and market_id

    //select will include only the specified fields in the data object 
    const user=await User.findById(decoded.user_id).select("_id role status market_id isActive isSuperAdmin")
    if(!user)
    {
        throw new ApiError(401,"User not found")
    }

     if (!user.isActive) {
      throw new ApiError(403, "User account is inactive");
    }

     if (user.status !== "active") {
      throw new ApiError(403, "Please accept invitation before accessing");
    }

    req.user={
        userId:user._id.toString(),
        marketId:user.market_id.toString(),
        role:user.role,
        isSuperAdmin:user.isSuperAdmin

    };

    next();

    }

)