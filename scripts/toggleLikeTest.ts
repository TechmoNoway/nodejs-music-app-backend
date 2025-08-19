import mongoose from "mongoose";
import dotenv from "dotenv";
import { SongService } from "../src/services/songService";
import { User } from "../src/models/User";
import { Song } from "../src/models/Song";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/music-app";

const run = async () => {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to DB");

  const user = await User.findOne();
  const song = await Song.findOne();

  if (!user || !song) {
    console.error("Need at least one user and one song in DB");
    process.exit(1);
  }

  const userId = user._id as mongoose.Types.ObjectId;
  const songId = song._id as mongoose.Types.ObjectId;

  console.log("Using user:", userId.toString(), "song:", songId.toString());

  // Fire two concurrent toggles
  const p1 = SongService.toggleLikeSong(userId, songId);
  const p2 = SongService.toggleLikeSong(userId, songId);

  const results = await Promise.allSettled([p1, p2]);

  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      console.log(
        `Call ${i + 1} fulfilled: isLiked=${r.value.isLiked}, likesCount=${
          r.value.song.likesCount
        }`
      );
    } else {
      console.log(`Call ${i + 1} rejected:`, r.reason?.message || r.reason);
    }
  });

  const fresh = await Song.findById(songId).lean();
  console.log(
    "Final likesCount:",
    fresh?.likesCount,
    "likedBy length:",
    Array.isArray(fresh?.likedBy) ? fresh!.likedBy.length : "n/a"
  );

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
