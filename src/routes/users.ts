import express from "express";
import { User } from "../models/User";

const router = express.Router();

// Get user profile
router.get("/profile", async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("favorites", "title artist duration thumbnailUrl")
      .populate("playlists", "name description coverImageUrl totalDuration");

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put("/profile", async (req, res, next) => {
  try {
    const { username, email, avatar } = req.body;

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

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        ...(username && { username }),
        ...(email && { email }),
        ...(avatar && { avatar }),
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
