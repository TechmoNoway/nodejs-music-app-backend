import { Song } from "../models/Song";
import { Artist } from "../models/Artist";
import express from "express";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();

// Get all artists
router.get("/", async (req, res, next) => {
  try {
    const filter: any = {};

    if (req.query.search) {
      filter.$text = { $search: req.query.search as string };
    }

    const artists = await Artist.find(filter).sort({ name: 1 });

    const total = await Artist.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        artists,
        total,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get artist by ID
router.get("/:id", async (req, res, next) => {
  try {
    const artist = await Artist.findById(req.params.id);

    if (!artist) {
      return res.status(404).json({ success: false, message: "Artist not found" });
    }

    const songs = await Song.find({
      artist: req.params.id,
      isPublic: true,
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: { artist, songs } });
  } catch (error) {
    next(error);
  }
});

// Create new artist (authenticated)
router.post("/", authenticateToken, async (req, res, next) => {
  try {
    const { name, bio } = req.body;

    const artist = new Artist({
      name,
      bio,
    });

    await artist.save();

    res
      .status(201)
      .json({ success: true, message: "Artist created successfully", data: { artist } });
  } catch (error) {
    next(error);
  }
});

// Update artist (authenticated - only created or admin)
router.put("/:id", authenticateToken, async (req, res, next) => {
  try {
    const artist = await Artist.findById(req.params.id);

    if (!artist) {
      return res.status(404).json({ success: false, message: "Artist not found" });
    }

    const { name, bio, imageUrl } = req.body;

    const updatedArtist = await Artist.findByIdAndUpdate(
      req.params.id,
      { name, bio, imageUrl },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Artist updated successfully",
      data: { artist: updatedArtist },
    });
  } catch (error) {
    next(error);
  }
});

// Delete artist (authendicated - only admin)
router.delete("/:id", authenticateToken, async (req, res, next) => {
  try {
    const artist = await Artist.findById(req.params.id);

    if (!artist) {
      return res.status(404).json({ success: false, message: "Artist not found" });
    }

    await Artist.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Artist deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
