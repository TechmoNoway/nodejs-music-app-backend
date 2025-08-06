import mongoose, { Document, Schema } from "mongoose";

export interface ISong extends Document {
  title: string;
  artist: mongoose.Types.ObjectId;
  duration: number;
  genre: string;
  fileUrl: string;
  thumbnailUrl?: string;
  lyrics?: string;
  isPublic: boolean;
  playCount: number;
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const songSchema = new Schema<ISong>(
  {
    title: {
      type: String,
      required: [true, "Song title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    artist: {
      type: Schema.Types.ObjectId,
      ref: "Artist",
      required: [true, "Artist is required"],
    },
    duration: {
      type: Number,
      required: [true, "Duration is required"],
      min: [1, "Duration must be at least 1 second"],
    },
    genre: {
      type: String,
      required: [true, "Genre is required"],
      trim: true,
      enum: [
        "Rock",
        "Pop",
        "Hip Hop",
        "R&B",
        "Country",
        "Electronic",
        "Classical",
        "Jazz",
        "Blues",
        "Folk",
        "Reggae",
        "Punk",
        "Metal",
        "Alternative",
        "Indie",
        "Dance",
        "Latin",
        "World",
        "Soundtrack",
        "Other",
      ],
    },
    fileUrl: {
      type: String,
      required: [true, "File URL is required"],
    },
    thumbnailUrl: {
      type: String,
      default: null,
    },
    lyrics: {
      type: String,
      default: null,
    },
    isPublic: {
      type: Boolean,
      default: true,
      required: [true, "Public status is required"],
    },
    playCount: {
      type: Number,
      default: 0,
      min: [0, "Play count cannot be negative"],
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Uploader is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Index for better search performance
songSchema.index({ title: "text", genre: 1 });
songSchema.index({ artist: 1, album: 1 });
songSchema.index({ isPublic: 1, createdAt: -1 });

export const Song = mongoose.model<ISong>("Song", songSchema);
