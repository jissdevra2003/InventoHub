import express from "express"
import { authMiddleware } from "../middlewares/auth.middleware";
import {
    listInventoryByShop,
    increaseInventory,
    decreaseInventory,
    listLowStockInventory
} from "../controllers/inventory.controller";

const inventoryRouter = express.Router();

inventoryRouter.get("/shops/:shopId/inventory", authMiddleware, listInventoryByShop);
inventoryRouter.patch("/increase", authMiddleware, increaseInventory);
inventoryRouter.patch("/decrease", authMiddleware, decreaseInventory);
inventoryRouter.get("/low-stock", authMiddleware, listLowStockInventory);

export default inventoryRouter;
