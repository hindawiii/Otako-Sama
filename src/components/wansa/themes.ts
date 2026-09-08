/**
 * Task 3.2 — chat themes.
 * Pure client-side theming: each preset is a set of CSS variables applied on
 * the .wansa-root element and persisted in localStorage (no backend, portable).
 */
import { useCallback, useEffect, useState } from "react";

export type WansaTheme = {
  id: string;
  name: string;
  /** small swatch used in the picker */
  swatch: string[];
  vars: {
    "--w-bg": string;
    "--w-panel": string;
    "--w-elev": string;
    "--w-accent": string;
    "--w-accent-soft": string;
    "--w-wall": string;
  };
};

export const WANSA_THEMES: WansaTheme[] = [
  {
    id: "space",
    name: "فضاء داكن",
    swatch: ["#0a0a12", "#1a1a2e", "#059669"],
    vars: {
      "--w-bg": "#0a0a12",
      "--w-panel": "#12121e",
      "--w-elev": "#1a1a2e",
      "--w-accent": "#059669",
      "--w-accent-soft": "#34d399",
      "--w-wall":
        "radial-gradient(circle at 20% 10%, rgba(99,102,241,0.08), transparent 40%), radial-gradient(circle at 80% 90%, rgba(217,70,239,0.06), transparent 40%)",
    },
  },
  {
    id: "sakura",
    name: "ساكورا",
    swatch: ["#180d14", "#2a1520", "#db2777"],
    vars: {
      "--w-bg": "#180d14",
      "--w-panel": "#221019",
      "--w-elev": "#2f1723",
      "--w-accent": "#db2777",
      "--w-accent-soft": "#f9a8d4",
      "--w-wall":
        "radial-gradient(circle at 15% 15%, rgba(244,114,182,0.10), transparent 45%), radial-gradient(circle at 85% 85%, rgba(251,191,36,0.06), transparent 45%)",
    },
  },
  {
    id: "shinobi",
    name: "شينوبي",
    swatch: ["#0b1211", "#132420", "#0d9488"],
    vars: {
      "--w-bg": "#0b1211",
      "--w-panel": "#101d1a",
      "--w-elev": "#162a26",
      "--w-accent": "#0d9488",
      "--w-accent-soft": "#5eead4",
      "--w-wall":
        "radial-gradient(circle at 25% 20%, rgba(20,184,166,0.10), transparent 45%), radial-gradient(circle at 80% 80%, rgba(132,204,22,0.06), transparent 45%)",
    },
  },
  {
    id: "sunset",
    name: "غروب أوتاكو",
    swatch: ["#140d0a", "#241410", "#ea580c"],
    vars: {
      "--w-bg": "#140d0a",
      "--w-panel": "#1e120d",
      "--w-elev": "#2b1a13",
      "--w-accent": "#ea580c",
      "--w-accent-soft": "#fdba74",
      "--w-wall":
        "radial-gradient(circle at 20% 15%, rgba(249,115,22,0.12), transparent 45%), radial-gradient(circle at 85% 85%, rgba(190,24,93,0.08), transparent 45%)",
    },
  },
  {
    id: "midnight",
    name: "منتصف الليل",
    swatch: ["#080b14", "#111827", "#3b82f6"],
    vars: {
      "--w-bg": "#080b14",
      "--w-panel": "#0e1421",
      "--w-elev": "#182030",
      "--w-accent": "#3b82f6",
      "--w-accent-soft": "#93c5fd",
      "--w-wall":
        "radial-gradient(circle at 20% 10%, rgba(59,130,246,0.10), transparent 45%), radial-gradient(circle at 80% 90%, rgba(14,165,233,0.07), transparent 45%)",
    },
  },
];

const KEY = "os_wansa_theme";
export const DEFAULT_THEME_ID = "space";

export function getTheme(id: string): WansaTheme {
  return WANSA_THEMES.find((t) => t.id === id) ?? WANSA_THEMES[0];
}

export function loadThemeId(): string {
  if (typeof window === "undefined") return DEFAULT_THEME_ID;
  try {
    return window.localStorage.getItem(KEY) || DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

const EVENT = "wansa:theme";

export function saveThemeId(id: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: id }));
}

/** Shared theme state across the Wansa components. */
export function useWansaTheme() {
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);

  useEffect(() => {
    setThemeId(loadThemeId());
    const onChange = (e: Event) => setThemeId((e as CustomEvent<string>).detail);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  const setTheme = useCallback((id: string) => {
    setThemeId(id);
    saveThemeId(id);
  }, []);

  return { themeId, theme: getTheme(themeId), setTheme };
}
