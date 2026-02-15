
import express from "express"
import { authMiddleware } from "../middlewares/auth.middleware";
import { listInventoryByShop } from "../controllers/inventory.controller";

const inventoryRouter=express.Router();


inventoryRouter.get( "/shops/:shopId/inventory",   authMiddleware,   listInventoryByShop );