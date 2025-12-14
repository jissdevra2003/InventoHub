import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";


export const rbac=(allowedRoles:string[]=[])=>{

    return (req:Request,res:Response,next:NextFunction)=>{
        if(!req.user)
        {
            throw new ApiError(401,"Unauthorized");
        }

            //superAdmin bypasses all permissions 
        if(req.user.isSuperAdmin)
        {
            return next();
        }

        if (allowedRoles.length === 0) {
      throw new ApiError(403, "Access denied");
    }

      // Role not allowed
    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, "Insufficient permissions");
    }

    next();
    };
};