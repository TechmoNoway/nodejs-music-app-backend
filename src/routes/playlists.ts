import { Playlist } from "../models/Playlist";
import { Song } from "../models/Song";
import express from "express";
import mongoose from "mongoose";
import { PlaylistService } from "../services/playlistService";
import { User } from "../models/User";

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

    // Validate input
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

    // Validate playlist ownership
    const playlist = await PlaylistService.validatePlaylistOwnership(
      new mongoose.Types.ObjectId(req.params.id),
      req.user._id
    );

    // Check if song exists
    const song = await Song.findById(songId);
    if (!song) {
      return res.status(404).json({
        success: false,
        message: "Song not found",
      });
    }

    // Handle special case for Liked Songs playlist
    if (playlist.playlistType === "liked") {
      await PlaylistService.addToLikedSongs(
        req.user._id,
        new mongoose.Types.ObjectId(songId)
      );
    } else {
      // Check if song is already in playlist
      if (playlist.songs.includes(new mongoose.Types.ObjectId(songId))) {
        return res.status(400).json({
          success: false,
          message: "Song is already in the playlist",
        });
      }

      // Add song to playlist
      playlist.songs.push(new mongoose.Types.ObjectId(songId));
      playlist.totalDuration += song.duration;
      await playlist.save();
    }

    // Return updated playlist
    const updatedPlaylist = await Playlist.findById(req.params.id).populate({
      path: "songs",
      populate: {
        path: "artist",
        select: "name imageUrl",
      },
      select: "title duration thumbnailUrl",
    });

    res.status(200).json({
      success: true,
      message: "Song added to playlist successfully",
      data: { playlist: updatedPlaylist },
    });
  } catch (error) {
    next(error);
  }
});

// Create new custom playlist
router.post("/", async (req, res, next) => {
  try {
    const { name, description, coverImageUrl } = req.body;

    // Create new playlist
    const playlist = new Playlist({
      name,
      description,
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

export default router;
