import { z } from "zod";

// ─── Step 1: Owner Schema ───
export const ownerSchema = z
    .object({
        name: z
            .string()
            .min(1, "Full name is required")
            .regex(
                /^[a-zA-Z\s]{3,30}$/,
                "Name must be 3-30 characters, letters and spaces only"
            ),
        username: z
            .string()
            .min(1, "Username is required")
            .regex(
                /^[a-zA-Z0-9_]{3,30}$/,
                "3-30 characters: letters, numbers, underscores"
            ),
        email: z
            .string()
            .min(1, "Email is required")
            .email("Enter a valid email address"),
        phone: z
            .string()
            .min(1, "Phone number is required")
            .regex(
                /^(?:\+91)?[6-9]\d{9}$/,
                "Enter a valid 10-digit phone number"
            ),
        password: z
            .string()
            .min(1, "Password is required")
            .regex(
                /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/,
                "Min 8 characters with at least one letter and one number"
            ),
        confirmPassword: z.string().min(1, "Please confirm your password"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

// ─── Step 2: Market Schema ───
export const marketSchema = z.object({
    market_name: z
        .string()
        .min(1, "Business name is required")
        .regex(
            /^[a-zA-Z0-9\s]{3,50}$/,
            "3-50 characters: letters, numbers, spaces only"
        ),
    market_email: z
        .string()
        .min(1, "Business email is required")
        .email("Enter a valid email address"),
    market_phone: z
        .string()
        .min(1, "Business phone is required")
        .regex(
            /^(?:\+91)?[6-9]\d{9}$/,
            "Enter a valid 10-digit phone number"
        ),
    industryType: z
        .string()
        .min(2, "Industry type must be at least 2 characters")
        .optional()
        .or(z.literal("")),
    country: z
        .string()
        .min(2, "Country is invalid")
        .optional()
        .or(z.literal("")),
    state: z
        .string()
        .min(2, "State is invalid")
        .optional()
        .or(z.literal("")),
    city: z
        .string()
        .min(2, "City is invalid")
        .optional()
        .or(z.literal("")),
    gstNumber: z
        .string()
        .regex(
            /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/,
            "Invalid GST Number"
        )
        .optional()
        .or(z.literal("")),
    postal_code: z
        .string()
        .regex(/^[1-9][0-9]{5}$/, "Invalid 6-digit postal code")
        .optional()
        .or(z.literal("")),
    address: z
        .string()
        .min(5, "Address must be at least 5 characters")
        .optional()
        .or(z.literal("")),
});

// ─── Combined Registration Schema ───
export const registerSchema = z.object({
    owner: ownerSchema,
    market: marketSchema,
});

// ─── Types ───
export type OwnerFormData = z.infer<typeof ownerSchema>;
export type MarketFormData = z.infer<typeof marketSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
