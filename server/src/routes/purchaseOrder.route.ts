import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { rbac } from "../middlewares/rbac.middleware";
import { PERMISSIONS } from "../permissions/main.perm";
import {
    createPurchaseOrder,
    listPurchaseOrders,
    getPurchaseOrderById,
    receivePurchaseOrder,
    cancelPurchaseOrder,
    returnPurchaseItems,
} from "../controllers/purchaseOrder.controller";

const purchaseOrderRouter = express.Router();

// protect all with auth
purchaseOrderRouter.use(authMiddleware);

// POST /api/purchase-orders — Create a draft PO
purchaseOrderRouter.post("/", rbac([PERMISSIONS.PURCHASE_ORDER.CREATE]), createPurchaseOrder);

// GET /api/purchase-orders — List all POs
purchaseOrderRouter.get("/", rbac([PERMISSIONS.PURCHASE_ORDER.READ]), listPurchaseOrders);

// GET /api/purchase-orders/:id — Get one PO
purchaseOrderRouter.get("/:id", rbac([PERMISSIONS.PURCHASE_ORDER.READ]), getPurchaseOrderById);

// PATCH /api/purchase-orders/:id/receive — Mark received -> updates inventory and supplier
purchaseOrderRouter.patch("/:id/receive", rbac([PERMISSIONS.PURCHASE_ORDER.RECEIVE]), receivePurchaseOrder);

// PATCH /api/purchase-orders/:id/cancel — Cancel a draft PO (received POs cannot be cancelled)
purchaseOrderRouter.patch("/:id/cancel", rbac([PERMISSIONS.PURCHASE_ORDER.DELETE]), cancelPurchaseOrder);

// POST /api/purchase-orders/:id/return — Return items from a received PO back to supplier
purchaseOrderRouter.post("/:id/return", rbac([PERMISSIONS.PURCHASE_ORDER.RETURN]), returnPurchaseItems);


export default purchaseOrderRouter;

