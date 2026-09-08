import mongoose from "mongoose";

const { Schema, model, Types } = mongoose;

// "Wansa" = Otaku Sama's social chat/companion channel.
const WansaMessageSchema = new Schema(
  {
    author: { type: Types.ObjectId, ref: "User", required: true, index: true },
    channel: { type: String, default: "general", index: true },
    content: { type: String, default: "", maxlength: 2000 },
    language: { type: String, enum: ["ar", "en"], default: "ar" },
    // Task 2.2 — media. Stored inline as a data URL to stay 100% portable
    // (no object-storage vendor). Keep files small (<= 1.5MB) for free tiers.
    attachment: {
      kind: { type: String, enum: ["image", "file"], default: undefined },
      url: { type: String },
      name: { type: String },
      mime: { type: String },
      size: { type: Number },
    },
    replyTo: { type: Types.ObjectId, ref: "WansaMessage", default: null },

    reactions: [
      {
        user: { type: Types.ObjectId, ref: "User" },
        emoji: { type: String },
      },
    ],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default model("WansaMessage", WansaMessageSchema);
