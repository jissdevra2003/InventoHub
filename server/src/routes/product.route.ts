import express from 'express'
import { assignProductToShop, createProduct, getProductById, listProducts, softDeleteProduct, updateProduct } from '../controllers/product.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rbac } from '../middlewares/rbac.middleware';
import { PERMISSIONS } from "../permissions/main.perm";


const productRouter=express.Router()

productRouter.post('/create-product',authMiddleware,rbac([PERMISSIONS.PRODUCT.CREATE]),createProduct)

productRouter.get("/list-products", authMiddleware, rbac([PERMISSIONS.PRODUCT.READ]), listProducts);

productRouter.patch("/:productId/assign-to-shop", authMiddleware, rbac([PERMISSIONS.PRODUCT.UPDATE]), assignProductToShop);

productRouter.get("/:productId", authMiddleware, rbac([PERMISSIONS.PRODUCT.READ]), getProductById);

productRouter.patch("/:productId", authMiddleware, rbac([PERMISSIONS.PRODUCT.UPDATE]), updateProduct);

productRouter.delete("/:productId", authMiddleware, rbac([PERMISSIONS.PRODUCT.DELETE]), softDeleteProduct);


export default productRouter;