import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { rbac } from "../middlewares/rbac.middleware";
import { PERMISSIONS } from "../permissions/main.perm";
import {
    createSupplier,
    listSuppliers,
    getSupplierById,
    updateSupplier,
    deleteSupplier,
    getSupplierAnalytics,
} from "../controllers/supplier.controller";

const supplierRouter = express.Router();

// All supplier routes require the user to be logged in
supplierRouter.use(authMiddleware);

// POST /api/suppliers — Add a new supplier
supplierRouter.post("/", rbac([PERMISSIONS.SUPPLIER.CREATE]), createSupplier);

// GET /api/suppliers — List all suppliers (with pagination & search)
supplierRouter.get("/", rbac([PERMISSIONS.SUPPLIER.READ]), listSuppliers);

// GET /api/suppliers/analytics — Dashboard analytics (charts & summary cards)
// NOTE: Must be placed BEFORE /:supplierId so Express does not treat "analytics" as an ID
supplierRouter.get("/analytics", rbac([PERMISSIONS.SUPPLIER.READ]), getSupplierAnalytics);

// GET /api/suppliers/:supplierId — Get full details of one supplier
supplierRouter.get("/:supplierId", rbac([PERMISSIONS.SUPPLIER.READ]), getSupplierById);

// PATCH /api/suppliers/:supplierId — Update supplier info
supplierRouter.patch("/:supplierId", rbac([PERMISSIONS.SUPPLIER.UPDATE]), updateSupplier);

// DELETE /api/suppliers/:supplierId — Soft delete a supplier
supplierRouter.delete("/:supplierId", rbac([PERMISSIONS.SUPPLIER.DELETE]), deleteSupplier);

export default supplierRouter;
