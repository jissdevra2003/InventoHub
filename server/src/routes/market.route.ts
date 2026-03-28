import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { updateMarketProfile } from "../controllers/market.controller";

const marketRouter = express.Router();

// PATCH /api/market/profile — update market details (SuperAdmin only)
marketRouter.patch("/profile", authMiddleware, updateMarketProfile);

export default marketRouter;
