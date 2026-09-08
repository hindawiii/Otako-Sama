/**
 * Task 3.5 — Wansa privacy settings.
 *
 * 100% local & portable: everything lives in localStorage, no backend,
 * no vendor lock-in. Settings are per-device (like WhatsApp Web).
 */
import { useCallback, useEffect, useState } from "react";

export type WansaPrivacy = {
  /** Blur images/files until tapped (شاشة خاصة). */
  blurMedia: boolean;
  /** Incognito: don't show "typing…" or last-seen to others. */
  incognito: boolean;
  /** Hide message previews in the chat list. */
  hidePreviews: boolean;
  /** Require a PIN before opening a chat. */
  lockEnabled: boolean;
  /** Local PIN (4-8 digits). Stored on-device only. */
  pin: string;
  /** Blocked usernames (their messages are hidden). */
  blocked: string[];
};

export const DEFAULT_PRIVACY: WansaPrivacy = {
  blurMedia: false,
  incognito: false,
  hidePreviews: false,
  lockEnabled: false,
  pin: "",
  blocked: [],
};

const KEY = "wansa.privacy.v1";

export function loadPrivacy(): WansaPrivacy {
  if (typeof window === "undefined") return DEFAULT_PRIVACY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PRIVACY;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PRIVACY,
      ...parsed,
      blocked: Array.isArray(parsed?.blocked) ? parsed.blocked.map(String) : [],
    };
  } catch {
    return DEFAULT_PRIVACY;
  }
}

export function savePrivacy(value: WansaPrivacy): WansaPrivacy {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(value));
      window.dispatchEvent(new CustomEvent("wansa:privacy", { detail: value }));
    } catch {
      /* storage disabled — settings simply won't persist */
    }
  }
  return value;
}

/** Shared hook so every pane reacts to a change instantly. */
export function useWansaPrivacy() {
  const [privacy, setPrivacy] = useState<WansaPrivacy>(DEFAULT_PRIVACY);

  useEffect(() => {
    setPrivacy(loadPrivacy());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<WansaPrivacy>).detail;
      setPrivacy(detail ?? loadPrivacy());
    };
    window.addEventListener("wansa:privacy", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("wansa:privacy", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const update = useCallback((patch: Partial<WansaPrivacy>) => {
    const next = { ...loadPrivacy(), ...patch };
    savePrivacy(next);
    setPrivacy(next);
    return next;
  }, []);

  const toggleBlocked = useCallback((username: string) => {
    const cur = loadPrivacy();
    const has = cur.blocked.includes(username);
    const next = {
      ...cur,
      blocked: has ? cur.blocked.filter((u) => u !== username) : [...cur.blocked, username],
    };
    savePrivacy(next);
    setPrivacy(next);
    return next;
  }, []);

  return { privacy, update, toggleBlocked };
}

/** True when this author's messages should be hidden. */
export function isBlocked(privacy: WansaPrivacy, username?: string) {
  return !!username && privacy.blocked.includes(username);
}
