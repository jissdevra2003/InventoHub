import { Request, Response } from "express";
import { Invite } from "../models/Invite.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";


/**
 * List Pending / Active Invites
 * Returns all invites for the current user's market.
 * Admins & SuperAdmins see all invites; managers see only their own.
 */
export const listPendingInvites = asyncHandler(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    const filter: any = {
      market_id: user.marketId,
      status: "invited",
    };

    // Non-admin users only see invites they sent
    const ownerAccess = user.isSuperAdmin && user.permissions?.includes("*");
    if (!ownerAccess && user.builtInRole !== "admin") {
      filter.invited_by = user.userId;
    }

    const invites = await Invite.find(filter)
      .populate("invited_by", "name email")
      .populate("assignedShops_id", "name")
      .sort({ createdAt: -1 });

    const items = invites.map((inv) => ({
      id: inv._id,
      email: inv.email,
      role: inv.role,
      permissions: inv.permissions,
      assignedShops: inv.assignedShops_id
        ? (inv.assignedShops_id as any[]).map((s: any) => ({
            id: s._id,
            name: s.name,
          }))
        : [],
      invitedBy: inv.invited_by
        ? {
            id: (inv.invited_by as any)._id,
            name: (inv.invited_by as any).name,
            email: (inv.invited_by as any).email,
          }
        : null,
      status: inv.status,
      expiresAt: inv.expires_at,
      createdAt: inv.createdAt,
    }));

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Pending invites fetched successfully", items)
      );
  }
);


/**
 * Revoke / Cancel a Pending Invite
 * Marks the invite as "declined" so it can no longer be accepted.
 */
export const revokeInvite = asyncHandler(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    const { inviteId } = req.params;

    const invite = await Invite.findOne({
      _id: inviteId,
      market_id: user.marketId,
      status: "invited",
    });

    if (!invite) {
      throw new ApiError(404, "Invite not found or already processed");
    }

    // Non-admin users can only revoke invites they sent
    const ownerAccess = user.isSuperAdmin && user.permissions?.includes("*");
    if (
      !ownerAccess &&
      user.builtInRole !== "admin" &&
      invite.invited_by.toString() !== user.userId
    ) {
      throw new ApiError(403, "You can only revoke invites you sent");
    }

    invite.status = "declined";
    invite.expires_at = null as any;
    invite.declined_at = new Date();
    await invite.save();

    return res
      .status(200)
      .json(new ApiResponse(200, "Invite revoked successfully"));
  }
);
