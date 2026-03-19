import { z } from "zod";

export const purchaseOrderItemValidator = z.object({
    product_id: z.string().min(1, "Product ID is required"),
    product_name: z.string().optional(),
    sku: z.string().min(1, "SKU is required"),
    quantity: z.number().int().positive("Quantity must be a positive integer"),
    cost_price: z.number().nonnegative("Cost price cannot be negative"),
});

export const createPurchaseOrderValidator = z.object({
    shop_id: z.string().min(1, "Shop ID is required"),
    supplier_id: z.string().min(1, "Supplier ID is required"),
    items: z.array(purchaseOrderItemValidator).nonempty("At least one item is required"),
});
