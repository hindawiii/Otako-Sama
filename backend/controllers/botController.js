import crypto from "crypto";
import mongoose from "mongoose";
import User from "../models/User.js";
import WansaMessage from "../models/WansaMessage.js";

/**
 * Task 3.4 — Al-Wansa AI bot ("سامَا بوت").
 *
 * 100% portable, zero vendor lock-in:
 *  - If AI_API_KEY + AI_BASE_URL are set, we call ANY OpenAI-compatible
 *    endpoint (OpenRouter free tier, Groq, Together, a self-hosted Ollama…).
 *  - If they are not set, we fall back to a local rule-based Arabic replier,
 *    so the feature always works with no paid service at all.
 */

const BOT_USERNAME = "سامَا بوت";

/** Get (or lazily create) the bot's user document. */
async function ensureBotUser() {
  let bot = await User.findOne({ username: BOT_USERNAME });
  if (!bot) {
    bot = await User.create({
      username: BOT_USERNAME,
      email: "bot@otaku-sama.local",
      passwordHash: crypto.randomBytes(32).toString("hex"),
      avatarUrl: "",
      bio: "مساعد أوتاكو سَما داخل الونسة",
      preferredLanguage: "ar",
      role: "moderator",
    });
  }
  return bot;
}

const SYSTEM_PROMPT =
  'أنت "سامَا بوت"، مساعد ودود داخل تطبيق عربي للأوتاكو اسمه Otaku Sama. ' +
  "أجب بالعربية الفصحى المبسّطة (أو بالإنجليزية إذا سأل المستخدم بالإنجليزية)، " +
  "بإيجاز شديد (٣ أسطر كحد أقصى)، وبأسلوب مرح يناسب محبي الأنمي والمانجا.";

/** Local fallback brain — no network, no keys, no cost. */
function localReply(prompt) {
  const p = prompt.toLowerCase();
  const has = (...k) => k.some((w) => p.includes(w));

  if (has("مرحبا", "سلام", "هلا", "hi", "hello"))
    return "أهلاً بك في الونسة! 🎌 اسألني عن أي أنمي أو مانجا أو اطلب ترشيحات.";
  if (has("ترشيح", "اقترح", "recommend", "أفضل أنمي", "افضل انمي"))
    return "ترشيحاتي السريعة: Fullmetal Alchemist: Brotherhood ⚗️، Steins;Gate ⏳، Vinland Saga ⚔️، وMob Psycho 100 💫.";
  if (has("مانجا", "manga"))
    return "من أقوى المانجا حالياً: Berserk، Vagabond، Chainsaw Man، وOne Piece 🏴‍☠️.";
  if (has("نكتة", "joke", "ضحك"))
    return "ليش الننجا ما يلعب كرة؟ لأنه دايماً يختفي قبل ما يجي الجول! 🥷⚽";
  if (has("مساعدة", "help", "ماذا تفعل", "شنو تسوي"))
    return "أقدر أرشّح أنمي/مانجا، أشرح قصة عمل، أقترح أسئلة لاستطلاع، أو أونّسك بس 😄 — ناديني بـ @bot.";
  if (has("مستوى", "شارة", "xp", "level"))
    return "المستويات تزيد بالرسائل (٣ نقاط) والتفاعلات (٢) والوسائط (٥). واصل الونسة توصل أسطورة 👑.";
  return "سؤال حلو! ما عندي اتصال بنموذج ذكاء اصطناعي الآن، لكن اسألني عن ترشيحات أنمي أو مانجا وأساعدك فوراً 🌸";
}

/** Try an OpenAI-compatible chat completion; return null if unavailable. */
async function remoteReply(prompt, history) {
  const base = process.env.AI_BASE_URL;
  const key = process.env.AI_API_KEY;
  if (!base || !key) return null;

  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history,
          { role: "user", content: prompt },
        ],
        max_tokens: 300,
        temperature: 0.8,
      }),
    });
    if (!res.ok) {
      console.warn("[wansa.bot] provider error", res.status);
      return null;
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === "string" && text.trim() ? text.trim() : null;
  } catch (err) {
    console.warn("[wansa.bot] provider unreachable", err?.message);
    return null;
  }
}

/** POST /api/wansa/bot  body: { channel?, prompt, replyTo? } */
export async function askBot(req, res) {
  try {
    const prompt = String(req.body?.prompt ?? "").trim();
    if (!prompt) return res.status(400).json({ error: "prompt required" });
    if (prompt.length > 1000) return res.status(400).json({ error: "prompt too long (max 1000)" });

    const channel = String(req.body?.channel || "general").trim() || "general";
    const replyTo =
      req.body?.replyTo && mongoose.Types.ObjectId.isValid(req.body.replyTo)
        ? new mongoose.Types.ObjectId(req.body.replyTo)
        : null;

    // Light context: last few messages of the channel.
    const recent = await WansaMessage.find({ channel, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate("author", "username");
    const history = recent
      .reverse()
      .filter((m) => m.content)
      .map((m) => ({
        role: m.author?.username === BOT_USERNAME ? "assistant" : "user",
        content: m.content.slice(0, 500),
      }));

    const bot = await ensureBotUser();
    const text = (await remoteReply(prompt, history)) || localReply(prompt);

    const created = await WansaMessage.create({
      author: bot._id,
      channel,
      content: text,
      language: "ar",
      replyTo,
    });
    const populated = await created.populate("author", "username avatarUrl");
    const m = populated.toObject();

    return res.status(201).json({
      message: {
        id: m._id.toString(),
        channel: m.channel,
        content: m.content,
        language: m.language,
        attachment: null,
        replyTo: m.replyTo ? m.replyTo.toString() : null,
        reactions: [],
        isDeleted: false,
        author: {
          id: bot._id.toString(),
          username: bot.username,
          avatarUrl: bot.avatarUrl || "",
        },
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      },
    });
  } catch (err) {
    console.error("[wansa.bot]", err);
    return res.status(500).json({ error: "Failed to reach the bot" });
  }
}
