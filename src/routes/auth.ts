import express from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();

// Register
router.post("/register", async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message:
          existingUser.email === email
            ? "Email already registered"
            : "Username already taken",
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
    });

    await user.save();

    // Generate JWT token
    const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post("/login", async (req, res, next) => {
  try {
    const { login, password } = req.body; 

    if (!login || !password) {
      return res.status(400).json({
        success: false,
        message: "Email/username and password are required",
      });
    }

    const user = await User.findOne({
      $or: [{ email: login.toLowerCase() }, { username: login }],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate JWT token
    const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get current user profile
router.get("/me", authenticateToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("playlists", "name description coverImageUrl");

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token
router.post("/refresh", authenticateToken, async (req, res, next) => {
  try {
    const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
    const newToken = jwt.sign({ userId: req.user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      success: true,
      message: "Token refreshed successfully",
      data: { token: newToken },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
