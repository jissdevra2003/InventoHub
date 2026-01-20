import express from 'express'
import { createProduct } from '../controllers/product.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rbac } from '../middlewares/rbac.middleware';
import { PERMISSIONS } from "../permissions/main.perm";


const productRouter=express.Router()

productRouter.post('/create',authMiddleware,rbac([PERMISSIONS.PRODUCT.CREATE]),createProduct)




export default productRouter;