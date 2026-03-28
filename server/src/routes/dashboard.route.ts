import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { getDashboardStats } from "../controllers/dashboard.controller";

const dashboardRouter = express.Router();

// GET /api/dashboard/stats — returns high-level business stats
dashboardRouter.get("/stats", authMiddleware, getDashboardStats);

export default dashboardRouter;
