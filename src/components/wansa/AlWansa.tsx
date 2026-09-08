import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Search,
  MoreVertical,
  Paperclip,
  Smile,
  Send,
  Phone,
  Video,
  Users,
  Hash,
  MessageCircle,
  Reply,
  X,
  Loader2,
  AlertCircle,
  Pencil,
  Trash2,
  Copy,
  Check,
  ChevronUp,
  ChevronDown,
  FileText,
  Download,
  Image as ImageIcon,
  Info,
  Forward,
  Pin,
  PinOff,
  BarChart3,
  Palette,
  Plus,
  Bot,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Ban,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { getToken } from "@/lib/api";
import {
  listMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  toggleReaction,
  fileToAttachment,
  MAX_ATTACHMENT_BYTES,
  askBot,
  mentionsBot,
  stripBotMention,
  type WansaMessage as ApiMessage,
  type WansaAttachment,
} from "@/lib/wansa-api";
import { WANSA_THEMES, useWansaTheme } from "./themes";
import { computeStats, type UserStats } from "./badges";
import { WANSA_CHANNELS, type WansaChannel } from "./channels";
import { loadPinnedChats, togglePinnedChat, loadPinnedMessages, togglePinnedMessage } from "./pins";
import { useWansaPrivacy, isBlocked } from "./privacy";
import {
  encodePoll,
  parsePoll,
  tallyVotes,
  voteToken,
  isVoteToken,
  MAX_POLL_OPTIONS,
} from "./polls";

const REACTION_EMOJIS = ["❤️", "😂", "🔥", "👍", "😮", "😢"];

/**
 * Al-Wansa — WhatsApp-inspired chat shell.
 * Task 1.4: wire real send/receive against /api/wansa + reply-to composer.
 */

/** Decode the `sub` claim from a JWT without verifying — client identity only. */
function currentUserId(): string | null {
  const t = getToken();
  if (!t) return null;
  try {
    const payload = t.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const obj = JSON.parse(json);
    return typeof obj.sub === "string" ? obj.sub : null;
  } catch {
    return null;
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

type ReactionGroup = { emoji: string; count: number; mine: boolean };

/** Collapse a message's raw reactions into [{ emoji, count, mine }]. */
function groupReactions(m: ApiMessage, meId: string | null): ReactionGroup[] {
  const map = new Map<string, ReactionGroup>();
  for (const r of m.reactions ?? []) {
    if (isVoteToken(r.emoji)) continue; // poll votes render inside the poll card
    const g = map.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false };
    g.count += 1;
    if (meId && r.user === meId) g.mine = true;
    map.set(r.emoji, g);
  }
  return [...map.values()];
}

export function AlWansa() {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // Task 2.5 — pinned chats (local, per-device)
  const [pinnedChats, setPinnedChats] = useState<string[]>([]);
  useEffect(() => setPinnedChats(loadPinnedChats()), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = !q
      ? WANSA_CHANNELS
      : WANSA_CHANNELS.filter(
          (c) => c.name.toLowerCase().includes(q) || (c.topic ?? "").toLowerCase().includes(q),
        );
    // pinned chats float to the top, keeping their pin order
    return [...base].sort((a, b) => {
      const ia = pinnedChats.indexOf(a.id);
      const ib = pinnedChats.indexOf(b.id);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, [query, pinnedChats]);

  const active = WANSA_CHANNELS.find((c) => c.id === activeId) || null;
  const { theme } = useWansaTheme();

  return (
    <div
      style={theme.vars as React.CSSProperties}
      className="wansa-root -mx-4 -mt-4 mb-[-6rem] flex h-[calc(100dvh-8.5rem)] flex-col overflow-hidden rounded-none bg-[#0a0a12] text-slate-100"
    >
      {active ? (
        <ChatView channel={active} onBack={() => setActiveId(null)} />
      ) : (
        <ChannelList
          channels={filtered}
          activeId={activeId}
          onOpen={(id) => setActiveId(id)}
          title={t("sections.wansa.title")}
          query={query}
          onQueryChange={setQuery}
          pinnedChats={pinnedChats}
          onTogglePin={(id) => setPinnedChats(togglePinnedChat(id))}
        />
      )}
    </div>
  );
}

/* --------------------------- Channel list (sidebar) --------------------------- */

function ChannelList({
  channels,
  activeId,
  onOpen,
  title,
  query,
  onQueryChange,
  pinnedChats,
  onTogglePin,
}: {
  channels: WansaChannel[];
  activeId: string | null;
  onOpen: (id: string) => void;
  title: string;
  query: string;
  onQueryChange: (v: string) => void;
  pinnedChats: string[];
  onTogglePin: (id: string) => void;
}) {
  const { privacy } = useWansaPrivacy();
  const hidePreviews = privacy.hidePreviews;

  return (
    <div className="flex h-full flex-col bg-[#0a0a12]">
      <div className="flex items-center justify-between border-b border-white/5 bg-[#12121e] px-4 py-3">
        <h2 className="text-base font-semibold text-slate-100">{title}</h2>
        <div className="flex items-center gap-1 text-slate-400">
          <button className="rounded-full p-2 transition hover:bg-white/5" aria-label="search">
            <Search className="h-4 w-4" />
          </button>
          <button className="rounded-full p-2 transition hover:bg-white/5" aria-label="more">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="border-b border-white/5 bg-[#12121e] px-4 py-2">
        <div className="flex items-center gap-2 rounded-full bg-[#1a1a2e] px-3 py-2">
          <Search className="h-3.5 w-3.5 text-slate-500" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
            placeholder="ابحث عن محادثة..."
          />
        </div>
      </div>

      {channels.length === 0 ? (
        <EmptyChannels />
      ) : (
        <ul className="flex-1 divide-y divide-white/5 overflow-y-auto">
          {channels.map((c) => {
            const isActive = c.id === activeId;
            const isPinned = pinnedChats.includes(c.id);
            return (
              <li key={c.id} className="relative">
                <button
                  onClick={() => onOpen(c.id)}
                  className={cn(
                    "flex w-full items-center gap-3 py-3 pe-12 ps-4 text-start transition",
                    isActive ? "bg-white/[0.04]" : "hover:bg-white/5",
                    isPinned && "bg-white/[0.02]",
                  )}
                  aria-current={isActive ? "true" : undefined}
                >
                  <div className="relative">
                    <div
                      className={cn(
                        "grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-semibold text-white",
                        c.kind === "group"
                          ? "bg-gradient-to-br from-indigo-500 to-fuchsia-600"
                          : "bg-gradient-to-br from-emerald-500 to-cyan-600",
                      )}
                    >
                      {c.kind === "group" ? <Hash className="h-5 w-5" /> : c.name.charAt(0)}
                    </div>
                    {c.online && (
                      <span className="absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full border-2 border-[#0a0a12] bg-emerald-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-slate-100">{c.name}</span>
                      {c.time && (
                        <span className="shrink-0 text-[10px] text-slate-500">{c.time}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-slate-400">
                        {hidePreviews ? "رسالة جديدة" : (c.lastMessage ?? c.topic ?? "")}
                      </p>
                      {c.unread ? (
                        <span className="grid h-4 min-w-4 shrink-0 place-items-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-[#0a0a12]">
                          {c.unread}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => onTogglePin(c.id)}
                  className={cn(
                    "absolute end-2 top-1/2 -translate-y-1/2 rounded-full p-2 transition",
                    isPinned
                      ? "text-emerald-400 hover:bg-white/10"
                      : "text-slate-600 hover:bg-white/10 hover:text-slate-300",
                  )}
                  aria-label={isPinned ? "إلغاء تثبيت المحادثة" : "تثبيت المحادثة"}
                  title={isPinned ? "إلغاء التثبيت" : "تثبيت المحادثة"}
                >
                  {isPinned ? (
                    <Pin className="h-4 w-4 fill-current" />
                  ) : (
                    <Pin className="h-4 w-4" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EmptyChannels() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-white/5 text-slate-400">
        <MessageCircle className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-slate-200">لا توجد محادثات مطابقة</p>
      <p className="text-xs text-slate-500">جرّب كلمة بحث أخرى أو امسح الحقل لرؤية كل القنوات.</p>
    </div>
  );
}

/* ------------------------- Task 3.3 — badges & levels --------------------------- */

function BadgeChip({ s, showName = false }: { s?: UserStats; showName?: boolean }) {
  if (!s) return null;
  return (
    <span
      title={`المستوى ${s.level.level} — ${s.level.name} • ${s.xp} XP`}
      className={cn(
        "ms-1 inline-flex items-center gap-1 rounded-full px-1.5 py-[1px] text-[9px] font-semibold align-middle",
        s.level.chip,
      )}
    >
      <span aria-hidden>{s.level.emoji}</span>
      {showName ? s.level.name : `L${s.level.level}`}
    </span>
  );
}

function LevelBar({ s }: { s: UserStats }) {
  return (
    <div className="mt-1">
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${Math.round(s.progress * 100)}%` }}
        />
      </div>
      <div className="mt-0.5 text-[10px] text-slate-500">
        {s.xp} XP
        {s.next ? ` • ${s.next.min - s.xp} XP للمستوى ${s.next.name}` : " • أعلى مستوى"}
      </div>
    </div>
  );
}

/* ---------------------------------- Chat view --------------------------------- */

function ChatView({ channel, onBack }: { channel: WansaChannel; onBack: () => void }) {
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  // Task 3.4 — AI bot state.
  const [botThinking, setBotThinking] = useState(false);
  const [replyTo, setReplyTo] = useState<ApiMessage | null>(null);
  const [menuFor, setMenuFor] = useState<ApiMessage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [copied, setCopied] = useState(false);
  // Task 3.2 — chat theme
  const { themeId, setTheme } = useWansaTheme();
  const [themeOpen, setThemeOpen] = useState(false);
  // Task 2.5 — pinned messages in this channel (local)
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [pinnedIndex, setPinnedIndex] = useState(0);
  useEffect(() => {
    setPinnedIds(loadPinnedMessages(channel.id));
    setPinnedIndex(0);
  }, [channel.id]);

  // Task 2.1 — in-chat search
  const [searchOpen, setSearchOpen] = useState(false);
  const [msgQuery, setMsgQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const bubbleRefs = useRef<Record<string, HTMLLIElement | null>>({});
  // Task 2.2 — media attachments
  const [pending, setPending] = useState<WansaAttachment | null>(null);
  const [lightbox, setLightbox] = useState<WansaAttachment | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  // Task 2.3 — channel / profile info panel
  const [infoOpen, setInfoOpen] = useState(false);
  // Task 2.4 — forward a message to another channel
  const [forwardFor, setForwardFor] = useState<ApiMessage | null>(null);
  const [forwarding, setForwarding] = useState<string | null>(null);
  const [forwardDone, setForwardDone] = useState<string | null>(null);

  // Task 3.5 — privacy (local, per-device)
  const { privacy, update: updatePrivacy, toggleBlocked } = useWansaPrivacy();
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pinDraft, setPinDraft] = useState("");
  const [pinError, setPinError] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setUnlocked(false);
    setPinDraft("");
  }, [channel.id]);

  // Task 3.1 — polls
  const [pollOpen, setPollOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollSending, setPollSending] = useState(false);

  async function handleForward(msg: ApiMessage, target: WansaChannel) {
    if (forwarding) return;
    setForwarding(target.id);
    try {
      const res = await sendMessage({
        channel: target.id,
        content: msg.content,
        attachment: msg.attachment,
      });
      if (target.id === channel.id) {
        setMessages((prev) => [...prev, res.message]);
        requestAnimationFrame(() => scrollToBottom(true));
      }
      setForwardDone(target.id);
      window.setTimeout(() => {
        setForwardDone(null);
        setForwardFor(null);
      }, 900);
    } catch (e: unknown) {
      setError((e as Error)?.message || "تعذّر إعادة التوجيه");
      setForwardFor(null);
    } finally {
      setForwarding(null);
    }
  }

  const meId = useMemo(() => currentUserId(), []);
  const authed = !!meId;

  // Task 3.3 — badges & levels (derived from loaded messages, no backend)
  const stats = useMemo(() => computeStats(messages), [messages]);

  const listRef = useRef<HTMLDivElement | null>(null);
  const scrollToBottom = useCallback((smooth = true) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Load + poll messages for the active channel.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setMessages([]);
    setReplyTo(null);

    async function load(initial: boolean) {
      try {
        const res = await listMessages(channel.id, { limit: 50 });
        if (!alive) return;
        setMessages(res.messages);
        setError(null);
        if (initial) requestAnimationFrame(() => scrollToBottom(false));
      } catch (e: unknown) {
        if (!alive) return;
        setError((e as Error)?.message || "تعذّر تحميل الرسائل");
      } finally {
        if (alive && initial) setLoading(false);
      }
    }

    load(true);
    const iv = authed ? window.setInterval(() => load(false), 5000) : null;
    return () => {
      alive = false;
      if (iv) window.clearInterval(iv);
    };
  }, [channel.id, authed, scrollToBottom]);

  const messageById = useMemo(() => {
    const m = new Map<string, ApiMessage>();
    for (const msg of messages) m.set(msg.id, msg);
    return m;
  }, [messages]);

  // --- In-chat search: matching message ids (newest last) ---
  const matches = useMemo(() => {
    const q = msgQuery.trim().toLowerCase();
    if (!q) return [] as string[];
    return messages
      .filter((m) => !m.isDeleted && m.content.toLowerCase().includes(q))
      .map((m) => m.id);
  }, [messages, msgQuery]);

  // Jump to the newest match whenever the query changes.
  useEffect(() => {
    setMatchIndex(matches.length ? matches.length - 1 : 0);
  }, [msgQuery, matches.length]);

  // Scroll the active match into view.
  useEffect(() => {
    if (!searchOpen || matches.length === 0) return;
    const id = matches[Math.min(matchIndex, matches.length - 1)];
    bubbleRefs.current[id]?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [searchOpen, matchIndex, matches]);

  const activeMatchId = matches.length ? matches[Math.min(matchIndex, matches.length - 1)] : null;

  function closeSearch() {
    setSearchOpen(false);
    setMsgQuery("");
    setMatchIndex(0);
  }

  // Local "typing…" indicator: shows while the user is actively composing.
  useEffect(() => {
    if (!draft.trim()) {
      setTyping(false);
      return;
    }
    setTyping(true);
    const t = window.setTimeout(() => setTyping(false), 2500);
    return () => window.clearTimeout(t);
  }, [draft]);

  /** Task 3.4 — ask the AI bot and append its reply to the thread. */
  async function runBot(rawText: string, replyToId: string | null) {
    const prompt = stripBotMention(rawText) || "مرحباً";
    setBotThinking(true);
    try {
      const res = await askBot({
        channel: channel.id,
        prompt,
        replyTo: replyToId,
      });
      setMessages((prev) => [...prev, res.message]);
      requestAnimationFrame(() => scrollToBottom(true));
    } catch (e: unknown) {
      setError((e as Error)?.message || "تعذّر الوصول إلى البوت");
    } finally {
      setBotThinking(false);
    }
  }

  async function handleSend() {
    const text = draft.trim();
    if ((!text && !pending) || sending || !authed) return;
    setSending(true);
    try {
      if (editingId) {
        const res = await editMessage(editingId, text);
        setMessages((prev) => prev.map((m) => (m.id === editingId ? res.message : m)));
        setEditingId(null);
      } else {
        const res = await sendMessage({
          channel: channel.id,
          content: text,
          replyTo: replyTo?.id ?? null,
          attachment: pending,
        });
        setMessages((prev) => [...prev, res.message]);
        requestAnimationFrame(() => scrollToBottom(true));
        // Task 3.4 — if the message calls the bot, fetch its reply.
        if (mentionsBot(text)) runBot(text, res.message.id);
      }
      setDraft("");
      setReplyTo(null);
      setPending(null);
    } catch (e: unknown) {
      setError((e as Error)?.message || "تعذّر إرسال الرسالة");
    } finally {
      setSending(false);
      setTyping(false);
    }
  }

  async function handlePickFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError("حجم الملف كبير — الحد الأقصى 1.5 ميجابايت");
      return;
    }
    try {
      setPending(await fileToAttachment(file));
      setError(null);
    } catch (e: unknown) {
      setError((e as Error)?.message || "تعذّر قراءة الملف");
    }
  }

  async function handleReact(m: ApiMessage, emoji: string) {
    setMenuFor(null);
    if (!authed) return;
    try {
      const res = await toggleReaction(m.id, emoji);
      setMessages((prev) => prev.map((x) => (x.id === m.id ? res.message : x)));
    } catch (e: unknown) {
      setError((e as Error)?.message || "تعذّر إضافة التفاعل");
    }
  }

  /** Task 3.1 — single-choice vote: clear the old pick, then toggle the new one. */
  async function handleVote(m: ApiMessage, index: number, myVote: number | null) {
    if (!authed) return;
    try {
      let latest = m;
      if (myVote !== null && myVote !== index) {
        latest = (await toggleReaction(m.id, voteToken(myVote))).message;
      }
      const res = await toggleReaction(latest.id, voteToken(index));
      setMessages((prev) => prev.map((x) => (x.id === m.id ? res.message : x)));
    } catch (e: unknown) {
      setError((e as Error)?.message || "تعذّر تسجيل صوتك");
    }
  }

  async function handleCreatePoll() {
    const question = pollQuestion.trim();
    const options = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!question || options.length < 2 || pollSending || !authed) return;
    setPollSending(true);
    try {
      const res = await sendMessage({
        channel: channel.id,
        content: encodePoll({ question, options }),
        replyTo: null,
      });
      setMessages((prev) => [...prev, res.message]);
      setPollOpen(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
      requestAnimationFrame(() => scrollToBottom(true));
    } catch (e: unknown) {
      setError((e as Error)?.message || "تعذّر إنشاء الاستطلاع");
    } finally {
      setPollSending(false);
    }
  }

  async function handleDelete(m: ApiMessage) {
    setMenuFor(null);
    try {
      await deleteMessage(m.id);
      setMessages((prev) =>
        prev.map((x) => (x.id === m.id ? { ...x, isDeleted: true, content: "" } : x)),
      );
    } catch (e: unknown) {
      setError((e as Error)?.message || "تعذّر حذف الرسالة");
    }
  }

  async function handleCopy(m: ApiMessage) {
    try {
      await navigator.clipboard.writeText(m.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
    setMenuFor(null);
  }

  function startEdit(m: ApiMessage) {
    setMenuFor(null);
    setEditingId(m.id);
    setReplyTo(null);
    setDraft(m.content);
  }

  /* Task 2.5 — pin / unpin a message (stored per-device) */
  function handleTogglePin(m: ApiMessage) {
    setPinnedIds(togglePinnedMessage(channel.id, m.id));
    setPinnedIndex(0);
    setMenuFor(null);
  }

  function jumpToMessage(id: string) {
    const el = bubbleRefs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /** Pinned messages present in the loaded window, newest pin first. */
  const pinnedList = useMemo(
    () =>
      pinnedIds
        .map((id) => messages.find((m) => m.id === id && !m.isDeleted))
        .filter(Boolean) as ApiMessage[],
    [pinnedIds, messages],
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") {
      setEditingId(null);
      setDraft("");
    }
  }

  return (
    <div className="relative flex h-full flex-col bg-[#0a0a12]">
      {/* Task 3.2 — theme picker */}
      {/* Task 3.5 — privacy settings (bottom sheet) */}
      {privacyOpen && (
        <div
          className="absolute inset-0 z-40 flex items-end bg-black/60"
          onClick={() => setPrivacyOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80%] w-full overflow-y-auto rounded-t-2xl border-t border-white/10 bg-[#12121e] p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Shield className="h-4 w-4 text-emerald-400" /> الخصوصية والأمان
              </h3>
              <button
                onClick={() => setPrivacyOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-white/5"
                aria-label="close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <PrivacyToggle
                icon={<EyeOff className="h-4 w-4" />}
                label="تمويه الوسائط"
                hint="اضغط على الصورة لكشفها"
                checked={privacy.blurMedia}
                onChange={(v) => updatePrivacy({ blurMedia: v })}
              />
              <PrivacyToggle
                icon={<Eye className="h-4 w-4" />}
                label="الوضع المتخفي"
                hint="إخفاء مؤشر الكتابة وآخر ظهور"
                checked={privacy.incognito}
                onChange={(v) => updatePrivacy({ incognito: v })}
              />
              <PrivacyToggle
                icon={<MessageCircle className="h-4 w-4" />}
                label="إخفاء معاينة الرسائل"
                hint="في قائمة المحادثات"
                checked={privacy.hidePreviews}
                onChange={(v) => updatePrivacy({ hidePreviews: v })}
              />
              <PrivacyToggle
                icon={<Lock className="h-4 w-4" />}
                label="قفل المحادثة برمز"
                hint="رمز محلي على هذا الجهاز فقط"
                checked={privacy.lockEnabled}
                onChange={(v) => {
                  if (v && privacy.pin.length < 4) return;
                  updatePrivacy({ lockEnabled: v });
                  if (v) setUnlocked(true);
                }}
              />
              <div className="flex items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-2.5">
                <span className="text-[11px] text-slate-400">الرمز</span>
                <input
                  value={privacy.pin}
                  onChange={(e) =>
                    updatePrivacy({ pin: e.target.value.replace(/\D/g, "").slice(0, 8) })
                  }
                  inputMode="numeric"
                  placeholder="4-8 أرقام"
                  className="w-24 rounded-lg bg-[#1a1a2e] px-2 py-1 text-center text-xs tracking-widest text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            {privacy.blocked.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-2 text-[11px] font-semibold text-slate-400">
                  المستخدمون المحظورون
                </h4>
                <div className="flex flex-col gap-1">
                  {privacy.blocked.map((u) => (
                    <div
                      key={u}
                      className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-slate-200"
                    >
                      <span className="truncate">{u}</span>
                      <button
                        onClick={() => toggleBlocked(u)}
                        className="rounded-full px-2 py-1 text-[11px] text-emerald-300 hover:bg-white/5"
                      >
                        إلغاء الحظر
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-4 text-[10px] leading-relaxed text-slate-500">
              كل الإعدادات محفوظة محلياً على جهازك فقط، بدون أي خادم خارجي.
            </p>
          </div>
        </div>
      )}

      {/* Task 3.5 — chat lock screen */}
      {privacy.lockEnabled && privacy.pin.length >= 4 && !unlocked && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-[#0a0a12]/95 px-6">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-600/20 text-emerald-300">
            <Lock className="h-6 w-6" />
          </div>
          <p className="text-sm text-slate-300">هذه المحادثة مقفلة</p>
          <input
            autoFocus
            value={pinDraft}
            inputMode="numeric"
            onChange={(e) => {
              setPinError(false);
              setPinDraft(e.target.value.replace(/\D/g, "").slice(0, 8));
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              if (pinDraft === privacy.pin) setUnlocked(true);
              else setPinError(true);
            }}
            className="w-40 rounded-xl bg-[#1a1a2e] px-3 py-2 text-center text-lg tracking-[0.4em] text-slate-100 focus:outline-none"
            placeholder="••••"
            type="password"
          />
          {pinError && <p className="text-[11px] text-rose-400">رمز غير صحيح</p>}
          <button
            onClick={() => (pinDraft === privacy.pin ? setUnlocked(true) : setPinError(true))}
            className="rounded-full bg-emerald-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"
          >
            فتح
          </button>
          <button onClick={onBack} className="text-[11px] text-slate-500 hover:text-slate-300">
            رجوع
          </button>
        </div>
      )}

      {themeOpen && (
        <div
          className="absolute inset-0 z-40 flex items-end bg-black/60"
          onClick={() => setThemeOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-t-2xl border-t border-white/10 bg-[#12121e] p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">ثيم المحادثة</h3>
              <button
                onClick={() => setThemeOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-white/5"
                aria-label="close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {WANSA_THEMES.map((th) => (
                <button
                  key={th.id}
                  onClick={() => {
                    setTheme(th.id);
                    setThemeOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border p-2.5 text-start transition",
                    themeId === th.id
                      ? "border-white/40 bg-white/10"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/10",
                  )}
                >
                  <span className="flex shrink-0 -space-x-1 rtl:space-x-reverse">
                    {th.swatch.map((c) => (
                      <span
                        key={c}
                        className="h-5 w-5 rounded-full border border-black/40"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-200">{th.name}</span>
                  {themeId === th.id && <Check className="h-4 w-4 text-slate-100" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 border-b border-white/5 bg-[#12121e] px-2 py-2">
        <button
          onClick={onBack}
          className="rounded-full p-2 text-slate-300 transition hover:bg-white/5"
          aria-label="back"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </button>
        <button
          onClick={() => setInfoOpen(true)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-start transition hover:bg-white/5"
          aria-label="channel info"
          title="معلومات المحادثة"
        >
          <div
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-white",
              channel.kind === "group"
                ? "bg-gradient-to-br from-indigo-500 to-fuchsia-600"
                : "bg-gradient-to-br from-emerald-500 to-cyan-600",
            )}
          >
            {channel.kind === "group" ? <Users className="h-4 w-4" /> : channel.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-100">{channel.name}</div>
            <div className="truncate text-[11px] text-emerald-400">
              {typing && !privacy.incognito
                ? "يكتب الآن..."
                : (channel.topic ?? (channel.online ? "متصل الآن" : "آخر ظهور اليوم"))}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-0.5 text-slate-400">
          <button
            onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
            className={cn(
              "rounded-full p-2 transition hover:bg-white/5",
              searchOpen && "bg-white/10 text-emerald-300",
            )}
            aria-label="search messages"
            title="بحث في المحادثة"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPrivacyOpen(true)}
            className={cn(
              "rounded-full p-2 transition hover:bg-white/5",
              (privacy.incognito || privacy.lockEnabled || privacy.blurMedia) && "text-emerald-300",
            )}
            aria-label="privacy"
            title="الخصوصية"
          >
            <Shield className="h-4 w-4" />
          </button>
          <button
            onClick={() => setThemeOpen(true)}
            className="rounded-full p-2 transition hover:bg-white/5"
            aria-label="theme"
            title="ثيم المحادثة"
          >
            <Palette className="h-4 w-4" />
          </button>
          <button className="rounded-full p-2 transition hover:bg-white/5" aria-label="video">
            <Video className="h-4 w-4" />
          </button>
          <button className="rounded-full p-2 transition hover:bg-white/5" aria-label="call">
            <Phone className="h-4 w-4" />
          </button>
          <button
            onClick={() => setInfoOpen(true)}
            className="rounded-full p-2 transition hover:bg-white/5"
            aria-label="more"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* In-chat search bar */}
      {searchOpen && (
        <div className="flex items-center gap-2 border-b border-white/5 bg-[#12121e] px-3 py-2">
          <div className="flex flex-1 items-center gap-2 rounded-full bg-[#1a1a2e] px-3 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            <input
              autoFocus
              value={msgQuery}
              onChange={(e) => setMsgQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") closeSearch();
                if (e.key === "Enter" && matches.length)
                  setMatchIndex((i) => (i - 1 + matches.length) % matches.length);
              }}
              className="w-full bg-transparent text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
              placeholder="ابحث داخل المحادثة..."
            />
          </div>
          <span className="shrink-0 text-[11px] tabular-nums text-slate-400">
            {msgQuery.trim()
              ? matches.length
                ? `${Math.min(matchIndex, matches.length - 1) + 1}/${matches.length}`
                : "0"
              : ""}
          </span>
          <button
            onClick={() =>
              matches.length && setMatchIndex((i) => (i - 1 + matches.length) % matches.length)
            }
            disabled={matches.length === 0}
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-white/5 disabled:opacity-30"
            aria-label="previous match"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            onClick={() => matches.length && setMatchIndex((i) => (i + 1) % matches.length)}
            disabled={matches.length === 0}
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-white/5 disabled:opacity-30"
            aria-label="next match"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            onClick={closeSearch}
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-white/5"
            aria-label="close search"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Task 2.5 — pinned messages banner */}
      {pinnedList.length > 0 && (
        <div className="flex items-center gap-2 border-b border-white/5 bg-[#141426] px-3 py-2">
          <Pin className="h-3.5 w-3.5 shrink-0 fill-current text-emerald-400" />
          <button
            onClick={() => {
              const next = (pinnedIndex + 1) % pinnedList.length;
              setPinnedIndex(pinnedList.length > 1 ? next : 0);
              jumpToMessage(pinnedList[Math.min(pinnedIndex, pinnedList.length - 1)].id);
            }}
            className="min-w-0 flex-1 text-start"
          >
            <div className="text-[10px] text-emerald-400">
              رسالة مثبّتة
              {pinnedList.length > 1
                ? ` ${Math.min(pinnedIndex, pinnedList.length - 1) + 1}/${pinnedList.length}`
                : ""}
            </div>
            <div className="truncate text-xs text-slate-300">
              {pinnedList[Math.min(pinnedIndex, pinnedList.length - 1)].content ||
                pinnedList[Math.min(pinnedIndex, pinnedList.length - 1)].attachment?.name ||
                "مرفق"}
            </div>
          </button>
          <button
            onClick={() =>
              handleTogglePin(pinnedList[Math.min(pinnedIndex, pinnedList.length - 1)])
            }
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-white/5"
            aria-label="unpin"
            title="إلغاء التثبيت"
          >
            <PinOff className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Messages area */}
      <div ref={listRef} className="wansa-wallpaper flex-1 overflow-y-auto px-3 py-4">
        {loading ? (
          <div className="flex h-full items-center justify-center text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error && messages.length === 0 ? (
          <ErrorState message={error} />
        ) : messages.length === 0 ? (
          <EmptyMessages channelName={channel.name} />
        ) : (
          <>
            <div className="mx-auto mb-3 w-fit rounded-full bg-white/5 px-3 py-1 text-[10px] text-slate-400">
              اليوم
            </div>
            <ul className="flex flex-col gap-2">
              {messages
                .filter((m) => !isBlocked(privacy, m.author.username))
                .map((m) => {
                  const mine = !!meId && m.author.id === meId;
                  const parent = m.replyTo ? messageById.get(m.replyTo) : null;
                  const grouped = groupReactions(m, meId);
                  const poll = m.isDeleted ? null : parsePoll(m.content);
                  const isMatch = searchOpen && matches.includes(m.id);
                  const isActiveMatch = m.id === activeMatchId;
                  return (
                    <li
                      key={m.id}
                      ref={(el) => {
                        bubbleRefs.current[m.id] = el;
                      }}
                      className={cn("flex w-full", mine ? "justify-end" : "justify-start")}
                    >
                      <div
                        onContextMenu={(e) => {
                          if (m.isDeleted || !authed) return;
                          e.preventDefault();
                          setMenuFor(m);
                        }}
                        className={cn(
                          "group relative max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm transition",
                          mine
                            ? "rounded-br-sm bg-emerald-600 text-white"
                            : "rounded-bl-sm bg-[#1a1a2e] text-slate-100",
                          isMatch && !isActiveMatch && "ring-1 ring-amber-300/40",
                          isActiveMatch && "ring-2 ring-amber-300",
                        )}
                      >
                        {!mine && (
                          <div className="mb-0.5 text-[10px] font-semibold text-fuchsia-300">
                            {m.author.username ?? "مجهول"}
                            <BadgeChip s={stats.get(m.author.id)} />
                          </div>
                        )}
                        {parent && (
                          <div
                            className={cn(
                              "mb-1 truncate rounded-md border-s-2 px-2 py-1 text-[11px]",
                              mine
                                ? "border-emerald-200/70 bg-emerald-500/30 text-emerald-50"
                                : "border-fuchsia-400/70 bg-white/5 text-slate-300",
                            )}
                          >
                            <span className="font-semibold">
                              {parent.author.username ?? "مجهول"}:
                            </span>{" "}
                            {parent.isDeleted ? "رسالة محذوفة" : parent.content}
                          </div>
                        )}
                        {m.attachment && (
                          <div className="mb-1">
                            {m.attachment.kind === "image" ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (privacy.blurMedia && !revealed[m.id]) {
                                    setRevealed((r) => ({ ...r, [m.id]: true }));
                                    return;
                                  }
                                  setLightbox(m.attachment!);
                                }}
                                className="relative block overflow-hidden rounded-lg"
                              >
                                <img
                                  src={m.attachment.url}
                                  alt={m.attachment.name || "صورة"}
                                  loading="lazy"
                                  className={cn(
                                    "max-h-64 w-full max-w-[16rem] object-cover transition",
                                    privacy.blurMedia && !revealed[m.id] && "blur-xl",
                                  )}
                                />
                                {privacy.blurMedia && !revealed[m.id] && (
                                  <span className="absolute inset-0 grid place-items-center bg-black/30 text-[10px] text-white">
                                    <Eye className="h-4 w-4" />
                                  </span>
                                )}
                              </button>
                            ) : (
                              <a
                                href={m.attachment.url}
                                download={m.attachment.name}
                                className={cn(
                                  "flex items-center gap-2 rounded-lg px-2 py-2 text-[11px] transition",
                                  mine
                                    ? "bg-emerald-700/60 hover:bg-emerald-700"
                                    : "bg-black/25 hover:bg-black/35",
                                )}
                              >
                                <FileText className="h-4 w-4 shrink-0" />
                                <span className="min-w-0 flex-1 truncate">{m.attachment.name}</span>
                                <span className="shrink-0 opacity-70">
                                  {formatBytes(m.attachment.size)}
                                </span>
                                <Download className="h-3.5 w-3.5 shrink-0 opacity-80" />
                              </a>
                            )}
                          </div>
                        )}
                        {poll ? (
                          <PollCard
                            poll={poll}
                            message={m}
                            meId={meId}
                            mine={mine}
                            disabled={!authed}
                            onVote={handleVote}
                          />
                        ) : m.content || m.isDeleted ? (
                          <p className="whitespace-pre-wrap break-words leading-relaxed">
                            {m.isDeleted ? (
                              <span className="italic opacity-70">رسالة محذوفة</span>
                            ) : (
                              <MatchText text={m.content} query={searchOpen ? msgQuery : ""} />
                            )}
                          </p>
                        ) : null}

                        {grouped.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {grouped.map((g) => (
                              <button
                                key={g.emoji}
                                type="button"
                                onClick={() => handleReact(m, g.emoji)}
                                className={cn(
                                  "flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] transition",
                                  g.mine
                                    ? "bg-white/25 ring-1 ring-white/40"
                                    : "bg-black/25 hover:bg-black/35",
                                )}
                              >
                                <span>{g.emoji}</span>
                                <span className="text-[10px] opacity-80">{g.count}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="mt-1 flex items-center justify-end gap-2">
                          {!m.isDeleted && authed && (
                            <>
                              <button
                                type="button"
                                onClick={() => setReplyTo(m)}
                                className={cn(
                                  "opacity-60 transition group-hover:opacity-100",
                                  mine ? "text-emerald-100/90" : "text-slate-400",
                                )}
                                aria-label="reply"
                                title="رد"
                              >
                                <Reply className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setMenuFor(m)}
                                className={cn(
                                  "opacity-60 transition group-hover:opacity-100",
                                  mine ? "text-emerald-100/90" : "text-slate-400",
                                )}
                                aria-label="message menu"
                                title="خيارات"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                          <span
                            className={cn(
                              "text-[10px]",
                              mine ? "text-emerald-100/80" : "text-slate-500",
                            )}
                          >
                            {formatTime(m.createdAt)}
                          </span>
                          {pinnedIds.includes(m.id) && (
                            <Pin
                              className={cn(
                                "h-3 w-3 fill-current",
                                mine ? "text-emerald-100/80" : "text-emerald-400",
                              )}
                            />
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
            </ul>
            {typing && (
              <div className="mt-2 flex justify-end">
                <div className="flex items-center gap-1 rounded-2xl bg-[#1a1a2e] px-3 py-2">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
                </div>
              </div>
            )}
            {/* Task 3.4 — bot is composing */}
            {botThinking && (
              <div className="mt-2 flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-[#1a1a2e] px-3 py-2 text-xs text-emerald-400">
                  <Bot className="h-4 w-4 animate-pulse" />
                  <span>سامَا بوت يكتب…</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Auth / error banner */}
      {!authed && (
        <div className="flex items-center gap-2 border-t border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>سجّل دخولك لإرسال ومتابعة الرسائل مباشرة.</span>
        </div>
      )}
      {authed && error && messages.length > 0 && (
        <div className="flex items-center gap-2 border-t border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 border-t border-white/5 bg-[#12121e] px-3 py-2">
          <div className="min-w-0 flex-1 rounded-md border-s-2 border-emerald-400/70 bg-white/5 px-2 py-1">
            <div className="text-[10px] font-semibold text-emerald-300">
              رد على {replyTo.author.username ?? "مجهول"}
            </div>
            <div className="truncate text-[11px] text-slate-300">
              {replyTo.isDeleted ? "رسالة محذوفة" : replyTo.content}
            </div>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-white/5"
            aria-label="cancel reply"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Edit banner */}
      {editingId && (
        <div className="flex items-center gap-2 border-t border-white/5 bg-[#12121e] px-3 py-2">
          <Pencil className="h-3.5 w-3.5 shrink-0 text-amber-300" />
          <span className="flex-1 text-[11px] text-amber-200">تعديل الرسالة</span>
          <button
            onClick={() => {
              setEditingId(null);
              setDraft("");
            }}
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-white/5"
            aria-label="cancel edit"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Pending attachment preview */}
      {pending && (
        <div className="flex items-center gap-2 border-t border-white/5 bg-[#12121e] px-3 py-2">
          {pending.kind === "image" ? (
            <img
              src={pending.url}
              alt={pending.name}
              className="h-12 w-12 rounded-md object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#1a1a2e]">
              <FileText className="h-5 w-5 text-slate-400" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] text-slate-200">{pending.name}</div>
            <div className="text-[10px] text-slate-500">{formatBytes(pending.size)}</div>
          </div>
          <button
            onClick={() => setPending(null)}
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-white/5"
            aria-label="remove attachment"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Image lightbox */}
      {lightbox && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox.url}
            alt={lightbox.name}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute end-3 top-3 rounded-full bg-white/10 p-2 text-white"
            aria-label="close image"
          >
            <X className="h-5 w-5" />
          </button>
          <a
            href={lightbox.url}
            download={lightbox.name}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-4 flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs text-white"
          >
            <Download className="h-4 w-4" /> تنزيل
          </a>
        </div>
      )}

      {/* Composer */}
      <div className="flex items-center gap-2 border-t border-white/5 bg-[#12121e] px-2 py-2">
        <button
          className="rounded-full p-2 text-slate-400 transition hover:bg-white/5 disabled:opacity-40"
          aria-label="emoji"
          disabled
        >
          <Smile className="h-5 w-5" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf,.txt,.zip,.doc,.docx"
          className="hidden"
          onChange={(e) => {
            handlePickFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-full p-2 text-slate-400 transition hover:bg-white/5 disabled:opacity-40"
          aria-label="attach"
          title="إرفاق صورة أو ملف"
          disabled={!authed || sending}
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <button
          onClick={() => setPollOpen(true)}
          className="rounded-full p-2 text-slate-400 transition hover:bg-white/5 disabled:opacity-40"
          aria-label="poll"
          title="إنشاء استطلاع"
          disabled={!authed || sending}
        >
          <BarChart3 className="h-5 w-5" />
        </button>
        {/* Task 3.4 — call the AI bot */}
        <button
          onClick={() => setDraft((d) => (mentionsBot(d) ? d : `@bot ${d}`.trimEnd() + " "))}
          className={cn(
            "rounded-full p-2 transition hover:bg-white/5 disabled:opacity-40",
            mentionsBot(draft) ? "text-emerald-400" : "text-slate-400",
          )}
          aria-label="bot"
          title="اسأل سامَا بوت (@bot)"
          disabled={!authed || sending || botThinking}
        >
          <Bot className="h-5 w-5" />
        </button>
        <div className="flex flex-1 items-center rounded-full bg-[#1a1a2e] px-3 py-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={!authed || sending}
            className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none disabled:cursor-not-allowed"
            placeholder={
              !authed ? "سجّل الدخول أولاً..." : editingId ? "عدّل رسالتك..." : "اكتب رسالة..."
            }
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!authed || sending || (!draft.trim() && !pending)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="send"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : editingId ? (
            <Check className="h-4 w-4" />
          ) : (
            <Send className="h-4 w-4 rtl:-scale-x-100" />
          )}
        </button>
      </div>

      {/* Task 3.1 — poll composer (bottom sheet) */}
      {pollOpen && (
        <div
          className="absolute inset-0 z-40 flex items-end bg-black/60"
          onClick={() => setPollOpen(false)}
        >
          <div
            className="max-h-[85%] w-full overflow-y-auto rounded-t-2xl border-t border-white/10 bg-[#12121e] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <BarChart3 className="h-4 w-4 text-emerald-400" /> استطلاع جديد
              </h3>
              <button
                onClick={() => setPollOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-white/5"
                aria-label="close poll"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <input
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              placeholder="اكتب سؤال الاستطلاع..."
              className="mb-3 w-full rounded-xl bg-[#1a1a2e] px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
            />

            <div className="flex flex-col gap-2">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-center text-[11px] text-slate-500">
                    {i + 1}
                  </span>
                  <input
                    value={opt}
                    onChange={(e) =>
                      setPollOptions((prev) =>
                        prev.map((x, idx) => (idx === i ? e.target.value : x)),
                      )
                    }
                    placeholder={`الخيار ${i + 1}`}
                    className="min-w-0 flex-1 rounded-xl bg-[#1a1a2e] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      onClick={() => setPollOptions((prev) => prev.filter((_, idx) => idx !== i))}
                      className="rounded-full p-1.5 text-slate-500 hover:bg-white/5 hover:text-rose-400"
                      aria-label="remove option"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {pollOptions.length < MAX_POLL_OPTIONS && (
              <button
                onClick={() => setPollOptions((prev) => [...prev, ""])}
                className="mt-2 flex items-center gap-1.5 rounded-full px-2 py-1.5 text-xs text-emerald-400 transition hover:bg-white/5"
              >
                <Plus className="h-3.5 w-3.5" /> إضافة خيار
              </button>
            )}

            <button
              onClick={handleCreatePoll}
              disabled={
                pollSending ||
                !pollQuestion.trim() ||
                pollOptions.filter((o) => o.trim()).length < 2
              }
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pollSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4 rtl:-scale-x-100" />
              )}
              نشر الاستطلاع
            </button>
          </div>
        </div>
      )}

      {/* Message context menu (bottom sheet) */}
      {menuFor && (
        <div
          className="absolute inset-0 z-40 flex items-end bg-black/60"
          onClick={() => setMenuFor(null)}
        >
          <div
            className="w-full rounded-t-2xl border-t border-white/10 bg-[#12121e] p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex justify-center gap-2">
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReact(menuFor, emoji)}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-lg transition hover:scale-110 hover:bg-white/10"
                  aria-label={`react ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="flex flex-col text-sm text-slate-200">
              <MenuItem
                icon={<Reply className="h-4 w-4" />}
                label="رد"
                onClick={() => {
                  setReplyTo(menuFor);
                  setMenuFor(null);
                }}
              />
              <MenuItem
                icon={
                  copied ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )
                }
                label={copied ? "تم النسخ" : "نسخ النص"}
                onClick={() => handleCopy(menuFor)}
              />
              <MenuItem
                icon={<Forward className="h-4 w-4 rtl:-scale-x-100" />}
                label="إعادة توجيه"
                onClick={() => {
                  setForwardFor(menuFor);
                  setMenuFor(null);
                }}
              />
              <MenuItem
                icon={
                  pinnedIds.includes(menuFor.id) ? (
                    <PinOff className="h-4 w-4" />
                  ) : (
                    <Pin className="h-4 w-4" />
                  )
                }
                label={pinnedIds.includes(menuFor.id) ? "إلغاء التثبيت" : "تثبيت الرسالة"}
                onClick={() => handleTogglePin(menuFor)}
              />

              {meId !== menuFor.author.id && menuFor.author.username && (
                <MenuItem
                  icon={<Ban className="h-4 w-4" />}
                  label={`حظر ${menuFor.author.username}`}
                  onClick={() => {
                    toggleBlocked(menuFor.author.username!);
                    setMenuFor(null);
                  }}
                />
              )}
              {meId === menuFor.author.id && (
                <MenuItem
                  icon={<Pencil className="h-4 w-4" />}
                  label="تعديل"
                  onClick={() => startEdit(menuFor)}
                />
              )}
              {meId === menuFor.author.id && (
                <MenuItem
                  icon={<Trash2 className="h-4 w-4" />}
                  label="حذف"
                  danger
                  onClick={() => handleDelete(menuFor)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Task 2.3 — channel / profile info panel */}
      {infoOpen && (
        <InfoPanel
          channel={channel}
          messages={messages}
          meId={meId}
          onClose={() => setInfoOpen(false)}
          onOpenImage={(a) => {
            setInfoOpen(false);
            setLightbox(a);
          }}
        />
      )}

      {/* Task 2.4 — forward picker */}
      {forwardFor && (
        <div
          className="absolute inset-0 z-50 flex items-end bg-black/60"
          onClick={() => !forwarding && setForwardFor(null)}
        >
          <div
            className="max-h-[75%] w-full overflow-y-auto rounded-t-2xl border-t border-white/10 bg-[#12121e] p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">إعادة توجيه إلى…</h3>
              <button
                onClick={() => !forwarding && setForwardFor(null)}
                className="rounded-full p-1.5 text-slate-400 transition hover:bg-white/5"
                aria-label="close forward"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-3 rounded-lg border border-white/10 bg-white/5 p-2 text-xs text-slate-300">
              <span className="text-emerald-400">{forwardFor.author.username ?? "مجهول"}:</span>{" "}
              <span className="line-clamp-2 align-middle">
                {forwardFor.content || (forwardFor.attachment ? forwardFor.attachment.name : "")}
              </span>
            </div>

            <ul className="flex flex-col">
              {WANSA_CHANNELS.map((c) => (
                <li key={c.id}>
                  <button
                    disabled={!!forwarding}
                    onClick={() => handleForward(forwardFor, c)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-start transition hover:bg-white/5 disabled:opacity-60"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-sm">
                      {c.kind === "dm" ? (
                        <MessageCircle className="h-4 w-4" />
                      ) : (
                        <Hash className="h-4 w-4" />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-slate-100">
                        {c.name}
                        {c.id === channel.id ? " (هنا)" : ""}
                      </span>
                      <span className="block truncate text-xs text-slate-400">{c.topic ?? ""}</span>
                    </span>
                    {forwarding === c.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-300" />
                    ) : forwardDone === c.id ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------- Task 2.3 — info / profile panel ------------------------ */

function InfoPanel({
  channel,
  messages,
  meId,
  onClose,
  onOpenImage,
}: {
  channel: WansaChannel;
  messages: ApiMessage[];
  meId: string | null;
  onClose: () => void;
  onOpenImage: (a: WansaAttachment) => void;
}) {
  const live = messages.filter((m) => !m.isDeleted);

  // Task 3.3 — badges & leaderboard
  const stats = useMemo(() => computeStats(messages), [messages]);
  const leaderboard = useMemo(
    () => [...stats.values()].sort((a, b) => b.xp - a.xp).slice(0, 10),
    [stats],
  );

  const members = useMemo(() => {
    const map = new Map<
      string,
      { id: string; username: string; avatarUrl: string; count: number; last: string }
    >();
    for (const m of live) {
      const id = m.author.id;
      const prev = map.get(id);
      map.set(id, {
        id,
        username: m.author.username || "عضو",
        avatarUrl: m.author.avatarUrl || "",
        count: (prev?.count ?? 0) + 1,
        last: m.createdAt,
      });
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [live]);

  const images = live
    .map((m) => m.attachment)
    .filter((a): a is WansaAttachment => !!a && a.kind === "image");
  const files = live
    .map((m) => m.attachment)
    .filter((a): a is WansaAttachment => !!a && a.kind !== "image");

  return (
    <div className="absolute inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-sm flex-col border-s border-white/10 bg-[#12121e] shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-white/5 px-3 py-3">
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-300 transition hover:bg-white/5"
            aria-label="close info"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-slate-100">معلومات المحادثة</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Header card */}
          <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
            <div
              className={cn(
                "grid h-20 w-20 place-items-center rounded-full text-2xl font-bold text-white",
                channel.kind === "group"
                  ? "bg-gradient-to-br from-indigo-500 to-fuchsia-600"
                  : "bg-gradient-to-br from-emerald-500 to-cyan-600",
              )}
            >
              {channel.kind === "group" ? <Users className="h-8 w-8" /> : channel.name.charAt(0)}
            </div>
            <h3 className="text-base font-semibold text-slate-100">{channel.name}</h3>
            {channel.topic && <p className="text-xs text-slate-400">{channel.topic}</p>}
            <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
              <Hash className="h-3 w-3" />
              <span>{channel.id}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 px-4">
            <Stat icon={<MessageCircle className="h-4 w-4" />} value={live.length} label="رسالة" />
            <Stat icon={<Users className="h-4 w-4" />} value={members.length} label="مشارك" />
            <Stat
              icon={<ImageIcon className="h-4 w-4" />}
              value={images.length + files.length}
              label="وسائط"
            />
          </div>

          {/* Media grid */}
          <Section title="الصور والوسائط" count={images.length}>
            {images.length === 0 ? (
              <p className="px-1 text-xs text-slate-500">لا توجد صور في هذه المحادثة بعد.</p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {images
                  .slice(-9)
                  .reverse()
                  .map((a, i) => (
                    <button
                      key={`${a.url.slice(-16)}-${i}`}
                      onClick={() => onOpenImage(a)}
                      className="aspect-square overflow-hidden rounded-lg bg-white/5"
                    >
                      <img src={a.url} alt={a.name} className="h-full w-full object-cover" />
                    </button>
                  ))}
              </div>
            )}
          </Section>

          {/* Files */}
          <Section title="الملفات" count={files.length}>
            {files.length === 0 ? (
              <p className="px-1 text-xs text-slate-500">لا توجد ملفات.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {files
                  .slice(-6)
                  .reverse()
                  .map((a, i) => (
                    <li key={`${a.name}-${i}`}>
                      <a
                        href={a.url}
                        download={a.name}
                        className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 transition hover:bg-white/10"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-slate-300" />
                        <span className="min-w-0 flex-1 truncate text-xs text-slate-200">
                          {a.name}
                        </span>
                        <span className="shrink-0 text-[10px] text-slate-500">
                          {formatBytes(a.size)}
                        </span>
                        <Download className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      </a>
                    </li>
                  ))}
              </ul>
            )}
          </Section>

          {/* Members */}
          <Section title="المشاركون" count={members.length}>
            {members.length === 0 ? (
              <p className="px-1 text-xs text-slate-500">لا مشاركين بعد.</p>
            ) : (
              <ul className="flex flex-col">
                {members.map((u) => (
                  <li key={u.id} className="flex items-center gap-3 rounded-lg px-1 py-2">
                    {u.avatarUrl ? (
                      <img
                        src={u.avatarUrl}
                        alt={u.username}
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-xs font-semibold text-white">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-slate-100">
                        {u.username}
                        <BadgeChip s={stats.get(u.id)} showName />
                        {u.id === meId && (
                          <span className="ms-1 text-[10px] text-emerald-400">(أنت)</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {u.count} رسالة • آخر نشاط {formatTime(u.last)}
                      </div>
                      {stats.get(u.id) && <LevelBar s={stats.get(u.id)!} />}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Task 3.3 — leaderboard */}
          <Section title="لوحة الصدارة" count={leaderboard.length}>
            {leaderboard.length === 0 ? (
              <p className="px-1 text-xs text-slate-500">لا نشاط بعد.</p>
            ) : (
              <ol className="flex flex-col gap-1">
                {leaderboard.map((s, i) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-2 py-2"
                  >
                    <span className="w-5 shrink-0 text-center text-xs font-bold text-slate-400">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-100">
                      {s.username}
                      <BadgeChip s={s} />
                    </span>
                    <span className="shrink-0 text-[11px] text-emerald-400">{s.xp} XP</span>
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <div className="flex items-start gap-2 px-4 pb-8 pt-2 text-[11px] leading-relaxed text-slate-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>الإحصائيات محسوبة من آخر 50 رسالة محمّلة في هذه القناة.</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-white/5 py-3">
      <span className="text-slate-400">{icon}</span>
      <span className="text-sm font-semibold tabular-nums text-slate-100">{value}</span>
      <span className="text-[10px] text-slate-500">{label}</span>
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 pt-5">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-300">{title}</h4>
        {typeof count === "number" && (
          <span className="text-[11px] tabular-nums text-slate-500">{count}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyMessages({ channelName }: { channelName: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-white/5 text-slate-400">
        <MessageCircle className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-slate-200">لا رسائل بعد في {channelName}</p>
      <p className="text-xs text-slate-500">كن أول من يبدأ الونسة هنا ✨</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-rose-500/10 text-rose-300">
        <AlertCircle className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-slate-200">تعذّر الاتصال بالخادم</p>
      <p className="text-xs text-slate-500">{message}</p>
    </div>
  );
}

/** Task 3.1 — poll bubble with live results (votes ride on message reactions). */
function PollCard({
  poll,
  message,
  meId,
  mine,
  disabled,
  onVote,
}: {
  poll: { question: string; options: string[] };
  message: ApiMessage;
  meId: string | null;
  mine: boolean;
  disabled: boolean;
  onVote: (m: ApiMessage, index: number, myVote: number | null) => void;
}) {
  const { counts, total, myVote } = tallyVotes(message.reactions ?? [], poll.options.length, meId);
  return (
    <div className="min-w-[14rem] max-w-[18rem]">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wide opacity-70">
        <BarChart3 className="h-3 w-3" /> استطلاع
      </div>
      <p className="mb-2 font-semibold leading-snug">{poll.question}</p>
      <div className="flex flex-col gap-1.5">
        {poll.options.map((opt, i) => {
          const pct = total ? Math.round((counts[i] / total) * 100) : 0;
          const picked = myVote === i;
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onVote(message, i, myVote)}
              className={cn(
                "relative overflow-hidden rounded-lg px-2.5 py-1.5 text-start text-xs transition disabled:cursor-not-allowed",
                mine ? "bg-emerald-700/50" : "bg-black/25",
                picked && "ring-1 ring-white/60",
              )}
            >
              <span
                className={cn(
                  "absolute inset-y-0 start-0 transition-all",
                  mine ? "bg-emerald-400/30" : "bg-fuchsia-400/20",
                )}
                style={{ width: `${pct}%` }}
              />
              <span className="relative flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate">
                  {picked ? "◉ " : "○ "}
                  {opt}
                </span>
                <span className="shrink-0 opacity-80">{pct}%</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 text-[10px] opacity-70">
        {total} صوت{total === 1 ? "" : "ًا"}
      </div>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-start transition hover:bg-white/5",
        danger ? "text-rose-300" : "text-slate-200",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/** Renders `text` with every case-insensitive occurrence of `query` highlighted. */
function MatchText({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  let i = 0;
  let k = 0;
  while (i < text.length) {
    const at = lower.indexOf(needle, i);
    if (at === -1) {
      parts.push(text.slice(i));
      break;
    }
    if (at > i) parts.push(text.slice(i, at));
    parts.push(
      <mark key={`h${k++}`} className="rounded bg-amber-300/80 px-0.5 text-[#0a0a12]">
        {text.slice(at, at + q.length)}
      </mark>,
    );
    i = at + q.length;
  }
  return <>{parts}</>;
}

/** Human-friendly file size. */
function formatBytes(n: number) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/* --------------------------- Task 3.5 — privacy toggle --------------------------- */

function PrivacyToggle({
  icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5 text-start transition hover:bg-white/[0.07]"
    >
      <span className="text-slate-300">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs text-slate-100">{label}</span>
        {hint && <span className="block truncate text-[10px] text-slate-500">{hint}</span>}
      </span>
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition",
          checked ? "bg-emerald-600" : "bg-white/15",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
            checked ? "start-4.5" : "start-0.5",
          )}
        />
      </span>
    </button>
  );
}
