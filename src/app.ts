import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/music-app";

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
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
