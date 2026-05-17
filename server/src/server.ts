import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
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
import purchaseOrderRouter from './routes/purchaseOrder.route';
import salesOrderRouter from './routes/salesOrder.route';
import dashboardRouter from './routes/dashboard.route';
import marketRouter from './routes/market.route';
import transferRouter from './routes/transfer.route';
import stockLedgerRouter from './routes/stockLedger.route';
import inviteRouter from './routes/invite.route';

dotenv.config();

const app: Express = express();
const PORT: number = Number(process.env.PORT) || 3000;

// ---------- MIDDLEWARE ----------
app.use(cors({
  origin: [
    "http://localhost:5173", 
    "https://invento-hub-mfhu.vercel.app",
    ...(process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : [])
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


// ---------- RATE LIMITING ----------
// applies to auth routes to prevent brute-force login/reset attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 20,                   // limit each IP to 20 requests per window
  message: { success: false, message: "Too many requests. Please try again after 15 minutes." },
  standardHeaders: true,     // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,      // Disable the `X-RateLimit-*` headers
});

// App-wide rate limiting: Protects all routes against basic DoS attacks by restricting the number of requests per IP
//prevents DoS attacks
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 100,                 // limit each IP to 100 requests per 15 mins globally
  message: { success: false, message: "Too many requests. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ---------- LOGGING ----------
// Use morgan to log HTTP requests to the console. 
// We generally only enable it in development mode so production logs remain uncluttered.
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Apply the global rate limiter BEFORE the routes
app.use(globalLimiter); 

// ---------- ROUTES ----------
app.use('/api/auth', authLimiter, authRouter);    //auth routes
app.use('/api/users', userRouter);                //user routes
app.use('/api/products', productRouter);          //product routes
app.use('/api/suppliers', supplierRouter);        //supplier routes
app.use('/api/shops', shopRouter);                //shop routes
app.use('/api/inventory', inventoryRouter);       //inventory routes
app.use('/api/purchase-orders', purchaseOrderRouter); //purchase order routes
app.use('/api/sales-orders', salesOrderRouter);   //sales order routes
app.use('/api/dashboard', dashboardRouter);       //dashboard routes
app.use('/api/market', marketRouter);             //market routes
app.use('/api/transfers', transferRouter);        //stock transfer routes
app.use('/api/stock-ledger', stockLedgerRouter);  //stock ledger analytics routes
app.use('/api/invites', inviteRouter);             //invite management routes


// ---------- HEALTH CHECK ----------
app.get('/api/health', (req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? "connected" : dbState === 2 ? "connecting" : "disconnected";

  res.status(200).json({
    status: "ok",
    db: dbStatus,
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
  });
});


app.get('/', (req: Request, res: Response) => {
  res.send('<h1>Welcome to123 InventoHub Server your one place to manage all inventory tasks!</h1>');
});

// ---------- ERROR HANDLING MIDDLEWARE ----------
app.use(globalErrorHandler);
app.use(notFoundHandler);

// ---------- DATABASE & SERVER START ----------
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // ---------- KEEP-ALIVE SELF-PING ----------
    // Prevents free-tier hosts (Render, Railway) from spinning down the server
    // after inactivity, which causes 2-3s cold start delays on next request.
    // Pings own health endpoint every 4 minutes (well within the 15-min idle timeout).
    if (process.env.NODE_ENV === 'production' && process.env.BACKEND_URL) {
      const KEEP_ALIVE_INTERVAL = 4 * 60 * 1000; // 4 minutes
      setInterval(async () => {
        try {
          await fetch(`${process.env.BACKEND_URL}/api/health`);
          console.log("[keep-alive] pinged successfully");
        } catch (err) {
          console.warn("[keep-alive] ping failed:", (err as Error).message);
        }
      }, KEEP_ALIVE_INTERVAL);
      console.log(`[keep-alive] enabled — pinging ${process.env.BACKEND_URL}/api/health every 4 min`);
    }
  });
})
  .catch((error) => {
    console.error("Failed to start server:", error);
  });
