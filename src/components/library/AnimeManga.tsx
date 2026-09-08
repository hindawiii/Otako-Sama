import { useState } from "react";
import { Newspaper, Tv, BookOpen, Music, Images, Star, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { LegalBadge, SectionHeader, AnimeCard, CardSkeleton, ErrorNote } from "./ui";
import { MEDIA_FIELDS, useAniListData, type AniMedia } from "./anilist";

type TabKey = "news" | "watch" | "manga" | "music" | "gallery" | "lists";

const TABS: { key: TabKey; label: string; icon: typeof Tv }[] = [
  { key: "news", label: "الأخبار", icon: Newspaper },
  { key: "watch", label: "المشاهدة", icon: Tv },
  { key: "manga", label: "مانجا", icon: BookOpen },
  { key: "music", label: "موسيقى", icon: Music },
  { key: "gallery", label: "المعرض", icon: Images },
  { key: "lists", label: "قوائمي", icon: Star },
];

const TRENDING_Q = `query { Page(perPage: 6) { media(type: ANIME, sort: TRENDING_DESC) { ${MEDIA_FIELDS} } } }`;

export function AnimeManga() {
  const [tab, setTab] = useState<TabKey>("news");

  return (
    <div className="library-root -mx-4 -mt-4 mb-[-6rem] flex min-h-[calc(100dvh-8.5rem)] flex-col text-[var(--l-fg)]">
      {/* Sticky glass header */}
      <header className="sticky top-[61px] z-10 border-b border-[var(--l-border)] bg-[var(--l-bg)]/70 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 pt-3">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight">
              الأنمي <span className="text-[var(--l-primary)]">و</span>المانجا
            </h2>
            <p className="text-[11px] text-[var(--l-muted)]">
              أخبار، مشاهدة، قراءة، وقوائم متابعتك — من مصادر رسمية
            </p>
          </div>
          <LegalBadge />
        </div>
        <nav
          className="no-scrollbar mt-2 flex gap-1 overflow-x-auto px-3 pb-0"
          aria-label="تبويبات القسم"
        >
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "relative flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-xs font-bold transition-colors",
                  active
                    ? "text-[var(--l-primary)]"
                    : "text-[var(--l-muted)] hover:text-[var(--l-fg)]",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4" />
                {label}
                {active && (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[var(--l-primary)] shadow-[0_0_10px_var(--l-primary)]" />
                )}
              </button>
            );
          })}
        </nav>
      </header>

      <div className="flex-1 space-y-6 p-4 pb-28">
        {tab === "news" && <TrendingPreview />}
        {tab !== "news" && <ComingSoon label={TABS.find((t) => t.key === tab)!.label} />}
      </div>
    </div>
  );
}

/** Temporary: proves the AniList hook + AnimeCard work. Replaced by the full News tab in L2. */
function TrendingPreview() {
  const { data, loading, error } = useAniListData<{ Page: { media: AniMedia[] } }>(TRENDING_Q);
  return (
    <section>
      <SectionHeader
        icon={<Sparkles className="h-4 w-4" />}
        title="الرائج الآن"
        subtitle="بيانات حيّة من AniList"
      />
      {error ? (
        <ErrorNote message={error} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {loading ? (
            <CardSkeleton />
          ) : (
            data?.Page.media.map((m) => <AnimeCard key={m.id} media={m} />)
          )}
        </div>
      )}
    </section>
  );
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-[var(--l-border)] bg-[var(--l-card)]/50 py-16 text-center">
      <p className="text-sm font-bold">{label}</p>
      <p className="mt-1 text-xs text-[var(--l-muted)]">قيد البناء في المهمة التالية</p>
    </div>
  );
}
