/**
 * Task 2.5 — pinning (messages + chats).
 * Stored locally per-device in localStorage so the feature stays 100% portable
 * and free-tier friendly (no extra backend collection or storage vendor).
 */

const CHATS_KEY = "os_wansa_pinned_chats";
const MSGS_KEY = "os_wansa_pinned_messages";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — ignore */
  }
}

/* ------------------------------- pinned chats ------------------------------ */

export function loadPinnedChats(): string[] {
  const v = read<string[]>(CHATS_KEY, []);
  return Array.isArray(v) ? v : [];
}

export function togglePinnedChat(id: string): string[] {
  const cur = loadPinnedChats();
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur];
  write(CHATS_KEY, next);
  return next;
}

/* ------------------------------ pinned messages ---------------------------- */

type PinnedMap = Record<string, string[]>;

export function loadPinnedMessages(channel: string): string[] {
  const map = read<PinnedMap>(MSGS_KEY, {});
  const v = map?.[channel];
  return Array.isArray(v) ? v : [];
}

export function togglePinnedMessage(channel: string, id: string): string[] {
  const map = read<PinnedMap>(MSGS_KEY, {});
  const cur = Array.isArray(map[channel]) ? map[channel] : [];
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur];
  write(MSGS_KEY, { ...map, [channel]: next });
  return next;
}
