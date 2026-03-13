import express from "express";
import { registerCompany, registerUser } from "../controllers/auth.controller";

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

export default authRouter;
