/**
 * Al-Wansa API client. Mirrors backend/controllers/wansaController.js.
 */
import { apiFetch } from "./api";

export type WansaAuthor = {
  id: string;
  username?: string;
  avatarUrl?: string;
};

export type WansaAttachment = {
  kind: "image" | "file";
  url: string;
  name: string;
  mime: string;
  size: number;
};

export type WansaMessage = {
  id: string;
  channel: string;
  content: string;
  language: "ar" | "en";
  attachment: WansaAttachment | null;
  replyTo: string | null;
  reactions: { user: string; emoji: string }[];
  isDeleted: boolean;
  author: WansaAuthor;
  createdAt: string;
  updatedAt: string;
};

export async function listMessages(
  channel: string,
  opts: { limit?: number; before?: string } = {},
): Promise<{ channel: string; messages: WansaMessage[] }> {
  const params = new URLSearchParams({ channel });
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.before) params.set("before", opts.before);
  return apiFetch(`/api/wansa/messages?${params.toString()}`);
}

export async function sendMessage(input: {
  channel: string;
  content: string;
  replyTo?: string | null;
  language?: "ar" | "en";
  attachment?: WansaAttachment | null;
}): Promise<{ message: WansaMessage }> {
  return apiFetch(`/api/wansa/messages`, {
    method: "POST",
    body: JSON.stringify({
      channel: input.channel,
      content: input.content,
      replyTo: input.replyTo ?? null,
      language: input.language ?? "ar",
      attachment: input.attachment ?? null,
    }),
  });
}

/** Max original file size accepted client-side (base64 inflates ~33%). */
export const MAX_ATTACHMENT_BYTES = 1.5 * 1024 * 1024;

/** Read a File into a portable inline attachment (data URL). */
export function fileToAttachment(file: File): Promise<WansaAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("تعذّر قراءة الملف"));
    reader.onload = () =>
      resolve({
        kind: file.type.startsWith("image/") ? "image" : "file",
        url: String(reader.result),
        name: file.name,
        mime: file.type,
        size: file.size,
      });
    reader.readAsDataURL(file);
  });
}

export async function editMessage(id: string, content: string): Promise<{ message: WansaMessage }> {
  return apiFetch(`/api/wansa/messages/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ content }),
  });
}

export async function deleteMessage(id: string): Promise<{ ok: boolean; id: string }> {
  return apiFetch(`/api/wansa/messages/${id}`, { method: "DELETE" });
}

export async function toggleReaction(
  id: string,
  emoji: string,
): Promise<{ message: WansaMessage }> {
  return apiFetch(`/api/wansa/messages/${id}/reactions`, {
    method: "POST",
    body: JSON.stringify({ emoji }),
  });
}

/** Task 3.4 — ask the Al-Wansa AI bot. Replies are persisted as messages. */
export async function askBot(input: {
  channel: string;
  prompt: string;
  replyTo?: string | null;
}): Promise<{ message: WansaMessage }> {
  return apiFetch(`/api/wansa/bot`, {
    method: "POST",
    body: JSON.stringify({
      channel: input.channel,
      prompt: input.prompt,
      replyTo: input.replyTo ?? null,
    }),
  });
}

/** True when a draft calls the bot (@bot / بوت@ prefix or mention). */
export function mentionsBot(text: string): boolean {
  return /(^|\s)@(bot|بوت)\b/i.test(text) || /^\s*(بوت|bot)\s*[,:،]/i.test(text);
}

/** Strip the bot mention so the prompt reads naturally. */
export function stripBotMention(text: string): string {
  return text
    .replace(/(^|\s)@(bot|بوت)\b/gi, " ")
    .replace(/^\s*(بوت|bot)\s*[,:،]/i, "")
    .trim();
}
