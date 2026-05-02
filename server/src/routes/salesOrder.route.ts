import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { rbac } from "../middlewares/rbac.middleware";
import { PERMISSIONS } from "../permissions/main.perm";
import {
    createSalesOrder,
    listSalesOrders,
    getSalesOrderById,
    cancelSalesOrder,
    getSalesSummary,
    returnSaleItems,
} from "../controllers/salesOrder.controller";

const salesOrderRouter = express.Router();

// protect all with auth
salesOrderRouter.use(authMiddleware);

// GET /api/sales-orders/summary — Sales stats (must be before /:id to avoid conflict)
salesOrderRouter.get("/summary", rbac([PERMISSIONS.SALES_ORDER.READ]), getSalesSummary);

// POST /api/sales-orders — Create a new sale (instant)
salesOrderRouter.post("/", rbac([PERMISSIONS.SALES_ORDER.CREATE]), createSalesOrder);

// GET /api/sales-orders — List all SOs
salesOrderRouter.get("/", rbac([PERMISSIONS.SALES_ORDER.READ]), listSalesOrders);

// GET /api/sales-orders/:id — Get one SO
salesOrderRouter.get("/:id", rbac([PERMISSIONS.SALES_ORDER.READ]), getSalesOrderById);

// PATCH /api/sales-orders/:id/cancel — Full cancellation (restores all inventory)
salesOrderRouter.patch("/:id/cancel", rbac([PERMISSIONS.SALES_ORDER.CANCEL]), cancelSalesOrder);

// POST /api/sales-orders/:id/return — Partial or full return of items (restores inventory)
salesOrderRouter.post("/:id/return", rbac([PERMISSIONS.SALES_ORDER.RETURN]), returnSaleItems);


export default salesOrderRouter;

