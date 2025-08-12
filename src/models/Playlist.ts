import mongoose, { Document, Schema } from "mongoose";

export interface IPlaylist extends Document {
  name: string;
  description?: string;
  coverImageUrl?: string;
  owner: mongoose.Types.ObjectId;
  songs: mongoose.Types.ObjectId[];
  totalDuration: number;
  isDefault: boolean;
  playlistType: "custom" | "liked" | "recently_played" | "favorites";
  createdAt: Date;
  updatedAt: Date;
}

const playlistSchema = new Schema<IPlaylist>(
  {
    name: {
      type: String,
      required: [true, "Playlist name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    coverImageUrl: {
      type: String,
      default: null,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner is required"],
    },
    songs: [
      {
        type: Schema.Types.ObjectId,
        ref: "Song",
      },
    ],
    totalDuration: {
      type: Number,
      default: 0,
      min: 0,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    playlistType: {
      type: String,
      enum: ["custom", "liked", "recently_played", "favorites"],
      default: "custom",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
playlistSchema.index({ name: "text" });
playlistSchema.index({ owner: 1, createdAt: -1 });
playlistSchema.index({ owner: 1, playlistType: 1 });
playlistSchema.index({ owner: 1, isDefault: 1 });

// Middleware to prevent deletion of default playlists
playlistSchema.pre("deleteOne", { document: true, query: false }, function (next) {
  if (this.isDefault) {
    return next(new Error("Cannot delete default playlist"));
  }
  next();
});

playlistSchema.pre("findOneAndDelete", function (next) {
  this.where({ isDefault: { $ne: true } });
  next();
});

export const Playlist = mongoose.model<IPlaylist>("Playlist", playlistSchema);
