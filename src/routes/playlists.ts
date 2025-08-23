import { Playlist } from "../models/Playlist";
import { Song } from "../models/Song";
import express from "express";
import mongoose from "mongoose";
import { PlaylistService } from "../services/playlistService";
import { User } from "../models/User";
import { SongService } from "../services/songService";
import {
  uploadPlaylistThumbnailMiddleware,
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary";

const router = express.Router();

// Get user's playlists with filtering
router.get("/", async (req, res, next) => {
  try {
    const filters = {
      type: req.query.type as string,
      search: req.query.search as string,
    };

    const { playlists, total } = await PlaylistService.getUserPlaylists(
      req.user._id,
      filters
    );

    res.status(200).json({
      success: true,
      data: {
        playlists,
        total,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get playlist by ID
router.get("/:id", async (req, res, next) => {
  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid playlist ID format",
      });
    }

    // Validate ownership and get playlist
    const playlist = await PlaylistService.validatePlaylistOwnership(
      new mongoose.Types.ObjectId(req.params.id),
      req.user._id
    );

    // Populate detailed information
    const populatedPlaylist = await Playlist.findById(req.params.id)
      .populate("owner", "username avatar fullName")
      .populate({
        path: "songs",
        populate: {
          path: "artist",
          select: "name imageUrl bio",
        },
        select: "title duration genre thumbnailUrl playCount createdAt",
      });

    res.status(200).json({
      success: true,
      data: { playlist: populatedPlaylist },
    });
  } catch (error) {
    next(error);
  }
});

// Add song to playlist
router.post("/:id/songs", async (req, res, next) => {
  try {
    const { songId } = req.body;

    if (!songId || !mongoose.Types.ObjectId.isValid(songId)) {
      return res.status(400).json({
        success: false,
        message: "Valid song ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid playlist ID format",
      });
    }

    const playlist = await PlaylistService.validatePlaylistOwnership(
      new mongoose.Types.ObjectId(req.params.id),
      req.user._id
    );

    const song = await Song.findById(songId);
    if (!song) {
      return res.status(404).json({
        success: false,
        message: "Song not found",
      });
    }

    if (playlist.playlistType === "liked") {
      await SongService.likeSong(req.user._id, new mongoose.Types.ObjectId(songId));
    } else {
      if (playlist.songs.includes(new mongoose.Types.ObjectId(songId))) {
        return res.status(400).json({
          success: false,
          message: "Song is already in the playlist",
        });
      }

      playlist.songs.push(new mongoose.Types.ObjectId(songId));
      playlist.totalDuration += song.duration;
      await playlist.save();
    }

    const updatedPlaylist = await Playlist.findById(req.params.id).populate({
      path: "songs",
      populate: {
        path: "artist",
        select: "name imageUrl",
      },
      select: "title duration thumbnailUrl likedBy",
    });

    res.status(200).json({
      success: true,
      message: "Song added to playlist successfully",
      data: { playlist: updatedPlaylist },
    });
  } catch (error: any) {
    console.error("❌ Error adding song to playlist:", error.message);

    if (error.message.includes("already liked")) {
      return res.status(400).json({
        success: false,
        message: "Song is already in your liked songs",
      });
    }

    next(error);
  }
});

// Remove song from playlist
router.delete("/:id/songs/:songId", async (req, res, next) => {
  try {
    const { id: playlistId, songId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid playlist ID format",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(songId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid song ID format",
      });
    }

    const playlist = await PlaylistService.validatePlaylistOwnership(
      new mongoose.Types.ObjectId(playlistId),
      req.user._id
    );

    if (playlist.playlistType === "recently_played") {
      return res.status(403).json({
        success: false,
        message: "Cannot manually remove songs from Recently Played playlist",
      });
    }

    const songObjectId = new mongoose.Types.ObjectId(songId);

    if (playlist.playlistType === "liked") {
      await SongService.unlikeSong(req.user._id, songObjectId);
    } else {
      const songIndex = playlist.songs.findIndex(
        (song: mongoose.Types.ObjectId) => song.toString() === songId
      );

      if (songIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Song not found in this playlist",
        });
      }

      const song = await Song.findById(songId);
      if (!song) {
        return res.status(404).json({
          success: false,
          message: "Song not found in database",
        });
      }

      playlist.songs.splice(songIndex, 1);
      playlist.totalDuration = Math.max(0, playlist.totalDuration - song.duration);
      await playlist.save();
    }

    const updatedPlaylist = await Playlist.findById(playlistId).populate({
      path: "songs",
      populate: {
        path: "artist",
        select: "name imageUrl",
      },
      select: "title duration thumbnailUrl likedBy",
    });

    res.status(200).json({
      success: true,
      message: "Song removed from playlist successfully",
      data: { playlist: updatedPlaylist },
    });
  } catch (error: any) {
    console.error("❌ Error removing song from playlist:", error.message);

    if (error.message.includes("not liked")) {
      return res.status(400).json({
        success: false,
        message: "Song is not in your liked songs",
      });
    }

    next(error);
  }
});

// Create new custom playlist
router.post("/", async (req, res, next) => {
  try {
    const { name, description, coverImageUrl } = req.body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Playlist name is required",
      });
    }

    if (name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: "Playlist name cannot exceed 100 characters",
      });
    }

    if (description && description.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Description cannot exceed 500 characters",
      });
    }

    // Create new playlist
    const playlist = new Playlist({
      name: name.trim(),
      description: description?.trim() || "",
      coverImageUrl,
      owner: req.user._id,
      songs: [],
      totalDuration: 0,
      isDefault: false,
      playlistType: "custom",
    });

    await playlist.save();

    // Add playlist reference to user
    await User.findByIdAndUpdate(req.user._id, {
      $push: { playlists: playlist._id },
    });

    res.status(201).json({
      success: true,
      message: "Playlist created successfully",
      data: { playlist },
    });
  } catch (error) {
    next(error);
  }
});

// Update playlist info (name, description, coverImageUrl)
router.put("/:id", uploadPlaylistThumbnailMiddleware, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid playlist ID format",
      });
    }

    const playlist = await PlaylistService.validatePlaylistOwnership(
      new mongoose.Types.ObjectId(req.params.id),
      req.user._id
    );

    const { name, description, coverImageUrl } = req.body;

    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "Playlist name is required" });
      }
      if (name.trim().length > 100) {
        return res.status(400).json({
          success: false,
          message: "Playlist name cannot exceed 100 characters",
        });
      }
      playlist.name = name.trim();
    }
    if (description !== undefined) {
      if (description.length > 500) {
        return res
          .status(400)
          .json({ success: false, message: "Description cannot exceed 500 characters" });
      }
      playlist.description = description.trim();
    }

    // Handle thumbnail upload if file is provided
    if (req.file) {
      console.log("🖼️ Processing thumbnail upload with cloudinary.uploader");

      // Delete old thumbnail from Cloudinary if exists
      if (playlist.coverImageUrl) {
        try {
          await deleteFromCloudinary(playlist.coverImageUrl);
        } catch (deleteError) {
          console.warn("Failed to delete old thumbnail:", deleteError);
        }
      }

      // Upload new thumbnail to Cloudinary
      try {
        playlist.coverImageUrl = await uploadToCloudinary(
          req.file.buffer,
          "music-app/playlists",
          [
            { width: 600, height: 600, crop: "fill" },
            { quality: "auto", fetch_format: "auto" },
          ]
        );
        console.log("✅ Thumbnail uploaded successfully:", playlist.coverImageUrl);
      } catch (uploadError) {
        console.error("❌ Thumbnail upload failed:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload thumbnail",
        });
      }
    } else if (coverImageUrl !== undefined) {
      playlist.coverImageUrl = coverImageUrl;
    }

    await playlist.save();

    res.status(200).json({
      success: true,
      message: "Playlist updated successfully",
      data: { playlist },
    });
  } catch (error) {
    next(error);
  }
});

// Delete playlist
router.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid playlist ID format",
      });
    }

    const playlist = await PlaylistService.validatePlaylistOwnership(
      new mongoose.Types.ObjectId(req.params.id),
      req.user._id
    );

    await playlist.deleteOne();
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { playlists: playlist._id },
    });

    res.status(200).json({
      success: true,
      message: "Playlist deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
