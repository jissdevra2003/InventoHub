import { z } from "zod";

export const updateInventoryValidator = z.object({
    shopId: z.string().min(1, "shopId is required"),
    productId: z.string().min(1, "productId is required"),
    quantity: z.number().int().positive("quantity must be a positive integer"),
    reason: z.string().optional(),
});
