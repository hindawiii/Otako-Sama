import mongoose from "mongoose";

const { Schema, model } = mongoose;

const GameSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    titleAr: { type: String, default: "" },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    descriptionAr: { type: String, default: "" },
    coverUrl: { type: String, default: "" },
    genres: [{ type: String, lowercase: true, trim: true }],
    platforms: [{ type: String, trim: true }], // e.g. "PC", "PS5", "Switch"
    releaseDate: { type: Date },
    developer: { type: String, default: "" },
    publisher: { type: String, default: "" },
    averageRating: { type: Number, default: 0, min: 0, max: 10 },
    ratingsCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default model("Game", GameSchema);
