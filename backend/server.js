import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";

// Register models so Mongoose is aware of them at boot.
import "./models/User.js";
import "./models/WansaMessage.js";
import "./models/ArenaPost.js";
import "./models/Game.js";
import "./models/AnimeManga.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "8mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "otaku-sama-backend",
    phase: 1,
    timestamp: new Date().toISOString(),
  });
});

// Feature routers
import authRouter from "./routes/authRoutes.js";
import wansaRouter from "./routes/wansaRoutes.js";
app.use("/api/auth", authRouter);
app.use("/api/wansa", wansaRouter);

// Later phases:
// app.use("/api/arena", arenaRouter);
// app.use("/api/games", gamesRouter);
// app.use("/api/library", libraryRouter);

// Database offline error middleware fallback
app.use((err, req, res, next) => {
  if (
    err.name === "MongooseError" ||
    err.name === "MongoNetworkError" ||
    (err.message && err.message.includes("buffering timed out"))
  ) {
    console.warn("[AI Studio] Database offline — returning mock empty response");
    if (req.method === "GET") {
      return res.json(req.path.endsWith("s") || req.path.endsWith("s/") ? [] : {});
    }
    return res.status(503).json({ error: "Service temporarily unavailable (database offline)" });
  }
  next(err);
});

export { app };

async function start() {
  try {
    await connectDB();
    if (process.env.NODE_ENV !== "test") {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`[otaku-sama] API listening on http://0.0.0.0:${PORT}`);
      });
    }
  } catch (err) {
    console.error("[otaku-sama] Failed to start:", err);
  }
}

if (process.argv[1] && process.argv[1].endsWith("server.js")) {
  start();
}
