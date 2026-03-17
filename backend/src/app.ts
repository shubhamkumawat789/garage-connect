import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { rateLimit } from "express-rate-limit";
import { errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import garageRoutes from "./routes/garage.routes.js";
import serviceRoutes from "./routes/service.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import adminRoutes from "./routes/admin.routes.js";

const app = express();

// Security Middleware
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

// CORS Configuration
const frontendUrls = process.env.FRONTEND_URLS || "";
const frontendUrl = process.env.FRONTEND_URL || "";
const allowedOrigins = [...frontendUrls.split(","), frontendUrl].map(url => url.trim()).filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." }
});
app.use("/api/auth", limiter); // Apply to auth routes specifically

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/garages", garageRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ 
    status: "ok", 
    message: "Garage Connect API is running",
    allowedOrigins: process.env.NODE_ENV === 'production' ? allowedOrigins : '*'
  });
});

app.use(errorHandler);

export default app;
