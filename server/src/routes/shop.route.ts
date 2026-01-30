import express from 'express';
import { assignUserToShop, createShop, deleteShop, listShops, removeUserFromShop } from '../controllers/shop.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rbac } from '../middlewares/rbac.middleware';
import { PERMISSIONS } from '../permissions/main.perm';
import { checkShopAccess } from '../middlewares/checkShopAccess.middleware';

const shopRouter = express.Router();

shopRouter.post('/create', authMiddleware, rbac([PERMISSIONS.SHOP.CREATE]), createShop);

shopRouter.post('/:shopId/assign-user', authMiddleware, rbac([PERMISSIONS.SHOP.ASSIGN_USER]), checkShopAccess, assignUserToShop);

shopRouter.patch('/:shopId/remove-user', authMiddleware, rbac([PERMISSIONS.SHOP.REMOVE_USER]), checkShopAccess, removeUserFromShop);

shopRouter.get('/', authMiddleware, rbac([PERMISSIONS.SHOP.READ]), listShops);

shopRouter.delete('/:shopId', authMiddleware, rbac([PERMISSIONS.SHOP.DELETE]), deleteShop);

export default shopRouter;