import { User } from "../models/User";
import { Playlist } from "../models/Playlist";
import express from "express";
import { Song } from "../models/Song";

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
  }
});

// Create new playlist
router.post("/", async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const playlist = new Playlist({
      name,
      description,
      owner: req.user._id,
    });

    await playlist.save();

    await User.findByIdAndUpdate(req.user._id, { $push: { playlists: playlist._id } });

    const populatedPlaylist = await Playlist.findById(playlist._id).populate(
      "owner",
      "username avatar"
    );

    res.status(201).json({
      success: true,
      message: "Playlist created successfully",
      data: { playlist: populatedPlaylist },
    });
  } catch (error) {
    next(error);
  }
});

// Update playlist
router.put("/:id", async (req, res, next) => {
  try {
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return res.status(404).json({ success: false, message: "Playlist not found" });
    }

    const { name, description, coverImageUrl } = req.body;

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        coverImageUrl,
      },
      { new: true, runValidators: true }
    ).populate("owner", "username avatar");

    res.status(200).json({
      success: true,
      message: "Playlist updated successfully",
      data: { playlist: updatedPlaylist },
    });
  } catch (error) {
    next(error);
  }
});

// Add song to playlist
router.post("/:id/songs", async (req, res, next) => {
  try {
    const { songId } = req.body;

    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return res.status(400).json({ success: false, message: "Playlist not found" });
    }

    const song = await Song.findById(songId);
    if (!song) {
      return res.status(400).json({ success: false, message: "Song not found" });
    }

    if (!playlist.songs.includes(songId)) {
      playlist.songs.push(songId);
      playlist.totalDuration += song.duration;
      await playlist.save();
    }

    const updatedPlaylist = await Playlist.findById(req.params.id).populate({
      path: "songs",
      populate: {
        path: "artist",
        select: "name",
      },
    });

    res.json({
      success: true,
      message: "Song added to playlist successfully",
      data: { playlist: updatedPlaylist },
    });
  } catch (error) {
    next(error);
  }
});

// Remove song from playlist
router.delete("/:id/songs/:songId", async (req, res, next) => {
  try {
    const { id: playlistId, songId } = req.params;

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res.status(404).json({ success: false, message: "Playlist not found" });
    }

    const song = await Song.findById(songId);
    if (song && playlist.songs.some((id) => id.toString() === songId)) {
      playlist.songs = playlist.songs.filter((id) => id.toString() !== songId);
      playlist.totalDuration -= Math.max(0, playlist.totalDuration - song.duration);
      await playlist.save();
    }

    const updatedPlaylist = await Playlist.findById(playlistId).populate({
      path: "songs",
      populate: { path: "artist", select: "name" },
    });

    res.status(200).json({
      success: true,
      message: "Song removed from playlist successfully",
      data: { playlist: updatedPlaylist },
    });
  } catch (error) {
    next(error);
  }
});

// Delete playlist
router.delete("/:id", async (req, res, next) => {
  try {
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return res.status(404).json({ success: false, message: "Playlist not found" });
    }

    await User.findByIdAndUpdate(req.user._id, { $pull: { playlists: playlist._id } });

    await Playlist.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: "Playlist deleted successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;
