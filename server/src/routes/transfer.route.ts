import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { rbac } from "../middlewares/rbac.middleware";
import { PERMISSIONS } from "../permissions/main.perm";
import {
    createTransfer,
    listTransfers,
    getTransferById,
    markInTransit,
    completeTransfer,
    cancelTransfer,
} from "../controllers/transfer.controller";

const transferRouter = express.Router();

// Protect all routes with auth
transferRouter.use(authMiddleware);

// POST /api/transfers — Initiate a new transfer request
transferRouter.post("/", rbac([PERMISSIONS.TRANSFER.CREATE]), createTransfer);

// GET /api/transfers — List all transfers (shop-isolated for non-admins)
transferRouter.get("/", rbac([PERMISSIONS.TRANSFER.READ]), listTransfers);

// GET /api/transfers/:id — Get a single transfer
transferRouter.get("/:id", rbac([PERMISSIONS.TRANSFER.READ]), getTransferById);

// PATCH /api/transfers/:id/in-transit — Source shop dispatches the goods
transferRouter.patch("/:id/in-transit", rbac([PERMISSIONS.TRANSFER.UPDATE]), markInTransit);

// PATCH /api/transfers/:id/complete — Destination shop confirms receipt (writes ledger)
transferRouter.patch("/:id/complete", rbac([PERMISSIONS.TRANSFER.UPDATE]), completeTransfer);

// PATCH /api/transfers/:id/cancel — Cancel a pending transfer
transferRouter.patch("/:id/cancel", rbac([PERMISSIONS.TRANSFER.CANCEL]), cancelTransfer);

export default transferRouter;
