import { z } from "zod";

// ─── Forgot Password Schemas ───
// Three separate schemas for the 3-step forgot password flow.

/** Step 1: Enter email */
export const emailStepSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
});
export type EmailStepData = z.infer<typeof emailStepSchema>;

/** Step 2: Enter 6-digit OTP */
export const otpStepSchema = z.object({
    otp: z.string().regex(/^\d{6}$/, "OTP must be exactly 6 digits"),
});
export type OtpStepData = z.infer<typeof otpStepSchema>;

/** Step 3: Set new password – base object */
const newPasswordBaseSchema = z.object({
    newPassword: z
        .string()
        .regex(
            /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/,
            "Password must be 8+ characters with at least one letter and one number"
        ),
    confirmPassword: z.string(),
});

/** Step 3: Set new password – with cross-field refinement */
export const newPasswordSchema = newPasswordBaseSchema.refine(
    (data) => data.newPassword === data.confirmPassword,
    {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    }
);

/** Form type inferred from the base object (avoids ZodEffects mismatch with useForm) */
export type NewPasswordData = z.infer<typeof newPasswordBaseSchema>;
