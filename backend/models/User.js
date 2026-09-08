import mongoose from "mongoose";

const { Schema, model } = mongoose;

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, minlength: 3 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatarUrl: { type: String, default: "" },
    bio: { type: String, default: "", maxlength: 500 },
    country: { type: String, default: "" },
    preferredLanguage: { type: String, enum: ["ar", "en"], default: "ar" },
    role: { type: String, enum: ["user", "moderator", "admin"], default: "user" },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default model("User", UserSchema);
