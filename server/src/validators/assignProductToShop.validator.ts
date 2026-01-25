import { z } from "zod";

export const assignProductToShopValidator = z.object({
  shopId: z.string().min(1, "shopId is required"),
  quantity: z.number().int().min(0, "quantity must be >= 0"),
  min_stock: z.number().int().min(0).optional(),
});
