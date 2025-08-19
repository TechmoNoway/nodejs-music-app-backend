import mongoose from "mongoose";
import { Song } from "../models/Song";
import express from "express";
import { SongService } from "../services/songService";
import { authenticateToken, optionalAuth } from "../middleware/auth";

const addIsLikedStatus = (songs: any[], userId?: mongoose.Types.ObjectId | null) => {
  return songs.map((song) => ({
    ...song,
    isLiked: !!(
      userId &&
      Array.isArray(song.likedBy) &&
      song.likedBy.some(
        (likedUserId: mongoose.Types.ObjectId) =>
          likedUserId.toString() === userId.toString()
      )
    ),
  }));
};

const router = express.Router();

// Get all songs with optional filters
router.get("/", optionalAuth, async (req, res, next) => {
  try {
    const filter: any = { isPublic: true };

    if (req.query.genre) {
      filter.genre = { $regex: new RegExp(req.query.genre as string, "i") };
    }

    if (req.query.artist) {
      filter.artist = req.query.artist;
    }

    if (req.query.search) {
      const searchTerm = req.query.search as string;
      filter.$or = [
        { title: { $regex: new RegExp(searchTerm, "i") } },
        { genre: { $regex: new RegExp(searchTerm, "i") } },
      ];
    }

    const songs = await Song.find(filter)
      .populate("artist", "name imageUrl")
      .populate("uploadedBy", "name imageUrl")
      .sort({ createdAt: -1 })
      .lean();

    const total = await Song.countDocuments(filter);

    const userId = (req as any).user?._id;
    const songsWithLikeStatus = addIsLikedStatus(songs, userId);

    res.status(200).json({
      success: true,
      data: {
        songs: songsWithLikeStatus,
        total,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get song by ID
router.get("/:id", optionalAuth, async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id)
      .populate("artist", "name bio imageUrl")
      .lean();

    if (!song) {
      return res.status(404).json({
        success: false,
        message: "Song not found",
      });
    }

    await Song.findByIdAndUpdate(req.params.id, { $inc: { playCount: 1 } });

    const userId = (req as any).user?._id;
    const isLiked = !!(
      userId &&
      Array.isArray(song.likedBy) &&
      song.likedBy.some(
        (likedUserId: mongoose.Types.ObjectId) =>
          likedUserId.toString() === userId.toString()
      )
    );

    const songWithLikeStatus = {
      ...song,
      isLiked,
    };

    res.status(200).json({
      success: true,
      data: { song: songWithLikeStatus },
    });
  } catch (error) {
    next(error);
  }
});

//Get popular songs
router.get("/popular/top", optionalAuth, async (req, res, next) => {
  try {
    const songs = await Song.find({ isPublic: true })
      .populate("artist", "name imageUrl")
      .sort({ playCount: -1, createdAt: -1 })
      .limit(10)
      .lean();

    const userId = (req as any).user?._id;
    const songsWithLikeStatus = addIsLikedStatus(songs, userId);

    res.status(200).json({
      success: true,
      data: {
        songs: songsWithLikeStatus,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Like/Unlike a song (toggle)
router.post("/:id/like", authenticateToken, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid song ID format",
      });
    }

    const songId = new mongoose.Types.ObjectId(req.params.id);

    if (!(req as any).user || !(req as any).user._id) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const result = await SongService.toggleLikeSong((req as any).user._id, songId);

    res.status(200).json({
      success: true,
      message: result.isLiked
        ? "Song added to liked songs successfully"
        : "Song removed from liked songs successfully",
      data: {
        songId: songId,
        isLiked: result.isLiked,
        likesCount: result.song.likesCount,
      },
    });
  } catch (error: any) {
    console.error("❌ Error toggling like:", error.message);

    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        message: "Song not found",
      });
    }

    if (error.message.includes("already liked") || error.message.includes("not liked")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to toggle like status",
    });
  }
});

export default router;
