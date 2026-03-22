import { z } from "zod";

export const saleOrderItemValidator = z.object({
    product_id: z.string().min(1, "Product ID is required"),
    product_name: z.string().optional(),
    sku: z.string().optional(),
    quantity: z.number().int().positive("Quantity must be a positive integer"),
    selling_price: z.number().nonnegative("Selling price cannot be negative"),
});

export const createSalesOrderValidator = z.object({
    shop_id: z.string().min(1, "Shop ID is required"),
    items: z.array(saleOrderItemValidator).nonempty("At least one item is required"),
    customer_name: z.string().optional(),
    payment_method: z.enum(["cash", "card", "upi", "mixed", "none"]).optional(),
    notes: z.string().optional(),
});
