import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageCircle, Swords, Gamepad2, BookOpen, User, Languages } from "lucide-react";
import i18n, { isRTL } from "@/i18n";
import { cn } from "@/lib/utils";
import { AlWansa } from "@/components/wansa/AlWansa";
import { AnimeManga } from "@/components/library/AnimeManga";

type SectionKey = "wansa" | "arena" | "games" | "library" | "profile";

const SECTIONS: { key: SectionKey; icon: typeof MessageCircle }[] = [
  { key: "wansa", icon: MessageCircle },
  { key: "arena", icon: Swords },
  { key: "games", icon: Gamepad2 },
  { key: "library", icon: BookOpen },
  { key: "profile", icon: User },
];

export function OtakuShell() {
  const { t } = useTranslation();
  const [lang, setLang] = useState<string>(i18n.language || "ar");
  const [active, setActive] = useState<SectionKey>("wansa");

  useEffect(() => {
    const onChange = (lng: string) => {
      setLang(lng);
      if (typeof document !== "undefined") {
        document.documentElement.lang = lng;
        document.documentElement.dir = isRTL(lng) ? "rtl" : "ltr";
      }
    };
    onChange(i18n.language);
    i18n.on("languageChanged", onChange);
    return () => i18n.off("languageChanged", onChange);
  }, []);

  const toggleLang = () => i18n.changeLanguage(lang === "ar" ? "en" : "ar");

  const activeSection = SECTIONS.find((s) => s.key === active)!;
  const ActiveIcon = activeSection.icon;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/60 bg-background/70 px-4 py-3 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <Swords className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight">{t("appName")}</h1>
            <p className="truncate text-[11px] text-muted-foreground">{t("tagline")}</p>
          </div>
        </div>
        <button
          onClick={toggleLang}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent active:scale-[0.97]"
          aria-label={t("language")}
        >
          <Languages className="h-3.5 w-3.5" />
          {lang === "ar" ? t("switchToEnglish") : t("switchToArabic")}
        </button>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col gap-4 p-4 pb-24">
        {active === "wansa" ? (
          <AlWansa />
        ) : active === "library" ? (
          <AnimeManga />
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                <ActiveIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold">{t(`sections.${active}.title`)}</h2>
                <p className="truncate text-sm text-muted-foreground">
                  {t(`sections.${active}.desc`)}
                </p>
              </div>
            </div>
            <div className="mt-6 grid place-items-center rounded-xl border border-dashed border-border py-12 text-sm text-muted-foreground">
              {t("placeholder")}
            </div>
          </div>
        )}
      </main>

      {/* Bottom nav (mobile-first, sticky) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-md items-center justify-around border-t border-border/60 bg-background/85 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl"
        aria-label={t("nav.home")}
      >
        {SECTIONS.map(({ key, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={cn(
                "group flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-medium transition-all active:scale-95",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <span
                className={cn(
                  "grid h-8 w-full max-w-14 place-items-center rounded-full transition-colors",
                  isActive && "bg-primary/15",
                )}
              >
                <Icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} />
              </span>
              <span className="truncate">{t(`nav.${key}`)}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
