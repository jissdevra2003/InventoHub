import express from 'express'
import { assignProductToShop, createProduct } from '../controllers/product.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rbac } from '../middlewares/rbac.middleware';
import { PERMISSIONS } from "../permissions/main.perm";


const productRouter=express.Router()

productRouter.post('/create',authMiddleware,rbac([PERMISSIONS.PRODUCT.CREATE]),createProduct)

productRouter.patch("/:productId/assign-to-shop", authMiddleware, rbac([PERMISSIONS.PRODUCT.UPDATE]), assignProductToShop);


export default productRouter;