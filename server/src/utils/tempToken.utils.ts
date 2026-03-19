import jwt from 'jsonwebtoken';
import { ApiError } from './ApiError';
import { TempTokenPayload } from '../dtos/auth.dto';

// ============================================
// Temporary Token Helpers
// ============================================
// These tokens are used ONLY during registration to link Step 1 → Step 2.
// They expire in 15 minutes, so the user must complete Step 2 quickly.


/**
 * Creates a short-lived JWT token after Step 1 (company registration).
 * The token contains the marketId so Step 2 knows which market to use.
 */
export const createTempToken = (marketId: string): string => {

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  // What goes inside the token
  const payload: TempTokenPayload = {
    marketId,
    purpose: "registration",    // so we can tell this apart from normal auth tokens
  };

  // Sign the token — it expires in 15 minutes
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "15m" });

  return token;
};


/**
 * Verifies the temp token sent in Step 2.
 * Returns the marketId if valid, throws an error if expired or invalid.
 */
export const verifyTempToken = (token: string): TempTokenPayload => {

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  try {
    // Decode and verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as TempTokenPayload;

    // Make sure it's actually a registration token (not a normal auth token)
    if (decoded.purpose !== "registration") {
      throw new ApiError(401, "Invalid token: not a registration token");
    }

    return decoded;  //decoded has marketId and purpose

  } catch (error) {
    // If token is expired or tampered with
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, "Invalid or expired registration token");
  }
};
