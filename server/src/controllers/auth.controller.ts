import { Request, Response } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { Market } from '../models/Market.model';
import { User } from '../models/User.model';
import { companyRegisterValidator, userRegisterValidator } from '../validators/auth.validator';
import { createTempToken, verifyTempToken } from '../utils/tempToken.utils';
import { CompanyRegisterDto, UserRegisterDto } from '../dtos/auth.dto';


// Helper: generates the final auth token (same logic as in user.controller.ts)
const generateToken = (user_id: string, market_id: string): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  return jwt.sign({ user_id, market_id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};


// ============================================
// STEP 1: Register Company (Market)
// ============================================
// Creates the market/company and returns a temp token for Step 2.
// The market starts as inactive — it becomes active only after Step 2.

export const registerCompany = asyncHandler(async (req: Request, res: Response) => {

  // --- 1. Validate the request body ---
  const result = companyRegisterValidator.safeParse(req.body);

  if (!result.success) {
    const errors = result.error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    throw new ApiError(400, `Validation Error: ${errors.map(e => e.field + ' => ' + e.message).join('; ')}`);
  }

  const data: CompanyRegisterDto = result.data;


  // --- 2. Check if market email already exists ---
  const existingMarket = await Market.findOne({ market_email: data.market_email });

  if (existingMarket) {
    throw new ApiError(409, "A company with this email already exists");
  }


  // --- 3. Create the market (inactive for now) ---
  const market = await Market.create({
    ...data,
    isActive: false,   // will become true after Step 2
  });


  // --- 4. Generate a temp token (valid for 15 minutes) ---
  const tempToken = createTempToken(market._id.toString());


  // --- 5. Send response ---
  return res.status(201).json(
    new ApiResponse(201, "Company registered successfully. Proceed to Step 2.", {
      tempToken,
      marketId: market._id,
    })
  );
});


// ============================================
// STEP 2: Register User (Admin Owner)
// ============================================
// Uses the temp token from Step 1 to create the admin user
// and activate the market.

export const registerUser = asyncHandler(async (req: Request, res: Response) => {

  // --- 1. Validate the request body ---
  const result = userRegisterValidator.safeParse(req.body);

  if (!result.success) {
    const errors = result.error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    throw new ApiError(400, `Validation Error: ${errors.map(e => e.field + ' => ' + e.message).join('; ')}`);
  }

  const data: UserRegisterDto = result.data;


  // --- 2. Verify the temp token to get the marketId ---
  const tokenPayload = verifyTempToken(data.tempToken);
  const marketId = tokenPayload.marketId;


  // --- 3. Find the market and make sure it hasn't been completed already ---
  const market = await Market.findById(marketId);

  if (!market) {
    throw new ApiError(404, "Market not found. Please start registration again.");
  }

  if (market.isActive) {
    throw new ApiError(400, "Registration already completed for this company.");
  }


  // --- 4. Check if username or email is already taken ---
  const [existingUsername, existingEmail] = await Promise.all([
    User.findOne({ username: data.username }),
    User.findOne({ email: data.email }),
  ]);

  if (existingUsername) {
    throw new ApiError(409, "Username already taken");
  }

  if (existingEmail) {
    throw new ApiError(409, "Email already registered");
  }


  // --- 5. Use a transaction to create user + activate market together ---
  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    // Create the admin user
    const [user] = await User.create([{
      username: data.username,
      name: data.name,
      email: data.email,
      password: data.password,       // hashed automatically by the User model pre-save hook
      phone: data.phone,
      market_id: marketId,
      builtInRole: "admin",
      isSuperAdmin: true,
      isActive: true,
      status: "active",
      permissions: ['*'],            // superAdmin gets all permissions
    }], { session });

    // Activate the market and set the owner
    market.ownerId = user._id;
    market.isActive = true;
    await market.save({ session });

    // Commit — both user creation and market update succeed together
    await session.commitTransaction();


    // --- 6. Generate the final auth token ---
    const accessToken = generateToken(user._id.toString(), marketId);


    // --- 7. Fetch clean user data (without password) for response ---
    const userData = await User.findById(user._id)
      .select('-password -__v -reset_token -reset_token_expiry');

    const marketData = await Market.findById(marketId)
      .select('-__v');


    // --- 8. Send response with cookie ---
    return res
      .status(201)
      .cookie("token", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,    // 7 days
      })
      .json(
        new ApiResponse(201, "Registration completed successfully!", {
          accessToken,
          user: userData,
          market: marketData,
        })
      );

  } catch (error) {
    // If anything fails, roll back everything
    await session.abortTransaction();
    throw error instanceof ApiError ? error : new ApiError(500, "Registration failed. Please try again.");
  } finally {
    session.endSession();
  }
});


// ============================================
// FORGOT PASSWORD
// ============================================
// Generates a reset token, saves it to the user record, and logs it.
// In production you would send this token via email.

import crypto from 'crypto';
import { forgotPasswordValidator, resetPasswordValidator } from '../validators/auth.validator';
import { ForgotPasswordDto, ResetPasswordDto } from '../dtos/auth.dto';

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {

  // --- 1. Validate ---
  const result = forgotPasswordValidator.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map(e => `${e.path.join(".")}: ${e.message}`);
    throw new ApiError(400, `Validation error: ${errors.join(", ")}`);
  }

  const { email }: ForgotPasswordDto = result.data;

  // --- 2. Find user ---
  const user = await User.findOne({ email, status: "active" });

  // Always return success to prevent email enumeration attacks
  if (!user) {
    return res.status(200).json(
      new ApiResponse(200, "If an account with that email exists, a reset link has been sent.")
    );
  }

  // --- 3. Generate a reset token (random hex string) ---
  const resetToken = crypto.randomBytes(32).toString("hex");
  const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  user.reset_token = resetToken;
  user.reset_token_expiry = tokenExpiry;
  await user.save();

  // --- 4. Log the token (email sending placeholder) ---
  console.log("─────────────────────────────────────────────");
  console.log(`📧 Password Reset Token for ${email}`);
  console.log(`   Token  : ${resetToken}`);
  console.log(`   Expires: ${tokenExpiry.toISOString()}`);
  console.log("─────────────────────────────────────────────");

  return res.status(200).json(
    new ApiResponse(200, "If an account with that email exists, a reset link has been sent.")
  );
});


// ============================================
// RESET PASSWORD
// ============================================
// Verifies the reset token, checks expiry, and updates the password.

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {

  // --- 1. Validate ---
  const result = resetPasswordValidator.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map(e => `${e.path.join(".")}: ${e.message}`);
    throw new ApiError(400, `Validation error: ${errors.join(", ")}`);
  }

  const { token, newPassword }: ResetPasswordDto = result.data;

  // --- 2. Find user by reset token ---
  const user = await User.findOne({
    reset_token: token,
    reset_token_expiry: { $gt: new Date() },  // token must not be expired
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired reset token. Please request a new one.");
  }

  // --- 3. Update password (pre-save hook will hash it) ---
  user.password = newPassword;
  user.reset_token = undefined;
  user.reset_token_expiry = undefined;
  await user.save();

  return res.status(200).json(
    new ApiResponse(200, "Password reset successfully. You can now log in with your new password.")
  );
});
