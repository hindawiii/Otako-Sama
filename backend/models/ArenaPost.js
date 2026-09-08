import mongoose from "mongoose";

const { Schema, model, Types } = mongoose;

// "Arena" = discussions, debates, and community threads.
const CommentSchema = new Schema(
  {
    author: { type: Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, maxlength: 2000 },
    likes: [{ type: Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

const ArenaPostSchema = new Schema(
  {
    author: { type: Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 10_000 },
    tags: [{ type: String, lowercase: true, trim: true }],
    category: {
      type: String,
      enum: ["anime", "manga", "games", "cosplay", "news", "off-topic"],
      default: "off-topic",
      index: true,
    },
    language: { type: String, enum: ["ar", "en"], default: "ar" },
    likes: [{ type: Types.ObjectId, ref: "User" }],
    comments: [CommentSchema],
    isPinned: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default model("ArenaPost", ArenaPostSchema);
