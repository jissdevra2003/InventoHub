import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { rbac } from "../middlewares/rbac.middleware";
import { PERMISSIONS } from "../permissions/main.perm";
import {
  listPendingInvites,
  revokeInvite,
} from "../controllers/invite.controller";

const inviteRouter = express.Router();

// GET /api/invites — List pending invitations
inviteRouter.get(
  "/",
  authMiddleware,
  rbac([PERMISSIONS.USER.INVITE]),
  listPendingInvites
);

// DELETE /api/invites/:inviteId — Revoke a pending invitation
inviteRouter.delete(
  "/:inviteId",
  authMiddleware,
  rbac([PERMISSIONS.USER.INVITE]),
  revokeInvite
);

export default inviteRouter;
