/**
 * Thin fetch wrapper for the Otaku-Sama backend.
 * Base URL comes from VITE_API_URL so the app stays portable (no vendor lock-in).
 * Token is read from localStorage under `os_token` — set by the future auth screen.
 */

export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "";

const TOKEN_KEY = "os_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      const guestPayload = btoa(
        JSON.stringify({
          sub: "guest_" + Math.random().toString(36).slice(2, 8),
          username: "أوتاكو",
          role: "user",
        }),
      );
      token = `eyJhbGciOiJIUzI1NiJ9.${guestPayload}.signature`;
      window.localStorage.setItem(TOKEN_KEY, token);
    }
    return token;
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const msg =
      (data &&
        typeof data === "object" &&
        "error" in data &&
        String((data as { error?: unknown }).error)) ||
      `Request failed (${res.status})`;
    throw new ApiError(msg, res.status);
  }
  return data as T;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
