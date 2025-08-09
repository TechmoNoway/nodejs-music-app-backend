import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

// Import routes
import songRoutes from "./routes/songs";
import artistRoutes from "./routes/artists";
import playlistRoutes from "./routes/playlists";

// Middleware imports
import { errorHandler } from "./middleware/errorHandler";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/music-app";

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});

// Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
// app.use(
//   cors({
//     origin: process.env.CLIENT_URL || "http://localhost:3000",
//     credentials: true,
//   })
// );
cors({
  origin: process.env.CLIENT_URL || "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
});
app.use(compression());
app.use(morgan("combined"));
app.use(limiter);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    status: "OK",
    message: "Welcome to music app server",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Music App API Server is running",
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use("/api/songs", songRoutes);
app.use("/api/artists", artistRoutes);
app.use("/api/playlists", playlistRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
});

// Database connection
const clientOptions = {
  serverApi: { version: "1" as const, strict: true, deprecationErrors: true },
};

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, clientOptions);
    await mongoose.connection.db?.admin().ping();

    console.log("📦 MongoDB connected successfully");
    return true;
  } catch (error) {
    console.error("❌ MongoDB connection error:", (error as Error).message);
    console.log("⚠️  Server will start without database connection");
    console.log("💡 Please install and start MongoDB to enable full functionality");
    return false;
  }
};

// Start server
const startServer = async () => {
  const dbConnected = await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    console.log(`📚 API Base URL: http://localhost:${PORT}/api`);
    if (!dbConnected) {
      console.log("⚠️  Database features are disabled - install MongoDB to enable");
    }
  });
};

startServer().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});

export default app;
