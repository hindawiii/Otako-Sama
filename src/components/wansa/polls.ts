/**
 * Task 3.1 — Polls (استطلاعات).
 * Polls travel inside a normal Wansa message: the content is a small JSON
 * payload behind a marker, and votes reuse the existing `reactions` array
 * (emoji = "v:0" … "v:5"). Zero backend changes, zero vendor lock-in.
 */

export type Poll = {
  question: string;
  options: string[];
};

const MARKER = "::poll::";

export const MAX_POLL_OPTIONS = 6;

export function encodePoll(poll: Poll): string {
  return (
    MARKER +
    JSON.stringify({
      q: poll.question.slice(0, 200),
      o: poll.options.slice(0, MAX_POLL_OPTIONS).map((o) => o.slice(0, 80)),
    })
  );
}

export function parsePoll(content: string | undefined | null): Poll | null {
  if (!content || !content.startsWith(MARKER)) return null;
  try {
    const raw = JSON.parse(content.slice(MARKER.length));
    const question = String(raw?.q ?? "").trim();
    const options = Array.isArray(raw?.o)
      ? raw.o.map((x: unknown) => String(x)).filter(Boolean)
      : [];
    if (!question || options.length < 2) return null;
    return { question, options: options.slice(0, MAX_POLL_OPTIONS) };
  } catch {
    return null;
  }
}

/** Emoji token used to store a vote for option `i`. */
export function voteToken(i: number): string {
  return `v:${i}`;
}

export function isVoteToken(emoji: string): boolean {
  return /^v:\d$/.test(emoji);
}

/** Tally votes per option index from a message's reactions. */
export function tallyVotes(
  reactions: { user: string; emoji: string }[],
  optionCount: number,
  meId: string | null,
): { counts: number[]; total: number; myVote: number | null } {
  const counts = new Array(optionCount).fill(0);
  let total = 0;
  let myVote: number | null = null;
  for (const r of reactions || []) {
    if (!isVoteToken(r.emoji)) continue;
    const i = Number(r.emoji.slice(2));
    if (i < 0 || i >= optionCount) continue;
    counts[i] += 1;
    total += 1;
    if (meId && r.user === meId) myVote = i;
  }
  return { counts, total, myVote };
}

/** Short human label for a poll message (used in previews/pins/forwards). */
export function pollPreview(poll: Poll): string {
  return `📊 ${poll.question}`;
}
