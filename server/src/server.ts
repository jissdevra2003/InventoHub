import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import { connectDB } from './config/db';
import userRouter from './routes/user.route';
import { globalErrorHandler } from './middlewares/globalErrorHandler.middleware';
import { notFoundHandler } from './middlewares/globalErrorHandler.middleware';

dotenv.config();

const app: Express = express();
const PORT: number = Number(process.env.PORT) || 3000;

// ---------- MIDDLEWARE ----------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------- ROUTES ----------
app.use('/api/users', userRouter);

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

