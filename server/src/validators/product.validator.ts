import { z } from "zod";


//create product validator
export const productCreateValidator = z.object({
  name: z
    .string()
    .min(2, "Product name must be at least 2 characters")
    .max(100, "Product name cannot exceed 100 characters"),

  sku: z
    .string()
    .min(2, "SKU must be at least 2 characters")
    .max(50, "SKU cannot exceed 50 characters"),

  description: z.string().max(500).optional(),

  category: z.string().max(50).optional(),

  unit: z.string().max(20).optional(), // pcs, kg, box

  barcode: z.string().max(50).optional(),

  cost_price: z
    .number()
    .min(0, "Cost price cannot be negative")
    .optional(),

  selling_price: z
    .number()
    .min(0, "Selling price cannot be negative")
    .optional(),

  stock_quantity: z
    .number()
    .int("Stock quantity must be an integer")
    .min(0, "Stock quantity cannot be negative")
    .optional(),

  image_urls: z
    .array(z.string().url("Invalid image URL"))
    .optional(),

  attributes: z.record(z.string(),z.any()).optional(),
});
