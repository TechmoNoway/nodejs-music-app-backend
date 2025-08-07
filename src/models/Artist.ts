import mongoose, { Document, Schema } from "mongoose";

export interface IArtist extends Document {
  name: string;
  bio: string;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

const artistSchema = new Schema<IArtist>(
  {
    name: {
      type: String,
      required: [true, "Artist name is required"],
      trim: true,
      unique: true,
      maxlength: [100, "Name is not exceed 100 characters"],
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [1000, "Bio must not exceed 1000 characters"],
    },
    imageUrl: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

artistSchema.index({ name: "text" });
artistSchema.index({ genre: 1 });

export const Artist = mongoose.model<IArtist>("Artist", artistSchema);
