import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

export const SUPPORTED_LANGUAGES = ["ar", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const resources = {
  ar: {
    translation: {
      appName: "أوتاكو ساما",
      tagline: "المنصة العربية الأولى للأوتاكو",
      language: "اللغة",
      switchToEnglish: "English",
      switchToArabic: "العربية",
      nav: {
        home: "الرئيسية",
        wansa: "الونسة",
        arena: "ساحة أوتاكو",
        games: "الألعاب",
        library: "الأنمي والمانجا",
        profile: "حسابي",
      },
      sections: {
        wansa: {
          title: "الونسة",
          desc: "دردش مع رفاقك الأوتاكو وشارك يومك.",
        },
        arena: {
          title: "ساحة أوتاكو",
          desc: "نقاشات وتحديات ومنشورات المجتمع.",
        },
        games: {
          title: "الألعاب",
          desc: "استعرض وقيّم ألعابك المفضلة.",
        },
        library: {
          title: "الأنمي والمانجا",
          desc: "أنمي ومانجا في مكان واحد.",
        },
        profile: {
          title: "حسابي",
          desc: "ملفك، تقدمك، وإعداداتك.",
        },
      },
      placeholder: "قريبًا — المرحلة الثانية",
    },
  },
  en: {
    translation: {
      appName: "Otaku Sama",
      tagline: "The first Arab Otaku platform",
      language: "Language",
      switchToEnglish: "English",
      switchToArabic: "العربية",
      nav: {
        home: "Home",
        wansa: "Al-Wansa",
        arena: "Otaku Arena",
        games: "Games",
        library: "Anime & Manga",
        profile: "Profile",
      },
      sections: {
        wansa: {
          title: "Al-Wansa",
          desc: "Chat with your otaku crew and share your day.",
        },
        arena: {
          title: "Otaku Arena",
          desc: "Discussions, debates, and community posts.",
        },
        games: {
          title: "Games",
          desc: "Browse and rate your favorite games.",
        },
        library: {
          title: "Anime & Manga",
          desc: "Anime and manga, all in one place.",
        },
        profile: {
          title: "Profile",
          desc: "Your profile, progress, and settings.",
        },
      },
      placeholder: "Coming soon — Phase 2",
    },
  },
} as const;

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: "ar",
      supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"],
        lookupLocalStorage: "otaku-sama-lang",
      },
    });
}

export function isRTL(lang: string) {
  return lang.startsWith("ar");
}

export default i18n;
