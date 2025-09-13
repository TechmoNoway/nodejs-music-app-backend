import express from "express";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { User } from "../models/User";
import { authenticateToken } from "../middleware/auth";
import { PlaylistService } from "../services/playlistService";

const router = express.Router();

// Initialize Google OAuth2 client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Register
router.post("/register", async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(409).json({
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

    // Create default playlists for new user
    try {
      await PlaylistService.createDefaultPlaylistsForUser(
        new (require("mongoose").Types.ObjectId)(user._id)
      );
      console.log(`✅ Default playlists created for user: ${user.username}`);
    } catch (playlistError: any) {
      console.error("❌ Failed to create default playlists:", playlistError.message);
    }

    // Generate JWT token
    const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully with default playlists",
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
    const user = await User.findById(req.user._id);

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

// Google OAuth login
router.post("/google", async (req, res, next) => {
  try {
    const { googleToken, userInfo } = req.body;

    if (!googleToken || !userInfo) {
      return res.status(400).json({
        success: false,
        message: "Google token and user info are required",
      });
    }

    let googleUser;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: googleToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      googleUser = ticket.getPayload();
    } catch (verifyError) {
      console.error("Google token verification failed:", verifyError);
      return res.status(401).json({
        success: false,
        message: "Invalid Google token",
      });
    }

    if (!googleUser || !googleUser.email) {
      return res.status(401).json({
        success: false,
        message: "Unable to get user information from Google",
      });
    }

    let user = await User.findOne({
      $or: [{ email: googleUser.email }, { googleId: googleUser.sub }],
    });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleUser.sub;
        user.loginMethod = "google";
        if (userInfo.photo && !user.avatar) {
          user.avatar = userInfo.photo;
        }
        await user.save();
      }
    } else {
      const username = userInfo.email.split("@")[0] + "_" + Date.now(); // Generate unique username

      user = new User({
        username,
        email: googleUser.email,
        googleId: googleUser.sub,
        loginMethod: "google",
        avatar: userInfo.photo || null,
      });

      await user.save();

      try {
        await PlaylistService.createDefaultPlaylistsForUser(
          new (require("mongoose").Types.ObjectId)(user._id)
        );
        console.log(`✅ Default playlists created for Google user: ${user.username}`);
      } catch (playlistError: any) {
        console.error("❌ Failed to create default playlists:", playlistError.message);
      }
    }

    const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    const refreshToken = jwt.sign({ userId: user._id, type: "refresh" }, JWT_SECRET, {
      expiresIn: "30d",
    });

    res.json({
      success: true,
      message: user.googleId
        ? "Google login successful"
        : "Google account linked and logged in",
      data: {
        user: {
          id: user._id,
          name: userInfo.name || user.username,
          email: user.email,
          avatar: user.avatar,
          username: user.username,
          loginMethod: user.loginMethod,
        },
        token,
        refreshToken,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    next(error);
  }
});

export default router;
