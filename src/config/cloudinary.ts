import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage configuration for avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "music-app/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [
      { width: 400, height: 400, crop: "fill", gravity: "face" },
      { quality: "auto", fetch_format: "auto" },
    ],
  } as any,
});

// Storage configuration for playlist thumbnails
const playlistStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "music-app/playlists",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [
      { width: 600, height: 600, crop: "fill" },
      { quality: "auto", fetch_format: "auto" },
    ],
  } as any,
});

// File filter function
const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

// Multer configurations
const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

const uploadPlaylistThumbnail = multer({
  storage: playlistStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Wrapper functions with error handling
export const uploadAvatarMiddleware = (req: any, res: any, next: any) => {
  console.log("🔧 Avatar upload middleware called");
  uploadAvatar.single("avatar")(req, res, (err: any) => {
    if (err) {
      console.error("❌ Multer avatar upload error:", err);
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    console.log("✅ Avatar upload middleware completed");
    console.log("  File:", req.file);
    next();
  });
};

export const uploadPlaylistThumbnailMiddleware = (req: any, res: any, next: any) => {
  console.log("🔧 Playlist thumbnail upload middleware called");
  uploadPlaylistThumbnail.single("thumbnail")(req, res, (err: any) => {
    if (err) {
      console.error("❌ Multer playlist upload error:", err);
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    console.log("✅ Playlist thumbnail upload middleware completed");
    console.log("  File:", req.file);
    next();
  });
};

export { cloudinary };
