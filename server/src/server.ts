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
import shopRouter from './routes/shop.route';

dotenv.config();

const app: Express = express();
const PORT: number = Number(process.env.PORT) || 3000;

// ---------- MIDDLEWARE ----------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ---------- ROUTES ----------
app.use('/api/users', userRouter);
<<<<<<< HEAD
app.use('/api/products',productRouter)
=======
app.use('/api/shops', shopRouter);
>>>>>>> 825050e39240e458d665bec77c7476faef02e1aa

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

