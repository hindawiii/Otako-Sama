import mongoose from "mongoose";
import WansaMessage from "../models/WansaMessage.js";

const { Types } = mongoose;

/**
 * Shape a message document for the client. Populates author basics so the
 * frontend doesn't need a second round-trip to render avatars/usernames.
 */
function publicMessage(doc) {
  if (!doc) return null;
  const m = doc.toObject ? doc.toObject() : doc;
  return {
    id: m._id.toString(),
    channel: m.channel,
    content: m.isDeleted ? "" : m.content,
    language: m.language,
    attachment:
      !m.isDeleted && m.attachment && m.attachment.url
        ? {
            kind: m.attachment.kind || "file",
            url: m.attachment.url,
            name: m.attachment.name || "",
            mime: m.attachment.mime || "",
            size: m.attachment.size || 0,
          }
        : null,
    replyTo: m.replyTo ? m.replyTo.toString() : null,

    reactions: (m.reactions || []).map((r) => ({
      user: r.user?.toString?.() || String(r.user),
      emoji: r.emoji,
    })),
    isDeleted: !!m.isDeleted,
    author:
      m.author && m.author.username
        ? {
            id: m.author._id.toString(),
            username: m.author.username,
            avatarUrl: m.author.avatarUrl || "",
          }
        : { id: m.author?.toString?.() || String(m.author) },
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

/** GET /api/wansa/messages?channel=general&limit=50&before=<iso> */
export async function listMessages(req, res) {
  try {
    const channel = String(req.query.channel || "general").trim() || "general";
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const before = req.query.before ? new Date(String(req.query.before)) : null;

    const query = { channel };
    if (before && !isNaN(before.getTime())) {
      query.createdAt = { $lt: before };
    }

    const rows = await WansaMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("author", "username avatarUrl");

    // Return in chronological order (oldest -> newest) for easy render.
    const messages = rows.reverse().map(publicMessage);
    return res.json({ channel, messages });
  } catch (err) {
    console.error("[wansa.list]", err);
    return res.status(500).json({ error: "Failed to load messages" });
  }
}

/** Max inline attachment payload (data URL chars) ≈ 2MB — keeps free tiers happy. */
const MAX_ATTACHMENT_CHARS = 2 * 1024 * 1024;

/** Validate an inline attachment payload; returns [attachment|null, error|null]. */
function parseAttachment(raw) {
  if (!raw) return [null, null];
  const url = String(raw.url ?? "");
  if (!url.startsWith("data:")) return [null, "attachment must be a data URL"];
  if (url.length > MAX_ATTACHMENT_CHARS) return [null, "attachment too large (max ~1.5MB)"];
  const mime = String(raw.mime ?? "").slice(0, 100);
  const kind = raw.kind === "image" || mime.startsWith("image/") ? "image" : "file";
  return [
    {
      kind,
      url,
      name: String(raw.name ?? "file").slice(0, 200),
      mime,
      size: Number(raw.size) || url.length,
    },
    null,
  ];
}

/** POST /api/wansa/messages   body: { channel?, content, replyTo?, language?, attachment? } */
export async function sendMessage(req, res) {
  try {
    const { content, channel, replyTo, language, attachment } = req.body ?? {};
    const text = String(content ?? "").trim();
    const [att, attErr] = parseAttachment(attachment);
    if (attErr) return res.status(400).json({ error: attErr });
    if (!text && !att) return res.status(400).json({ error: "content required" });
    if (text.length > 2000) return res.status(400).json({ error: "content too long (max 2000)" });

    let replyToId = null;
    if (replyTo) {
      if (!Types.ObjectId.isValid(replyTo))
        return res.status(400).json({ error: "invalid replyTo" });
      replyToId = new Types.ObjectId(replyTo);
    }

    const created = await WansaMessage.create({
      author: req.user.id,
      channel: String(channel || "general").trim() || "general",
      content: text,
      language: language === "en" ? "en" : "ar",
      attachment: att || undefined,
      replyTo: replyToId,
    });

    const populated = await created.populate("author", "username avatarUrl");
    return res.status(201).json({ message: publicMessage(populated) });
  } catch (err) {
    console.error("[wansa.send]", err);
    return res.status(500).json({ error: "Failed to send message" });
  }
}

/** PATCH /api/wansa/messages/:id   body: { content } — author only */
export async function editMessage(req, res) {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: "invalid id" });
    const text = String(req.body?.content ?? "").trim();
    if (!text) return res.status(400).json({ error: "content required" });
    if (text.length > 2000) return res.status(400).json({ error: "content too long (max 2000)" });

    const msg = await WansaMessage.findById(id);
    if (!msg || msg.isDeleted) return res.status(404).json({ error: "message not found" });
    if (msg.author.toString() !== req.user.id)
      return res.status(403).json({ error: "not the author" });

    msg.content = text;
    await msg.save();
    const populated = await msg.populate("author", "username avatarUrl");
    return res.json({ message: publicMessage(populated) });
  } catch (err) {
    console.error("[wansa.edit]", err);
    return res.status(500).json({ error: "Failed to edit message" });
  }
}

/** DELETE /api/wansa/messages/:id — author or moderator/admin (soft delete) */
export async function deleteMessage(req, res) {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: "invalid id" });

    const msg = await WansaMessage.findById(id);
    if (!msg || msg.isDeleted) return res.status(404).json({ error: "message not found" });

    const isAuthor = msg.author.toString() === req.user.id;
    const isMod = ["moderator", "admin"].includes(req.user.role);
    if (!isAuthor && !isMod) return res.status(403).json({ error: "not allowed" });

    msg.isDeleted = true;
    msg.content = "";
    msg.attachment = undefined;

    await msg.save();
    return res.json({ ok: true, id });
  } catch (err) {
    console.error("[wansa.delete]", err);
    return res.status(500).json({ error: "Failed to delete message" });
  }
}

/** POST /api/wansa/messages/:id/reactions   body: { emoji } — toggles the reaction */
export async function toggleReaction(req, res) {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: "invalid id" });
    const emoji = String(req.body?.emoji ?? "").trim();
    if (!emoji || emoji.length > 8) return res.status(400).json({ error: "emoji required" });

    const msg = await WansaMessage.findById(id);
    if (!msg || msg.isDeleted) return res.status(404).json({ error: "message not found" });

    const idx = (msg.reactions || []).findIndex(
      (r) => r.user?.toString() === req.user.id && r.emoji === emoji,
    );
    if (idx >= 0) msg.reactions.splice(idx, 1);
    else msg.reactions.push({ user: req.user.id, emoji });

    await msg.save();
    const populated = await msg.populate("author", "username avatarUrl");
    return res.json({ message: publicMessage(populated) });
  } catch (err) {
    console.error("[wansa.react]", err);
    return res.status(500).json({ error: "Failed to react" });
  }
}
