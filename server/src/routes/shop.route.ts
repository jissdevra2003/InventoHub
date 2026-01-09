import express from 'express';
import { createShop } from '../controllers/shop.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rbac } from '../middlewares/rbac.middleware';
import { PERMISSIONS } from '../permissions/main.perm';

const shopRouter = express.Router();

shopRouter.post('/create', authMiddleware, rbac([PERMISSIONS.SHOP.CREATE]), createShop);

export default shopRouter;