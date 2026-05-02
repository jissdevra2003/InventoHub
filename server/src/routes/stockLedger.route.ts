import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { rbac } from "../middlewares/rbac.middleware";
import { PERMISSIONS } from "../permissions/main.perm";
import {
    getLedgerActivity,
    getShrinkageReport,
    getStockVelocity,
    getInventoryFlowSummary,
    getReorderForecast,
} from "../controllers/stockLedger.controller";

const stockLedgerRouter = express.Router();

// Protect all routes with auth
stockLedgerRouter.use(authMiddleware);

// GET /api/stock-ledger/activity
// Paginated audit trail — filterable by shop, product, change_type, date range
stockLedgerRouter.get("/activity", rbac([PERMISSIONS.INVENTORY.READ]), getLedgerActivity);

// GET /api/stock-ledger/shrinkage
// Shrinkage & loss report — negative stock_adjustments grouped by shop
stockLedgerRouter.get("/shrinkage", rbac([PERMISSIONS.INVENTORY.READ]), getShrinkageReport);

// GET /api/stock-ledger/velocity
// Stock velocity / turnover — fastest and slowest selling products
stockLedgerRouter.get("/velocity", rbac([PERMISSIONS.INVENTORY.READ]), getStockVelocity);

// GET /api/stock-ledger/flow
// Inventory flow — total stock in vs. out per shop for a period
stockLedgerRouter.get("/flow", rbac([PERMISSIONS.INVENTORY.READ]), getInventoryFlowSummary);

// GET /api/stock-ledger/reorder-forecast
// Smart reorder forecast — products that will run out soon based on sales velocity
stockLedgerRouter.get("/reorder-forecast", rbac([PERMISSIONS.INVENTORY.READ]), getReorderForecast);

export default stockLedgerRouter;
