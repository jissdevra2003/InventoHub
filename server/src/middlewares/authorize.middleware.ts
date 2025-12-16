import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";




  export const authorize = (requiredPermissions: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(401, "Unauthorized");
    }

    // SuperAdmin bypass
    if (req.user.isSuperAdmin && req.user.permissions?.includes("*")) {
      return next();
    }

    if (requiredPermissions.length === 0) {
      throw new ApiError(403, "Access denied");
    }

    const userPermissions = req.user.permissions || [];

    const hasPermission = requiredPermissions.every(p =>
      userPermissions.includes(p)
    );

    if (!hasPermission) {
      throw new ApiError(403, "Insufficient permissions");
    }

    next();
  };
};

 