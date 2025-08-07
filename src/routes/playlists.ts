import { Playlist } from "../models/Playlist";
import express from "express";

const router = express.Router();

// Get user's playlists
router.get("/", async (req, res, next) => {
  try {
    const playlists = await Playlist.find({ owner: req.user._id })
      .populate("songs", "title artist duration")
      .sort({ createdAt: -1 });

    const total = await Playlist.countDocuments({ owner: req.user._id });

    res.status(200).json({
      success: true,
      data: {
        playlists,
        total,
      },
    });
  } catch (error) {
    next(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get playlist by ID
router.get("/:id", async (req, res, next) => {
  try {
    const playlist = await Playlist.findById(req.params.id)
      .populate("owner", "username avatar")
      .populate({
        path: "songs",
        populate: {
          path: "artist",
          select: "name",
        },
      });

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: "playlist not found",
      });
    }
  } catch (error) {
    next(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
