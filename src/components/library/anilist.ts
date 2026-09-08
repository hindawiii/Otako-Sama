/**
 * AniList public GraphQL API — no key required, free tier friendly.
 * Only metadata (titles, covers, scores, dates) is fetched. Nothing is hosted.
 */
import { useEffect, useState } from "react";

export const ANILIST_URL = "https://graphql.anilist.co";

export type AniMedia = {
  id: number;
  title: { romaji: string; english: string | null; native: string | null };
  coverImage: { large: string; extraLarge?: string; color: string | null };
  bannerImage: string | null;
  averageScore: number | null;
  status: string | null;
  episodes: number | null;
  chapters: number | null;
  format: string | null;
  genres: string[];
  season: string | null;
  seasonYear: number | null;
  siteUrl: string;
  description?: string | null;
  studios?: { nodes: { name: string; siteUrl: string }[] };
  nextAiringEpisode?: { airingAt: number; episode: number } | null;
  externalLinks?: { site: string; url: string; type?: string }[];
  trailer?: { id: string; site: string } | null;
};

export const MEDIA_FIELDS = `
  id
  title { romaji english native }
  coverImage { large extraLarge color }
  bannerImage
  averageScore
  status
  episodes
  chapters
  format
  genres
  season
  seasonYear
  siteUrl
  nextAiringEpisode { airingAt episode }
  studios(isMain: true) { nodes { name siteUrl } }
`;

const cache = new Map<string, { at: number; data: unknown }>();
const TTL = 10 * 60 * 1000;

export async function anilistQuery<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const key = query + JSON.stringify(variables);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data as T;

  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList ${res.status}`);
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(json.errors[0].message);
  cache.set(key, { at: Date.now(), data: json.data });
  return json.data as T;
}

/** Generic hook around anilistQuery with loading/error state. */
export function useAniListData<T>(
  query: string,
  variables: Record<string, unknown> = {},
  enabled = true,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const varsKey = JSON.stringify(variables);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setLoading(true);
    setError(null);
    anilistQuery<T>(query, JSON.parse(varsKey))
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [query, varsKey, enabled]);

  return { data, loading, error };
}

export function mediaTitle(m: AniMedia) {
  return m.title.english || m.title.romaji || m.title.native || "—";
}

export function currentSeason(): { season: string; year: number } {
  const d = new Date();
  const m = d.getMonth();
  const season = m < 3 ? "WINTER" : m < 6 ? "SPRING" : m < 9 ? "SUMMER" : "FALL";
  return { season, year: d.getFullYear() };
}

export const STATUS_AR: Record<string, string> = {
  RELEASING: "يُعرض الآن",
  FINISHED: "مكتمل",
  NOT_YET_RELEASED: "قريبًا",
  CANCELLED: "ملغي",
  HIATUS: "متوقف مؤقتًا",
};
