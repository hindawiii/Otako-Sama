import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGO_URI;
  mongoose.set("bufferCommands", false); // CRITICAL: fail fast, don't hang
  mongoose.set("strictQuery", true);
  if (!uri) {
    console.warn("[otaku-sama] MONGO_URI is not set — running in offline mode");
    return;
  }
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("[otaku-sama] MongoDB connected");
  } catch (err) {
    console.warn("[otaku-sama] MongoDB not connected — running in offline mode:", err.message);
  }
}
