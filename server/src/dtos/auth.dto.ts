
// ============================================
// DTOs for Two-Step Registration
// ============================================
// These interfaces define the shape of data sent from the frontend


// Step 1: Company/Market registration data
export interface CompanyRegisterDto {
  market_name: string;
  market_email: string;
  market_phone: string;
  gstNumber?: string;
  industryType?: string;
  country?: string;
  state?: string;
  city?: string;
  postal_code?: string;
}


// Step 2: Admin user registration data
export interface UserRegisterDto {
  tempToken: string;
  username: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
}


// Payload stored inside the temporary JWT token
// This is what we encode/decode between Step 1 and Step 2
export interface TempTokenPayload {
  marketId: string;
  purpose: "registration";  // makes it clear this token is ONLY for registration
}


// Forgot Password: user provides their email
export interface ForgotPasswordDto {
  email: string;
}


// Reset Password: user provides the token from the email + new password
export interface ResetPasswordDto {
  token: string;
  newPassword: string;
  confirmPassword: string;
}
