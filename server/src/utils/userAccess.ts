import { ApiError } from "../utils/ApiError";
import { IUser } from "../models/User.model";

export const canUpdateUser = (updater: any, target: IUser) => {

    
  // SuperAdmin → full access
  if (updater.isSuperAdmin) return;

  // Admin rules
  if (updater.builtInRole === "admin") {
    if (target.isSuperAdmin) {
      throw new ApiError(403, "Cannot update SuperAdmin");
    }
    return;
  }

  // Manager rules
  if (updater.builtInRole === "manager") {
    if (target.builtInRole !== "staff") {
      throw new ApiError(403, "Managers can update only staff");
    }
    if (target.createdBy?.toString() !== updater.userId) {
      throw new ApiError(403, "Not allowed to update this user as you have not invited/created this user.");
    }
    return;
  }

  // Staff → blocked
  throw new ApiError(403, "Access denied");
};
