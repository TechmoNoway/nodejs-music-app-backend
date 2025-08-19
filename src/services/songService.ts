import mongoose from "mongoose";
import { Song, ISong } from "../models/Song";
import { PlaylistService } from "./playlistService";

export class SongService {
  /**
   * Get all songs with like status for a specific user
   */
  static async getSongsWithLikeStatus(
    userId: mongoose.Types.ObjectId,
    filters: {
      genre?: string;
      search?: string;
      isPublic?: boolean;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ songs: ISong[]; total: number; page: number; totalPages: number }> {
    try {
      const { genre, search, isPublic = true, page = 1, limit = 20 } = filters;

      const query: any = { isPublic };

      if (genre) {
        query.genre = genre;
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { lyrics: { $regex: search, $options: "i" } },
        ];
      }

      const skip = (page - 1) * limit;

      const songs = await Song.find(query)
        .populate("artist", "name imageUrl")
        .populate("uploadedBy", "username")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Song.countDocuments(query);
      const totalPages = Math.ceil(total / limit);

      const songsWithLikeStatus = songs.map((song: any) => ({
        ...song,
        isLiked: song.likedBy.some(
          (likedUserId: mongoose.Types.ObjectId) =>
            likedUserId.toString() === userId.toString()
        ),
      }));

      return {
        songs: songsWithLikeStatus,
        total,
        page,
        totalPages,
      };
    } catch (error: any) {
      console.error("❌ Error getting songs with like status:", error.message);
      throw new Error(`Failed to get songs: ${error.message}`);
    }
  }

  /**
   * Like a song - Single source of truth for liking
   */
  static async likeSong(
    userId: mongoose.Types.ObjectId,
    songId: mongoose.Types.ObjectId
  ): Promise<ISong> {
    try {
      const song = await Song.findById(songId);
      if (!song) {
        throw new Error("Song not found");
      }

      const isAlreadyLiked = song.likedBy.some(
        (likedUserId: mongoose.Types.ObjectId) =>
          likedUserId.toString() === userId.toString()
      );

      if (isAlreadyLiked) {
        throw new Error("Song is already liked");
      }

      song.likedBy.push(userId);
      await song.save();

      try {
        await PlaylistService.addToLikedSongs(userId, songId);
      } catch (playlistError: any) {
        song.likedBy = song.likedBy.filter((id) => id.toString() !== userId.toString());
        await song.save();
        throw new Error();
      }

      console.log(`✅ Song ${songId} liked by user ${userId}`);
      return song;
    } catch (error: any) {
      console.error("❌ Error liking song:", error.message);
      throw error;
    }
  }

  /**
   * Unlike a song - Single source of truth for unliking
   */
  static async unlikeSong(
    userId: mongoose.Types.ObjectId,
    songId: mongoose.Types.ObjectId
  ): Promise<ISong> {
    try {
      const song = await Song.findById(songId);
      if (!song) {
        throw new Error("Song not found");
      }

      const likedIndex = song.likedBy.findIndex(
        (likedUserId: mongoose.Types.ObjectId) =>
          likedUserId.toString() === userId.toString()
      );

      if (likedIndex === -1) {
        throw new Error("Song is not liked");
      }

      // Update song's likedBy array
      song.likedBy.splice(likedIndex, 1);
      await song.save();

      // Sync with Liked Songs playlist
      try {
        await PlaylistService.removeFromLikedSongs(userId, songId);
      } catch (playlistError: any) {
        // Rollback if playlist sync fails
        song.likedBy.push(userId);
        await song.save();
        throw new Error(`Failed to sync with playlist: ${playlistError.message}`);
      }

      console.log(`✅ Song ${songId} unliked by user ${userId}`);
      return song;
    } catch (error: any) {
      console.error("❌ Error unliking song:", error.message);
      throw error;
    }
  }

  /**
   * Toggle like status of a song
   */
  static async toggleLikeSong(
    userId: mongoose.Types.ObjectId,
    songId: mongoose.Types.ObjectId
  ): Promise<{ song: ISong; isLiked: boolean }> {
    try {
      const added = await Song.findOneAndUpdate(
        { _id: songId, likedBy: { $ne: userId } },
        { $push: { likedBy: userId }, $inc: { likesCount: 1 } },
        { new: true }
      ).lean();

      if (added) {
        try {
          await PlaylistService.addToLikedSongs(userId, songId);
        } catch (playlistError: any) {
          await Song.findByIdAndUpdate(songId, {
            $pull: { likedBy: userId },
            $inc: { likesCount: -1 },
          });
          throw playlistError;
        }

        return { song: added as unknown as ISong, isLiked: true };
      }

      const removed = await Song.findOneAndUpdate(
        { _id: songId, likedBy: userId },
        { $pull: { likedBy: userId }, $inc: { likesCount: -1 } },
        { new: true }
      ).lean();

      if (removed) {
        try {
          await PlaylistService.removeFromLikedSongs(userId, songId);
        } catch (playlistError: any) {
          await Song.findByIdAndUpdate(songId, {
            $push: { likedBy: userId },
            $inc: { likesCount: 1 },
          });
          throw playlistError;
        }

        return { song: removed as unknown as ISong, isLiked: false };
      }

      throw new Error("Song not found");
    } catch (error: any) {
      console.error("❌ Error toggling like song:", error.message || error);
      throw error;
    }
  }

  /**
   * Get liked songs for a user
   */
  static async getLikedSongs(
    userId: mongoose.Types.ObjectId,
    page: number = 1,
    limit: number = 20
  ): Promise<{ songs: ISong[]; total: number; page: number; totalPages: number }> {
    try {
      const skip = (page - 1) * limit;

      const songs = await Song.find({
        likedBy: userId,
        isPublic: true,
      })
        .populate("artist", "name imageUrl")
        .populate("uploadedBy", "username")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Song.countDocuments({
        likedBy: userId,
        isPublic: true,
      });

      const totalPages = Math.ceil(total / limit);

      const likedSongs = songs.map((song: any) => ({
        ...song,
        isLiked: true,
      }));

      return {
        songs: likedSongs,
        total,
        page,
        totalPages,
      };
    } catch (error: any) {
      console.error("❌ Error getting liked songs:", error.message);
      throw new Error(`Failed to get liked songs: ${error.message}`);
    }
  }

  /**
   * Check if a song is liked by user
   */
  static async isSongLikedByUser(
    userId: mongoose.Types.ObjectId,
    songId: mongoose.Types.ObjectId
  ): Promise<boolean> {
    try {
      const song = await Song.findById(songId).select("likedBy");
      if (!song) {
        return false;
      }

      return song.likedBy.some(
        (likedUserId: mongoose.Types.ObjectId) =>
          likedUserId.toString() === userId.toString()
      );
    } catch (error: any) {
      console.error("❌ Error checking if song is liked:", error.message);
      return false;
    }
  }
}
