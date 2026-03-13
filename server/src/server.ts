import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import { connectDB } from './config/db';
import userRouter from './routes/user.route';
import productRouter from './routes/product.route';
import { globalErrorHandler } from './middlewares/globalErrorHandler.middleware';
import { notFoundHandler } from './middlewares/globalErrorHandler.middleware';
import cookieParser from "cookie-parser"
import "./models";
import shopRouter from './routes/shop.route';
import supplierRouter from './routes/supplier.route';
import inventoryRouter from './routes/inventory.route';
import authRouter from './routes/auth.route';

dotenv.config();

const app: Express = express();
const PORT: number = Number(process.env.PORT) || 3000;

// ---------- MIDDLEWARE ----------
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ---------- ROUTES ----------
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/products', productRouter);
app.use('/api/suppliers', supplierRouter);
app.use('/api/shops', shopRouter);
app.use('/api/inventory', inventoryRouter);


app.get('/', (req: Request, res: Response) => {
  res.send('<h1>Welcome to InventoHub Server your one place to manage all inventory tasks!</h1>');
});

// ---------- ERROR HANDLING MIDDLEWARE ----------
app.use(globalErrorHandler);
app.use(notFoundHandler);

// ---------- DATABASE & SERVER START ----------
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})
  .catch((error) => {
    console.error("Failed to start server:", error);
  });

