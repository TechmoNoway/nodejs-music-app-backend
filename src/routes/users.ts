import express from "express";
import { User } from "../models/User";
import {
  uploadAvatarMiddleware,
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary";

const router = express.Router();

// Get user profile
router.get("/profile", async (req, res, next) => {
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

// Update user profile
router.put("/profile", uploadAvatarMiddleware, async (req, res, next) => {
  try {
    const { username, email } = req.body;

    // Check if username or email is already taken by another user
    if (username || email) {
      const existingUser = await User.findOne({
        $and: [
          { _id: { $ne: req.user._id } },
          {
            $or: [...(username ? [{ username }] : []), ...(email ? [{ email }] : [])],
          },
        ],
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message:
            existingUser.username === username
              ? "Username already taken"
              : "Email already registered",
        });
      }
    }

    // Handle avatar upload if file is provided
    let avatarUrl;
    if (req.file) {
      console.log("🖼️ Processing avatar upload with cloudinary.uploader");

      // Get current user to delete old avatar if exists
      const currentUser = await User.findById(req.user._id);

      // Delete old avatar from Cloudinary if exists
      if (currentUser?.avatar) {
        try {
          await deleteFromCloudinary(currentUser.avatar);
        } catch (deleteError) {
          console.warn("Failed to delete old avatar:", deleteError);
        }
      }

      // Upload new avatar to Cloudinary
      try {
        avatarUrl = await uploadToCloudinary(req.file.buffer, "music-app/avatars", [
          { width: 400, height: 400, crop: "fill", gravity: "face" },
          { quality: "auto", fetch_format: "auto" },
        ]);
        console.log("✅ Avatar uploaded successfully:", avatarUrl);
      } catch (uploadError) {
        console.error("❌ Avatar upload failed:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload avatar",
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        ...(username && { username }),
        ...(email && { email }),
        ...(avatarUrl && { avatar: avatarUrl }),
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
});

// Change password
router.put("/password", async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
