import mongoose from "mongoose";
import { Playlist } from "../models/Playlist";
import { User } from "../models/User";
import { Song } from "../models/Song";

export class PlaylistService {
  /**
   * Create default playlists for a new user
   */
  static async createDefaultPlaylistsForUser(
    userId: mongoose.Types.ObjectId
  ): Promise<void> {
    try {
      // Verify user exists
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Create Liked Songs playlist if it doesn't exist
      const existingLikedPlaylist = await Playlist.findOne({
        owner: userId,
        playlistType: "liked",
      });

      if (!existingLikedPlaylist) {
        await Playlist.create({
          name: "Liked Songs",
          description: "Your favorite tracks in one place",
          coverImageUrl:
            "https://i.scdn.co/image/ab67706c0000da84c087a4c9a2d9b15a7cb1a5b1",
          owner: userId,
          songs: [],
          totalDuration: 0,
          isDefault: true,
          playlistType: "liked",
        });

        console.log(`Created "Liked Songs" playlist for user: ${userId}`);
      }

      // Create Recently Played playlist if it doesn't exist
      const existingRecentlyPlayedPlaylist = await Playlist.findOne({
        owner: userId,
        playlistType: "recently_played",
      });

      if (!existingRecentlyPlayedPlaylist) {
        await Playlist.create({
          name: "Recently Played",
          description: "Your recently played tracks",
          coverImageUrl:
            "https://i.scdn.co/image/ab67706c0000da84d5e6f7a8b9c0d1e2f3a4b5c6",
          owner: userId,
          songs: [],
          totalDuration: 0,
          isDefault: true,
          playlistType: "recently_played",
        });

        console.log(`Created "Recently Played" playlist for user: ${userId}`);
      }
    } catch (error: any) {
      console.error("Error creating default playlists:", error.message);
      throw error;
    }
  }

  /**
   * Add song to user's Liked Songs playlist
   */
  static async addToLikedSongs(
    userId: mongoose.Types.ObjectId,
    songId: mongoose.Types.ObjectId
  ): Promise<void> {
    try {
      const likedPlaylist = await Playlist.findOne({
        owner: userId,
        playlistType: "liked",
      });

      if (!likedPlaylist) {
        throw new Error("Liked Songs playlist not found");
      }

      // Check if song is already in playlist
      if (!likedPlaylist.songs.includes(songId)) {
        // Get song info to calculate totalDuration
        const song = await Song.findById(songId);
        if (!song) {
          throw new Error("Song not found");
        }

        likedPlaylist.songs.push(songId);
        likedPlaylist.totalDuration += song.duration;
        await likedPlaylist.save();

        console.log(`Added song ${songId} to Liked Songs for user ${userId}`);
      }
    } catch (error: any) {
      console.error("Error adding to liked songs:", error.message);
      throw error;
    }
  }

  /**
   * Remove song from user's Liked Songs playlist
   */
  static async removeFromLikedSongs(
    userId: mongoose.Types.ObjectId,
    songId: mongoose.Types.ObjectId
  ): Promise<void> {
    try {
      const likedPlaylist = await Playlist.findOne({
        owner: userId,
        playlistType: "liked",
      });

      if (!likedPlaylist) {
        throw new Error("Liked Songs playlist not found");
      }

      const songIndex = likedPlaylist.songs.indexOf(songId);
      if (songIndex > -1) {
        // Get song info to subtract totalDuration
        const song = await Song.findById(songId);
        if (song) {
          likedPlaylist.totalDuration = Math.max(
            0,
            likedPlaylist.totalDuration - song.duration
          );
        }

        likedPlaylist.songs.splice(songIndex, 1);
        await likedPlaylist.save();

        console.log(`Removed song ${songId} from Liked Songs for user ${userId}`);
      }
    } catch (error: any) {
      console.error("Error removing from liked songs:", error.message);
      throw error;
    }
  }

  /**
   * Add song to Recently Played playlist (keep only last 50 songs)
   */
  static async addToRecentlyPlayed(
    userId: mongoose.Types.ObjectId,
    songId: mongoose.Types.ObjectId
  ): Promise<void> {
    try {
      const recentlyPlayedPlaylist = await Playlist.findOne({
        owner: userId,
        playlistType: "recently_played",
      });

      if (!recentlyPlayedPlaylist) {
        throw new Error("Recently Played playlist not found");
      }

      // Remove song if it already exists (to move it to the front)
      const existingIndex = recentlyPlayedPlaylist.songs.indexOf(songId);
      if (existingIndex > -1) {
        recentlyPlayedPlaylist.songs.splice(existingIndex, 1);
      }

      // Add song to the beginning
      recentlyPlayedPlaylist.songs.unshift(songId);

      // Keep only last 50 songs
      if (recentlyPlayedPlaylist.songs.length > 50) {
        recentlyPlayedPlaylist.songs = recentlyPlayedPlaylist.songs.slice(0, 50);
      }

      // Recalculate total duration
      const songs = await Song.find({
        _id: { $in: recentlyPlayedPlaylist.songs },
      });

      recentlyPlayedPlaylist.totalDuration = songs.reduce(
        (total, song) => total + song.duration,
        0
      );

      await recentlyPlayedPlaylist.save();

      console.log(`Added song ${songId} to Recently Played for user ${userId}`);
    } catch (error: any) {
      console.error("Error adding to recently played:", error.message);
      throw error;
    }
  }

  /**
   * Get user's playlists with filtering
   */
  static async getUserPlaylists(
    userId: mongoose.Types.ObjectId,
    filters: {
      type?: string;
      search?: string;
    }
  ): Promise<{ playlists: any[]; total: number }> {
    try {
      // Build filter
      const filter: any = { owner: userId };

      // Filter by playlist type
      if (
        filters.type &&
        ["custom", "liked", "recently_played", "favorites"].includes(filters.type)
      ) {
        filter.playlistType = filters.type;
      }

      // Search by name
      if (filters.search) {
        const searchTerm = filters.search.trim();
        if (searchTerm) {
          const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          filter.name = { $regex: new RegExp(escapedTerm, "i") };
        }
      }

      // Execute queries in parallel
      const [playlists, total] = await Promise.all([
        Playlist.find(filter)
          .populate("songs", "title artist duration thumbnailUrl")
          .populate({
            path: "songs",
            populate: {
              path: "artist",
              select: "name imageUrl",
            },
          })
          .sort({ isDefault: -1, createdAt: -1 })
          .lean(),
        Playlist.countDocuments(filter),
      ]);

      return { playlists, total };
    } catch (error: any) {
      console.error("Error getting user playlists:", error.message);
      throw error;
    }
  }

  /**
   * Validate playlist ownership
   */
  static async validatePlaylistOwnership(
    playlistId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId
  ): Promise<any> {
    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      throw new Error("Playlist not found");
    }

    if (playlist.owner.toString() !== userId.toString()) {
      throw new Error("Access denied. You can only access your own playlists");
    }

    return playlist;
  }
}
