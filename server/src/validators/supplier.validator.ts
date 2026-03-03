import { z } from "zod";

// --- Create Supplier Validator ---
export const createSupplierValidator = z.object({
    company_name: z
        .string()
        .min(2, "Company name must be at least 2 characters")
        .max(100, "Company name cannot exceed 100 characters"),

    contact_name: z.string().max(100).optional(),

    contact_number: z
        .string()
        .min(7, "Contact number is too short")
        .max(15, "Contact number is too long")
        .optional(),

    email: z.string().email("Invalid email address").optional(),

    address: z.string().max(255).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    postal_code: z.string().max(20).optional(),
    country: z.string().max(100).optional(),

    gstin: z.string().max(15).optional(),

    lead_time: z.number().int().min(0, "Lead time cannot be negative").optional(),

    opening_balance: z.number().min(0, "Opening balance cannot be negative").optional(),

    credit_limit: z.number().min(0, "Credit limit cannot be negative").optional(),

    payment_terms: z
        .enum(["Due on Receipt", "Net 15", "Net 30", "Net 60"])
        .optional(),

    supplier_type: z
        .enum(["Manufacturer", "Wholesaler", "Distributor", "Retailer", "Service Provider"])
        .optional(),

    internal_notes: z.string().max(500).optional(),
});

// --- Update Supplier Validator (all fields optional) ---
export const updateSupplierValidator = createSupplierValidator
    .omit({ opening_balance: true }) // opening_balance should not be editable after creation
    .partial();
