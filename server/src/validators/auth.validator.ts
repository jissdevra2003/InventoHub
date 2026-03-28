import { z } from 'zod';

// ============================================
// Step 1: Company Registration Validator
// ============================================
// Validates the market/company details sent in the first step

export const companyRegisterValidator = z.object({

  market_name: z.string()
    .regex(/^[a-zA-Z0-9\s]{3,50}$/, "Market name must be 3-50 characters (letters, numbers, spaces only)"),

  market_email: z.email("Invalid email format"),

  market_phone: z.string()
    .regex(/^(?:\+91)?[6-9]\d{9}$/, "Phone must be 10 digits (optionally prefixed with +91)"),

  // Optional fields
  gstNumber: z.string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/, "Invalid GST Number")
    .optional(),

  industryType: z.string().min(2, "Industry type must be at least 2 characters").optional(),
  country: z.string().min(2, "Country is invalid").optional(),
  state: z.string().min(2, "State is invalid").optional(),
  city: z.string().min(2, "City is invalid").optional(),
  postal_code: z.string().regex(/^[1-9][0-9]{5}$/, "Invalid Indian postal code").optional(),
});


// ============================================
// Step 2: User Registration Validator
// ============================================
// Validates the admin user details + the temp token from Step 1

export const userRegisterValidator = z.object({

  tempToken: z.string().min(1, "Temp token is required"),

  username: z.string()
    .regex(/^[a-zA-Z0-9_]{3,30}$/, "Username must be 3-30 characters (letters, numbers, underscores)"),

  name: z.string()
    .regex(/^[a-zA-Z\s]{3,30}$/, "Name must be 3-30 characters (letters and spaces only)"),

  email: z.email("Invalid email"),

  password: z.string()
    .regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/, "Password must be 8+ characters with at least one letter and one number"),

  confirmPassword: z.string(),

  phone: z.string()
    .regex(/^(?:\+91)?[6-9]\d{9}$/, "Invalid phone number")
    .optional(),

}).refine(
  (data) => data.password === data.confirmPassword,
  { message: "Passwords do not match", path: ["confirmPassword"] }
);


// ============================================
// Forgot Password Validator
// ============================================
export const forgotPasswordValidator = z.object({
  email: z.email("Invalid email format"),
});


// ============================================
// Reset Password Validator
// ============================================
export const resetPasswordValidator = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string()
    .regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/, "Password must be 8+ characters with at least one letter and one number"),
  confirmPassword: z.string(),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  { message: "Passwords do not match", path: ["confirmPassword"] }
);
