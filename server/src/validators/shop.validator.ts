import { z } from 'zod';


export const createShopValidator = z.object({
    name: z.string().regex(/^[a-zA-Z0-9_\s]+$/, "Shop name must contain only letters and spaces").min(3, "Shop name must be at least 3 characters long").max(50, "Shop name must be at most 50 characters long"),

    address: z.string().min(5, "Address must be at least 5 characters long").max(100, "Address must be at most 100 characters long").optional(),
    
    city: z.string().min(2, "City name must be at least 2 characters long").max(50, "City name must be at most 50 characters long").optional(),

    state: z.string().min(2, "State name must be at least 2 characters long").max(50, "State name must be at most 50 characters long").optional(),

    country: z.string().min(2, "Country name must be at least 2 characters long").max(50, "Country name must be at most 50 characters long").optional(),

    postal_code: z.string().regex(/^[0-9]{3,20}$/, "Postal code must be a valid numeric string of 3 to 20 characters").optional(),

    contact_number: z.string().regex(/^(?:\+91)?[6-9]\d{9}$/, "Contact number must be a valid 10-digit Indian phone number (optionally prefixed with +91)").optional(),

    contact_email: z.email("Invalid email format").optional(),
});