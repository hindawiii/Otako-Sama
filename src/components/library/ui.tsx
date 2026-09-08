import type { ReactNode } from "react";
import { ExternalLink, ShieldCheck, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_AR, mediaTitle, type AniMedia } from "./anilist";

/* ---------- SectionHeader ---------- */
export function SectionHeader({
  icon,
  title,
  subtitle,
  action,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--l-primary)]/15 text-[var(--l-primary)] ring-1 ring-[var(--l-primary)]/30">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold leading-tight">{title}</h2>
          {subtitle && <p className="truncate text-xs text-[var(--l-muted)]">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ---------- ExternalButton (all outbound links go through here) ---------- */
export function ExternalButton({
  href,
  children,
  variant = "primary",
  className,
  badge,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  badge?: "free" | "paid" | "official";
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all active:scale-[0.97]",
        variant === "primary" &&
          "bg-[var(--l-primary)] text-white shadow-[0_6px_20px_-6px_var(--l-primary)] hover:brightness-110",
        variant === "secondary" &&
          "border border-[var(--l-border)] bg-[var(--l-card)] text-[var(--l-fg)] hover:border-[var(--l-secondary)]/60 hover:text-[var(--l-secondary)]",
        variant === "ghost" && "text-[var(--l-secondary)] hover:bg-[var(--l-secondary)]/10",
        className,
      )}
    >
      {children}
      {badge && <Badge kind={badge} />}
      <ExternalLink className="h-3.5 w-3.5 opacity-70" />
    </a>
  );
}

export function Badge({ kind }: { kind: "free" | "paid" | "official" }) {
  const map = {
    free: ["مجاني", "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"],
    paid: ["مدفوع", "bg-amber-500/15 text-amber-300 ring-amber-500/30"],
    official: [
      "رسمي",
      "bg-[var(--l-secondary)]/15 text-[var(--l-secondary)] ring-[var(--l-secondary)]/30",
    ],
  } as const;
  const [label, cls] = map[kind];
  return (
    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold ring-1", cls)}>
      {label}
    </span>
  );
}

export function LegalBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300"
      title="لا نستضيف أي فيديو أو ملف — روابط رسمية فقط"
    >
      <ShieldCheck className="h-3.5 w-3.5" />
      {compact ? "قانوني 100%" : "محتوى قانوني 100%"}
    </span>
  );
}

/* ---------- Card wrapper with hover-lift ---------- */
export function LiftCard({
  className,
  children,
  onClick,
}: {
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "l-lift overflow-hidden rounded-2xl border border-[var(--l-border)] bg-[var(--l-card)]",
        onClick && "cursor-pointer",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ---------- AnimeCard ---------- */
export function AnimeCard({ media, onClick }: { media: AniMedia; onClick?: () => void }) {
  const total = media.episodes ?? media.chapters;
  const next = media.nextAiringEpisode;
  return (
    <LiftCard onClick={onClick} className="group">
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={media.coverImage.large}
          alt={mediaTitle(media)}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          style={{ backgroundColor: media.coverImage.color ?? "#1a1a24" }}
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" />
        {media.averageScore != null && (
          <span className="absolute start-2 top-2 inline-flex items-center gap-1 rounded-lg bg-black/60 px-1.5 py-0.5 text-[11px] font-bold text-amber-300 backdrop-blur">
            <Star className="h-3 w-3 fill-current" />
            {(media.averageScore / 10).toFixed(1)}
          </span>
        )}
        {media.status && (
          <span
            className={cn(
              "absolute end-2 top-2 rounded-lg px-1.5 py-0.5 text-[10px] font-bold backdrop-blur",
              media.status === "RELEASING"
                ? "bg-[var(--l-primary)]/80 text-white"
                : "bg-black/60 text-slate-200",
            )}
          >
            {STATUS_AR[media.status] ?? media.status}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <p className="line-clamp-2 text-[13px] font-bold leading-snug text-white">
            {mediaTitle(media)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-300">
            {next
              ? `الحلقة ${next.episode} قريبًا`
              : total
                ? `${total} ${media.episodes ? "حلقة" : "فصل"}`
                : (media.format ?? "")}
          </p>
        </div>
      </div>
    </LiftCard>
  );
}

/* ---------- Skeleton ---------- */
export function CardSkeleton({
  count = 6,
  aspect = "aspect-[3/4]",
}: {
  count?: number;
  aspect?: string;
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "l-shimmer rounded-2xl border border-[var(--l-border)] bg-[var(--l-card)]",
            aspect,
          )}
        />
      ))}
    </>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-[var(--l-primary)]/30 bg-[var(--l-primary)]/10 p-4 text-center text-sm">
      <p className="font-semibold text-[var(--l-primary)]">تعذّر جلب البيانات من AniList</p>
      <p className="mt-1 text-xs text-[var(--l-muted)]">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded-lg bg-[var(--l-primary)] px-3 py-1.5 text-xs font-bold text-white"
        >
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}
