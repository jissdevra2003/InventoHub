import { z } from 'zod';

// Registration validator for market and owner (user). it contain same field that is sent from frontend to backend and used in DTO.
export const registerValidator = z.object({


  market: z.object({
  market_name: z.string()
    .regex(/^[a-zA-Z0-9\s]{3,50}$/, "Market name must be 3-50 characters and contain only letters, numbers, and spaces"),

  market_email: z.email("Invalid email format"),

  // Use Indian 10-digit validator:
  market_phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
    // Simplified international format but also may need format eg +91XXXXXXXXXX for India

  gstNumber: z.string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/, "Invalid GST Number")
    .optional(),

  logoUrl: z.url("Invalid URL").optional(),

  address: z.string().min(5, "Address must be at least 5 characters").optional(),

  industryType: z.string().min(2, "Industry type must be at least 2 characters").optional(),

  country: z.string().min(2, "Country is invalid").optional(),
  state: z.string().min(2, "State is invalid").optional(),
  city: z.string().min(2, "City is invalid").optional(),

  postal_code: z.string()
    .regex(/^[1-9][0-9]{5}$/, "Invalid Indian postal code")
    .optional(),
  }),
    
    
    
    owner: z.object({
          username: z.string().regex(/^[a-zA-Z0-9_]{3,30}$/, "Username must be 3-30 characters long and can only contain letters, numbers, and underscores"),
          name: z.string().regex(/^[a-zA-Z\s]{3,30}$/, "Name must be 3-30 characters long and can only contain letters and spaces"),
          phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format").optional(),
          email: z.email(),
          password: z.string().regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/, "Password must be at least 8 characters long and contain at least one letter and one number"),
          address: z.string().optional(),   
          profile_image: z.url().optional()
    })
});