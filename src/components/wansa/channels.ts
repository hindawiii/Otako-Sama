/**
 * Al-Wansa channel registry (Task 1.3).
 * Central source of truth for the sidebar. Keeping this static + typed lets
 * Task 1.4 swap in real API-driven previews without touching the UI.
 */

export type ChannelKind = "group" | "dm";

export type WansaChannel = {
  id: string;
  name: string;
  kind: ChannelKind;
  /** Short subtitle shown under the header in the chat view. */
  topic?: string;
  /** Optional last-message preview for the sidebar (mocked until 1.4). */
  lastMessage?: string;
  time?: string;
  unread?: number;
  online?: boolean;
};

export const WANSA_CHANNELS: WansaChannel[] = [
  {
    id: "general",
    name: "General • عام",
    kind: "group",
    topic: "قناة الترحيب — تحدث بأي شيء",
    online: true,
  },
  {
    id: "anime",
    name: "Anime Talk",
    kind: "group",
    topic: "نقاشات الأنمي الأسبوعية",
  },
  {
    id: "manga",
    name: "Manga Readers",
    kind: "group",
    topic: "قرّاء المانجا — بدون حرق",
  },
  {
    id: "cosplay",
    name: "Cosplay Corner",
    kind: "group",
    topic: "شارك أعمالك وتصاميمك",
  },
];

export const DEFAULT_CHANNEL_ID = "general";
