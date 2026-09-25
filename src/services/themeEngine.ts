/**
 * Central Theme Engine & Design Token System
 * Provides single source of truth for application theme tokens, CSS variables,
 * and live dynamic preview synchronization.
 */

import { SystemSettings } from "../types/index";

export type ThemePresetId =
  | "light"
  | "classic_blue"
  | "emerald_green"
  | "warm_professional"
  | "dark";

export interface ThemeDefinition {
  id: ThemePresetId;
  name: string;
  subname: string;
  description: string;
  badge: string;
  isDark: boolean;
  accentHex: string;
  preview: {
    appBg: string;
    cardBg: string;
    headerBg: string;
    sidebarBg: string;
    border: string;
    accent: string;
    accentHover: string;
    textMain: string;
    textMuted: string;
  };
}

export const THEME_PRESETS: Record<ThemePresetId, ThemeDefinition> = {
  light: {
    id: "light",
    name: "السمة الفاتحة القياسية",
    subname: "Clean Warm White",
    description: "واجهة نهارية دافئة ونظيفة بأقل درجات الرمادي لتوفير تباين ناصع ومريح في القراءة والطباعة.",
    badge: "✨ النمط الافتراضي المعتمد",
    isDark: false,
    accentHex: "#2563eb",
    preview: {
      appBg: "#fafaf9",
      cardBg: "#ffffff",
      headerBg: "#ffffff",
      sidebarBg: "#fcfbf9",
      border: "#e7e5e4",
      accent: "#2563eb",
      accentHover: "#1d4ed8",
      textMain: "#1c1917",
      textMuted: "#78716c",
    },
  },
  classic_blue: {
    id: "classic_blue",
    name: "سمة الأزرق المكتبي",
    subname: "Classic Office Blue",
    description: "أبيض ناصع مع خلفية خفيفة جداً بدرجة Ice Blue ولمسات أزرق مكتبي ملكي للعمل اليومي المتقن.",
    badge: "✨ النمط الأزرق الملكي",
    isDark: false,
    accentHex: "#0f6cbd",
    preview: {
      appBg: "#f4f8fc",
      cardBg: "#ffffff",
      headerBg: "#ffffff",
      sidebarBg: "#f5f9fd",
      border: "#dbe7f4",
      accent: "#0f6cbd",
      accentHover: "#115ea3",
      textMain: "#0f1d2e",
      textMuted: "#506e90",
    },
  },
  emerald_green: {
    id: "emerald_green",
    name: "السمة الزمردية الأكاديمية",
    subname: "Academic Emerald Mint",
    description: "أبيض منعش مع خلفية Mint خفيفة جداً ولمسات زمردية راقية مصممة خصيصاً للمؤسسات التعليمية.",
    badge: "✨ مظهر أكاديمي زمردي",
    isDark: false,
    accentHex: "#059669",
    preview: {
      appBg: "#f4faf7",
      cardBg: "#ffffff",
      headerBg: "#ffffff",
      sidebarBg: "#f5fbf8",
      border: "#d8ebe2",
      accent: "#059669",
      accentHover: "#047857",
      textMain: "#0f291e",
      textMuted: "#527d6d",
    },
  },
  warm_professional: {
    id: "warm_professional",
    name: "السمة العاجية المريحة",
    subname: "Warm Ivory Professional",
    description: "أبيض دافئ مع لمسة عاجية خفيفة جداً (Ivory) وأكسنت هادئ لمنع إجهاد العين أثناء جلسات الإعداد الطويلة.",
    badge: "✨ مظهر عاجي مريح للعين",
    isDark: false,
    accentHex: "#0d9488",
    preview: {
      appBg: "#faf8f4",
      cardBg: "#ffffff",
      headerBg: "#ffffff",
      sidebarBg: "#fbf9f4",
      border: "#ece5d8",
      accent: "#0d9488",
      accentHover: "#0f766e",
      textMain: "#27221d",
      textMuted: "#7c7163",
    },
  },
  dark: {
    id: "dark",
    name: "السمة الداكنة الاحترافية",
    subname: "Professional Deep Navy",
    description: "كحلي وفحمي احترافي عميق مع أسطح داكنة وتباين عالي الجودة للقراءة السلسة دون إجهاد العين.",
    badge: "✨ كحلي عميق + تباين عالي",
    isDark: true,
    accentHex: "#38bdf8",
    preview: {
      appBg: "#0b1120",
      cardBg: "#131d31",
      headerBg: "#0e1626",
      sidebarBg: "#0d1524",
      border: "#1e2c48",
      accent: "#38bdf8",
      accentHover: "#0ea5e9",
      textMain: "#f8fafc",
      textMuted: "#94a3b8",
    },
  },
};

/**
 * Apply active theme tokens to DOM documentElement
 */
export function applyGlobalTheme(settings: Partial<SystemSettings>) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const mode = settings.themeMode || "light";
  let preset = (settings.themePreset as ThemePresetId) || (mode === "dark" ? "dark" : "light");

  // If preset is not recognized, fallback safely
  if (!THEME_PRESETS[preset]) {
    preset = mode === "dark" ? "dark" : "light";
  }

  let isDark = mode === "dark" || preset === "dark";
  if (mode === "system" || settings.syncWithOs) {
    if (preset !== "classic_blue" && preset !== "emerald_green" && preset !== "warm_professional") {
      isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
  }

  // Remove existing theme classes
  root.classList.remove(
    "dark",
    "theme-light",
    "theme-dark",
    "theme-classic-blue",
    "theme-emerald",
    "theme-warm",
  );

  // Set dark class for Tailwind utilities
  if (isDark) {
    root.classList.add("dark");
  }

  // Add specific theme class
  if (preset === "emerald_green") {
    root.classList.add("theme-emerald");
  } else if (preset === "classic_blue") {
    root.classList.add("theme-classic-blue");
  } else if (preset === "warm_professional") {
    root.classList.add("theme-warm");
  } else if (preset === "dark" || isDark) {
    root.classList.add("theme-dark");
  } else {
    root.classList.add("theme-light");
  }

  // Determine active tokens
  const themeDef = THEME_PRESETS[preset] || THEME_PRESETS.light;
  const activePrimary = settings.primaryColorHex || themeDef.accentHex;

  // Set Core CSS variables
  root.style.setProperty("--primary-hex", activePrimary);

  if (settings.secondaryColorHex) {
    root.style.setProperty("--secondary-hex", settings.secondaryColorHex);
  }
  if (settings.accentColorHex) {
    root.style.setProperty("--accent-hex", settings.accentColorHex);
  }
}
