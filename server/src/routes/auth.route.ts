import express from "express";
import { registerCompany, registerUser, forgotPassword, resetPassword } from "../controllers/auth.controller";

const authRouter = express.Router();

// ============================================
// Two-Step Registration Routes
// ============================================
// No auth middleware needed — these are public endpoints.

// Step 1: Register Company/Market
// POST /api/auth/register/company
authRouter.post("/register/company", registerCompany);

// Step 2: Register Admin User (uses temp token from Step 1)
// POST /api/auth/register/user
authRouter.post("/register/user", registerUser);


// ============================================
// Password Reset Routes
// ============================================
// POST /api/auth/forgot-password
authRouter.post("/forgot-password", forgotPassword);

// POST /api/auth/reset-password
authRouter.post("/reset-password", resetPassword);

export default authRouter;
