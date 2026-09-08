import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  listMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  toggleReaction,
} from "../controllers/wansaController.js";
import { askBot } from "../controllers/botController.js";

const router = Router();

// All Wansa endpoints require an authenticated user.
router.get("/messages", requireAuth, listMessages);
router.post("/messages", requireAuth, sendMessage);
router.patch("/messages/:id", requireAuth, editMessage);
router.delete("/messages/:id", requireAuth, deleteMessage);
router.post("/messages/:id/reactions", requireAuth, toggleReaction);
// Task 3.4 — AI bot (provider-agnostic, with local fallback).
router.post("/bot", requireAuth, askBot);

export default router;
