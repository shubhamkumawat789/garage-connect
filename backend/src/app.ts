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
import feedbackRoutes from "./routes/feedback.routes.js";
import walletRoutes from "./routes/wallet.routes.js";
import emergencyRoutes from "./routes/emergency.routes.js";

const app = express();

// Security Middleware
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

// CORS Configuration
const allowedOrigins = (process.env.FRONTEND_URLS || "")
  .split(",")
  .filter(Boolean)
  .map(url => url.trim().replace(/\/$/, ""));

// Add common local development origins if not in production
if (process.env.NODE_ENV !== 'production') {
  const localOrigins = ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000', 'http://localhost:5173'];
  localOrigins.forEach(origin => {
    if (!allowedOrigins.includes(origin)) {
      allowedOrigins.push(origin);
    }
  });
}

// Debug log during startup
console.log("Allowed CORS origins:", allowedOrigins);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (health checks, curl, Postman, or local file)
    if (!origin || origin === 'null') {
      return callback(null, true);
    }

    const normalizedOrigin = origin.replace(/\/$/, "");

    if (allowedOrigins.includes(normalizedOrigin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
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
app.use("/api/feedback", feedbackRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/emergency", emergencyRoutes);

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ 
    status: "ok", 
    message: "Garage Connect API is running",
    allowedOrigins: process.env.NODE_ENV === 'production' ? allowedOrigins : '*'
  });
});

app.use(errorHandler);

export default app;
