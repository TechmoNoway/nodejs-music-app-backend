import { Song } from "../models/Song";
import express from "express";

const router = express.Router();

// Get all songs with optional filters
router.get("/", async (req, res, next) => {
  try {
    const filter: any = { isPublic: true };

    if (req.query.genre) {
      filter.genre = { $regex: new RegExp(req.query.genre as string, "i") };
    }

    if (req.query.artist) {
      filter.artist = req.query.artist;
    }

    if (req.query.search) {
      filter.$text = { $search: req.query.search as string };
    }

    const songs = await Song.find(filter)
      .populate("artist", "name imageUrl")
      .sort({ createdAt: -1 });

    const total = await Song.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        songs,
        total,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get song by ID
router.get("/:id", async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id)
      .populate("artist", "name bio imageUrl")
      .sort({ createdAt: -1 });

    if (!song) {
      return res.status(404).json({ success: false, message: "Song not found" });
    }

    await Song.findByIdAndUpdate(req.params.id, { $inc: { playCount: 1 } });

    res.status(200).json({
      success: true,
      data: { song },
    });
  } catch (error) {
    next(error);
  }
});

//Get popular songs
router.get("/popular/top", async (req, res, next) => {
  try {
    const songs = await Song.find({ isPublic: true })
      .populate("artist", "name imageUrl")
      .sort({ playCount: -1, createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        songs,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
