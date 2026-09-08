/**
 * Task 3.3 — Badges & levels.
 * 100% client-side: levels are derived from the messages already loaded
 * (messages sent + reactions received). No backend, no vendor lock-in.
 */
import type { WansaMessage } from "@/lib/wansa-api";

export type WansaLevel = {
  /** 1-based level index */
  level: number;
  name: string;
  emoji: string;
  /** XP needed to reach this level */
  min: number;
  /** tailwind classes for the chip */
  chip: string;
};

export const WANSA_LEVELS: WansaLevel[] = [
  { level: 1, name: "مبتدئ", emoji: "🌱", min: 0, chip: "bg-slate-500/20 text-slate-300" },
  { level: 2, name: "ونّاس", emoji: "💬", min: 10, chip: "bg-sky-500/20 text-sky-300" },
  { level: 3, name: "أوتاكو", emoji: "🎌", min: 30, chip: "bg-emerald-500/20 text-emerald-300" },
  { level: 4, name: "سينباي", emoji: "⭐", min: 75, chip: "bg-amber-500/20 text-amber-300" },
  { level: 5, name: "شينوبي", emoji: "🥷", min: 150, chip: "bg-fuchsia-500/20 text-fuchsia-300" },
  { level: 6, name: "أسطورة", emoji: "👑", min: 300, chip: "bg-yellow-400/20 text-yellow-300" },
];

export type UserStats = {
  id: string;
  username: string;
  avatarUrl: string;
  messages: number;
  reactions: number;
  media: number;
  xp: number;
  level: WansaLevel;
  next: WansaLevel | null;
  /** 0..1 progress toward the next level */
  progress: number;
  last: string;
};

/** XP: 3 per message, 2 per reaction received, 5 per shared media. */
export function xpFor(messages: number, reactions: number, media: number) {
  return messages * 3 + reactions * 2 + media * 5;
}

export function levelFor(xp: number): {
  level: WansaLevel;
  next: WansaLevel | null;
  progress: number;
} {
  let idx = 0;
  for (let i = 0; i < WANSA_LEVELS.length; i++) {
    if (xp >= WANSA_LEVELS[i].min) idx = i;
  }
  const level = WANSA_LEVELS[idx];
  const next = WANSA_LEVELS[idx + 1] ?? null;
  const progress = next ? Math.min(1, Math.max(0, (xp - level.min) / (next.min - level.min))) : 1;
  return { level, next, progress };
}

/** Aggregate per-user stats from the loaded messages of a channel. */
export function computeStats(messages: WansaMessage[]): Map<string, UserStats> {
  const map = new Map<string, UserStats>();
  for (const m of messages) {
    if (m.isDeleted) continue;
    const id = m.author.id;
    const prev = map.get(id);
    const msgs = (prev?.messages ?? 0) + 1;
    const reactions = (prev?.reactions ?? 0) + (m.reactions?.length ?? 0);
    const media = (prev?.media ?? 0) + (m.attachment ? 1 : 0);
    const xp = xpFor(msgs, reactions, media);
    const { level, next, progress } = levelFor(xp);
    map.set(id, {
      id,
      username: m.author.username || "عضو",
      avatarUrl: m.author.avatarUrl || "",
      messages: msgs,
      reactions,
      media,
      xp,
      level,
      next,
      progress,
      last: m.createdAt,
    });
  }
  return map;
}
