import mongoose from "mongoose";

const { Schema, model } = mongoose;

const AnimeMangaSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    titleAr: { type: String, default: "" },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    type: { type: String, enum: ["anime", "manga"], required: true, index: true },
    synopsis: { type: String, default: "" },
    synopsisAr: { type: String, default: "" },
    coverUrl: { type: String, default: "" },
    genres: [{ type: String, lowercase: true, trim: true }],
    status: {
      type: String,
      enum: ["ongoing", "completed", "upcoming", "hiatus"],
      default: "ongoing",
    },
    episodes: { type: Number, default: 0 }, // for anime
    chapters: { type: Number, default: 0 }, // for manga
    volumes: { type: Number, default: 0 }, // for manga
    releaseYear: { type: Number },
    studioOrAuthor: { type: String, default: "" },
    averageRating: { type: Number, default: 0, min: 0, max: 10 },
    ratingsCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default model("AnimeManga", AnimeMangaSchema);
