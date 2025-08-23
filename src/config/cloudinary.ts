import { v2 as cloudinary } from "cloudinary";
import multer from "multer";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// File filter function
const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

// Multer configuration for memory storage (we'll upload to Cloudinary manually)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Helper function to upload to Cloudinary
export const uploadToCloudinary = async (
  buffer: Buffer,
  folder: string,
  transformation?: any
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadOptions: any = {
      folder,
      resource_type: "auto",
    };

    if (transformation) {
      uploadOptions.transformation = transformation;
    }

    cloudinary.uploader
      .upload_stream(uploadOptions, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result!.secure_url);
        }
      })
      .end(buffer);
  });
};

// Helper function to delete from Cloudinary
export const deleteFromCloudinary = async (imageUrl: string): Promise<void> => {
  try {
    // Extract public_id from URL
    const parts = imageUrl.split("/");
    const filename = parts[parts.length - 1];
    const publicId = filename.split(".")[0];
    const folder = parts[parts.length - 2];
    const fullPublicId = `${folder}/${publicId}`;

    await cloudinary.uploader.destroy(fullPublicId);
    console.log(`🗑️ Deleted image from Cloudinary: ${fullPublicId}`);
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    throw error;
  }
};

// Middleware wrappers
export const uploadAvatarMiddleware = (req: any, res: any, next: any) => {
  console.log("🔧 Avatar upload middleware called");
  upload.single("avatar")(req, res, (err: any) => {
    if (err) {
      console.error("❌ Multer avatar upload error:", err);
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    console.log("✅ Avatar upload middleware completed");
    console.log("  File:", req.file ? "Present" : "Not provided");
    next();
  });
};

export const uploadPlaylistThumbnailMiddleware = (req: any, res: any, next: any) => {
  console.log("🔧 Playlist thumbnail upload middleware called");
  upload.single("thumbnail")(req, res, (err: any) => {
    if (err) {
      console.error("❌ Multer playlist upload error:", err);
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    console.log("✅ Playlist thumbnail upload middleware completed");
    console.log("  File:", req.file ? "Present" : "Not provided");
    next();
  });
};

export { cloudinary };
