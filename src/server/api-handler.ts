/**
 * Embedded Free-Tier / In-Memory Backend API Handler for Otaku Sama.
 * Provides complete API routes for /api/health, /api/auth/*, and /api/wansa/*.
 * Requires 0 external databases, 0 proprietary services, and 0 paid APIs.
 */

export interface MessageAttachment {
  kind: "image" | "file";
  url: string;
  name: string;
  mime: string;
  size: number;
}

export interface MessageReaction {
  user: string;
  emoji: string;
}

export interface ApiUser {
  id: string;
  username: string;
  avatarUrl: string;
  bio?: string;
  role?: string;
}

export interface StoredMessage {
  id: string;
  channel: string;
  content: string;
  language: string;
  attachment: MessageAttachment | null;
  replyTo: string | null;
  reactions: MessageReaction[];
  isDeleted: boolean;
  author: ApiUser;
  createdAt: string;
  updatedAt: string;
}

const BOT_USER: ApiUser = {
  id: "bot_sama",
  username: "سامَا بوت",
  avatarUrl: "",
  bio: "مساعد أوتاكو سَما داخل الونسة",
  role: "moderator",
};

// Seed initial messages for active channels so Al-Wansa is vibrant immediately
const messagesStore: StoredMessage[] = [
  {
    id: "msg_seed_1",
    channel: "general",
    content: "أهلاً بكم في ونسة أوتاكو ساما! 🎌 المكان العربي المخصص لنقاشات الأنمي والمانجا.",
    language: "ar",
    attachment: null,
    replyTo: null,
    reactions: [
      { user: "user_seed_1", emoji: "❤️" },
      { user: "user_seed_2", emoji: "🔥" },
    ],
    isDeleted: false,
    author: BOT_USER,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "msg_seed_2",
    channel: "general",
    content:
      "تقدر تسألني عن أي ترشيحات بكتابة @bot في رسالتك، أو جرّب استطلاعات الرأي والتفاعلات! 🌸",
    language: "ar",
    attachment: null,
    replyTo: null,
    reactions: [{ user: "user_seed_3", emoji: "✨" }],
    isDeleted: false,
    author: BOT_USER,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "msg_seed_3",
    channel: "anime",
    content: "ما هو أفضل أنمي في موسم هذا العام برأيكم؟",
    language: "ar",
    attachment: null,
    replyTo: null,
    reactions: [],
    isDeleted: false,
    author: {
      id: "otaku_senpai",
      username: "أوتاكو_سينباي",
      avatarUrl: "",
    },
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: "msg_seed_4",
    channel: "manga",
    content: "ممنوع الحرق في هذه القناة! أي نقاش يكون مشمولاً بتحذير الحرق رجاءً 📖",
    language: "ar",
    attachment: null,
    replyTo: null,
    reactions: [{ user: "mod_1", emoji: "👍" }],
    isDeleted: false,
    author: BOT_USER,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

const usersStore: Map<string, ApiUser & { passwordHash?: string }> = new Map([
  [BOT_USER.id, BOT_USER],
  [
    "guest_user",
    {
      id: "guest_user",
      username: "أوتاكو زائر",
      avatarUrl: "",
      bio: "عضو جديد في المجتمع",
    },
  ],
]);

function localBotReply(prompt: string): string {
  const p = prompt.toLowerCase();
  const has = (...keys: string[]) => keys.some((w) => p.includes(w.toLowerCase()));

  if (has("مرحبا", "سلام", "هلا", "hi", "hello", "أهلا", "اهلاً")) {
    return "أهلاً وسهلاً بك في ونسة أوتاكو ساما! 🎌 اسألني عن أي أنمي أو مانجا، أو اطلب ترشيحاً لعمل جديد.";
  }
  if (has("ترشيح", "اقترح", "recommend", "أفضل أنمي", "افضل انمي", "أنمي حلو", "انمي حلو")) {
    return "ترشيحاتي الحصرية: Hunter x Hunter ⚡، Steins;Gate ⏳، Vinland Saga ⚔️، وMob Psycho 100 💫. ما هو تصنيفك المفضل؟";
  }
  if (has("مانجا", "manga")) {
    return "أقوى المانجات للقراءة: Berserk 🗡️، Vagabond 🎋، Kingdom 🏯، وChainsaw Man 🩸.";
  }
  if (has("نكتة", "joke", "ضحك")) {
    return "ليش النينجا ما يحب يلعب استغماية؟ لأنه إذا اختفى ما يرجع إلا بعد انتهاء الموسم! 🥷😂";
  }
  if (has("ون بيس", "one piece", "لوفي")) {
    return "الون بيس حقيقي! 🏴‍☠️ سفينة قبعة القش تبحر نحو الحقيقة الكاملة.";
  }
  if (has("شينجيكي", "attack on titan", "هجوم العمالقة", "ايرين")) {
    return "تاتكاي! 🕊️ أنمي غير مفاهيم القصة والدراما في عالم الأنمي.";
  }
  if (has("مساعدة", "help", "ماذا تفعل", "شنو تسوي")) {
    return "أنا سامَا بوت 🤖! أستطيع ترشيح الأعمال، شرح القصص، والإجابة عن نقاشات الأنمي والمانجا. اكتب @bot في أي رسالة للتحدث معي.";
  }
  if (has("مستوى", "شارة", "xp", "level")) {
    return "مستواك يرتفع كلما شاركت أكثر في الونسة! الرسائل، التفاعلات، وإنشاء الاستطلاعات كلها تزيد نقاطك 🏆.";
  }

  return "سؤال جميل ومثير للاهتمام! في عالم الأنمي دائماً توجد إجابات متعددة 🌸 اكتب لي تصنيفك المفضل (أكشن، غموض، نفسي، شونين) لأرشح لك أفضل ما كُتب!";
}

function parseAuthUser(authHeader: string | null): ApiUser {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      id: "guest_anon",
      username: "زائر",
      avatarUrl: "",
    };
  }

  const token = authHeader.slice(7).trim();
  try {
    const parts = token.split(".");
    if (parts.length >= 2) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      const id = String(payload.sub || payload.id || "guest_user");
      const username = String(payload.username || "أوتاكو");
      const existing = usersStore.get(id);
      if (existing) return existing;
      const user: ApiUser = { id, username, avatarUrl: "" };
      usersStore.set(id, user);
      return user;
    }
  } catch {
    // fallback
  }

  return {
    id: "guest_user",
    username: "أوتاكو زائر",
    avatarUrl: "",
  };
}

/**
 * Handle incoming API Request and produce standard Web Response
 */
export async function handleApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (!pathname.startsWith("/api/")) {
    return null;
  }

  const method = request.method;
  const authUser = parseAuthUser(request.headers.get("authorization"));

  // CORS headers
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  // GET /api/health
  if (pathname === "/api/health" && method === "GET") {
    return new Response(
      JSON.stringify({
        status: "ok",
        service: "otaku-sama-backend",
        phase: 1,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers },
    );
  }

  // GET /api/auth/me
  if (pathname === "/api/auth/me" && method === "GET") {
    return new Response(
      JSON.stringify({
        user: authUser,
      }),
      { status: 200, headers },
    );
  }

  // POST /api/auth/register
  if (pathname === "/api/auth/register" && method === "POST") {
    try {
      const body = (await request.json()) as { username?: string; email?: string };
      const username = (body.username || "أوتاكو").trim();
      const id = "usr_" + Math.random().toString(36).slice(2, 9);
      const user: ApiUser = {
        id,
        username,
        avatarUrl: "",
        bio: "عضو جديد في أوتاكو ساما",
        role: "user",
      };
      usersStore.set(id, user);

      const payload = btoa(JSON.stringify({ sub: id, username, role: "user" }));
      const token = `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`;

      return new Response(JSON.stringify({ token, user }), { status: 201, headers });
    } catch {
      return new Response(JSON.stringify({ error: "Invalid registration payload" }), {
        status: 400,
        headers,
      });
    }
  }

  // POST /api/auth/login
  if (pathname === "/api/auth/login" && method === "POST") {
    try {
      const body = (await request.json()) as { username?: string };
      const username = (body.username || "أوتاكو").trim();
      const id = "usr_" + Math.random().toString(36).slice(2, 9);
      const user: ApiUser = {
        id,
        username,
        avatarUrl: "",
        role: "user",
      };
      usersStore.set(id, user);

      const payload = btoa(JSON.stringify({ sub: id, username, role: "user" }));
      const token = `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`;

      return new Response(JSON.stringify({ token, user }), { status: 200, headers });
    } catch {
      return new Response(JSON.stringify({ error: "Invalid login payload" }), {
        status: 400,
        headers,
      });
    }
  }

  // GET /api/wansa/messages?channel=...
  if (pathname === "/api/wansa/messages" && method === "GET") {
    const channel = url.searchParams.get("channel") || "general";
    const filtered = messagesStore.filter((m) => m.channel === channel);
    return new Response(
      JSON.stringify({
        channel,
        messages: filtered,
      }),
      { status: 200, headers },
    );
  }

  // POST /api/wansa/messages
  if (pathname === "/api/wansa/messages" && method === "POST") {
    try {
      const body = (await request.json()) as {
        channel?: string;
        content?: string;
        replyTo?: string | null;
        attachment?: MessageAttachment | null;
        language?: string;
      };

      const channel = String(body.channel || "general").trim() || "general";
      const content = String(body.content ?? "");
      const attachment = body.attachment || null;

      if (!content.trim() && !attachment) {
        return new Response(JSON.stringify({ error: "Message content or attachment required" }), {
          status: 400,
          headers,
        });
      }

      const now = new Date().toISOString();
      const newMsg: StoredMessage = {
        id: "msg_" + Math.random().toString(36).slice(2, 10),
        channel,
        content,
        language: body.language || "ar",
        attachment,
        replyTo: body.replyTo || null,
        reactions: [],
        isDeleted: false,
        author: authUser,
        createdAt: now,
        updatedAt: now,
      };

      messagesStore.push(newMsg);

      return new Response(JSON.stringify({ message: newMsg }), { status: 201, headers });
    } catch {
      return new Response(JSON.stringify({ error: "Failed to create message" }), {
        status: 400,
        headers,
      });
    }
  }

  // PATCH /api/wansa/messages/:id
  const patchMatch = pathname.match(/^\/api\/wansa\/messages\/([^/]+)$/);
  if (patchMatch && method === "PATCH") {
    const id = patchMatch[1];
    const msg = messagesStore.find((m) => m.id === id);
    if (!msg) {
      return new Response(JSON.stringify({ error: "Message not found" }), {
        status: 404,
        headers,
      });
    }

    try {
      const body = (await request.json()) as { content?: string };
      msg.content = String(body.content ?? msg.content);
      msg.updatedAt = new Date().toISOString();
      return new Response(JSON.stringify({ message: msg }), { status: 200, headers });
    } catch {
      return new Response(JSON.stringify({ error: "Invalid edit payload" }), {
        status: 400,
        headers,
      });
    }
  }

  // DELETE /api/wansa/messages/:id
  const deleteMatch = pathname.match(/^\/api\/wansa\/messages\/([^/]+)$/);
  if (deleteMatch && method === "DELETE") {
    const id = deleteMatch[1];
    const msg = messagesStore.find((m) => m.id === id);
    if (msg) {
      msg.isDeleted = true;
      msg.content = "";
      msg.attachment = null;
    }
    return new Response(JSON.stringify({ ok: true, id }), { status: 200, headers });
  }

  // POST /api/wansa/messages/:id/reactions
  const reactMatch = pathname.match(/^\/api\/wansa\/messages\/([^/]+)\/reactions$/);
  if (reactMatch && method === "POST") {
    const id = reactMatch[1];
    const msg = messagesStore.find((m) => m.id === id);
    if (!msg) {
      return new Response(JSON.stringify({ error: "Message not found" }), {
        status: 404,
        headers,
      });
    }

    try {
      const body = (await request.json()) as { emoji?: string };
      const emoji = String(body.emoji ?? "").trim();
      if (!emoji) {
        return new Response(JSON.stringify({ error: "Emoji required" }), {
          status: 400,
          headers,
        });
      }

      const existingIndex = msg.reactions.findIndex(
        (r) => r.user === authUser.id && r.emoji === emoji,
      );

      if (existingIndex >= 0) {
        msg.reactions.splice(existingIndex, 1);
      } else {
        msg.reactions.push({ user: authUser.id, emoji });
      }

      return new Response(JSON.stringify({ message: msg }), { status: 200, headers });
    } catch {
      return new Response(JSON.stringify({ error: "Reaction error" }), {
        status: 400,
        headers,
      });
    }
  }

  // POST /api/wansa/bot
  if (pathname === "/api/wansa/bot" && method === "POST") {
    try {
      const body = (await request.json()) as {
        channel?: string;
        prompt?: string;
        replyTo?: string | null;
      };

      const prompt = String(body.prompt ?? "").trim() || "مرحباً";
      const channel = String(body.channel || "general").trim() || "general";
      const replyTo = body.replyTo || null;

      const replyText = localBotReply(prompt);
      const now = new Date().toISOString();

      const botMsg: StoredMessage = {
        id: "msg_bot_" + Math.random().toString(36).slice(2, 10),
        channel,
        content: replyText,
        language: "ar",
        attachment: null,
        replyTo,
        reactions: [],
        isDeleted: false,
        author: BOT_USER,
        createdAt: now,
        updatedAt: now,
      };

      messagesStore.push(botMsg);

      return new Response(JSON.stringify({ message: botMsg }), { status: 201, headers });
    } catch {
      return new Response(JSON.stringify({ error: "Bot reply failed" }), {
        status: 500,
        headers,
      });
    }
  }

  return new Response(JSON.stringify({ error: "Not Found" }), { status: 404, headers });
}

export function apiConnectMiddleware(
  req: {
    url?: string;
    method?: string;
    headers: Record<string, string | string[] | undefined>;
    on: (event: string, fn: (...args: unknown[]) => void) => void;
  },
  res: {
    statusCode: number;
    setHeader: (name: string, value: string) => void;
    end: (chunk?: string) => void;
  },
  next: () => void,
) {
  if (!req.url?.startsWith("/api/")) {
    return next();
  }

  const host = Array.isArray(req.headers.host) ? req.headers.host[0] : req.headers.host;
  const url = `http://${host || "localhost:3000"}${req.url}`;
  const method = req.method || "GET";

  const chunks: Buffer[] = [];
  req.on("data", (chunk: unknown) => {
    if (Buffer.isBuffer(chunk)) {
      chunks.push(chunk);
    } else if (typeof chunk === "string") {
      chunks.push(Buffer.from(chunk));
    }
  });

  req.on("end", async () => {
    try {
      const bodyBuffer = Buffer.concat(chunks);
      const headerEntries = Object.entries(req.headers)
        .filter(([, val]) => val !== undefined)
        .map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : String(v)] as [string, string]);

      const webReq = new Request(url, {
        method,
        headers: new Headers(headerEntries),
        body: ["GET", "HEAD"].includes(method) ? undefined : bodyBuffer,
      });

      const response = await handleApiRequest(webReq);
      if (!response) {
        return next();
      }

      res.statusCode = response.status;
      response.headers.forEach((val, key) => {
        res.setHeader(key, val);
      });
      const resText = await response.text();
      res.end(resText);
    } catch (err) {
      console.error("[api] Middleware error:", err);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Internal API error" }));
    }
  });
}
