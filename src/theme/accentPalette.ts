export type AccentColorId =
  | "white"
  | "light_gray"
  | "gray"
  | "black"
  | "brown"
  | "red"
  | "orange"
  | "yellow"
  | "lime"
  | "green"
  | "cyan"
  | "light_blue"
  | "blue"
  | "purple"
  | "magenta"
  | "pink";

export type AccentColor = {
  id: AccentColorId;
  label: { en: string; es: string };
  hex: string;
};

export const MINECRAFT_WOOL_COLORS: AccentColor[] = [
  { id: "white", label: { en: "White", es: "Blanco" }, hex: "#F9FFFE" },
  { id: "light_gray", label: { en: "Light Gray", es: "Gris claro" }, hex: "#9D9D97" },
  { id: "gray", label: { en: "Gray", es: "Gris" }, hex: "#474F52" },
  { id: "black", label: { en: "Black", es: "Negro" }, hex: "#1D1D21" },
  { id: "brown", label: { en: "Brown", es: "Marron" }, hex: "#835432" },
  { id: "red", label: { en: "Red", es: "Rojo" }, hex: "#B02E26" },
  { id: "orange", label: { en: "Orange", es: "Naranja" }, hex: "#F9801D" },
  { id: "yellow", label: { en: "Yellow", es: "Amarillo" }, hex: "#FED83D" },
  { id: "lime", label: { en: "Lime", es: "Lima" }, hex: "#80C71F" },
  { id: "green", label: { en: "Green", es: "Verde" }, hex: "#5E7C16" },
  { id: "cyan", label: { en: "Cyan", es: "Cian" }, hex: "#169C9C" },
  { id: "light_blue", label: { en: "Light Blue", es: "Azul claro" }, hex: "#3AB3DA" },
  { id: "blue", label: { en: "Blue", es: "Azul" }, hex: "#3C44AA" },
  { id: "purple", label: { en: "Purple", es: "Morado" }, hex: "#8932B8" },
  { id: "magenta", label: { en: "Magenta", es: "Magenta" }, hex: "#C74EBD" },
  { id: "pink", label: { en: "Pink", es: "Rosa" }, hex: "#F38BAA" },
];

const DEFAULT_ACCENT_COLOR_ID: AccentColorId = "cyan";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const hexToHsl = (hex: string) => {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
};

const getAccentColor = (accentColorId: AccentColorId) =>
  MINECRAFT_WOOL_COLORS.find((color) => color.id === accentColorId) ??
  MINECRAFT_WOOL_COLORS.find((color) => color.id === DEFAULT_ACCENT_COLOR_ID)!;

const isLightColor = (lightness: number) => lightness >= 65;

const toHslToken = (h: number, s: number, l: number) => `${h} ${clamp(s, 0, 100)}% ${clamp(l, 0, 100)}%`;

export const isAccentColorId = (value: string | null | undefined): value is AccentColorId =>
  MINECRAFT_WOOL_COLORS.some((color) => color.id === value);

export const getDefaultAccentColorId = () => DEFAULT_ACCENT_COLOR_ID;

export const applyAccentThemeVars = (accentColorId: AccentColorId, mode: "light" | "dark") => {
  const root = document.documentElement;
  const { h, s, l } = hexToHsl(getAccentColor(accentColorId).hex);
  const mainPrimary = toHslToken(h, s, l);
  const accentLightness = mode === "dark" ? 18 : 92;
  const accentSaturation = mode === "dark" ? clamp(s, 20, 55) : clamp(s, 25, 65);
  const accentForegroundLightness = mode === "dark" ? 75 : 25;

  root.style.setProperty("--primary", mainPrimary);
  root.style.setProperty("--ring", mainPrimary);
  root.style.setProperty("--accent", toHslToken(h, accentSaturation, accentLightness));
  root.style.setProperty("--accent-foreground", toHslToken(h, clamp(s, 35, 85), accentForegroundLightness));

  const foreground = isLightColor(l) ? "220 47% 11%" : "0 0% 100%";
  root.style.setProperty("--primary-foreground", foreground);

  root.style.setProperty("--sidebar-primary", mainPrimary);
  root.style.setProperty("--sidebar-primary-foreground", foreground);
  root.style.setProperty("--sidebar-accent", toHslToken(h, accentSaturation, accentLightness));
  root.style.setProperty("--sidebar-accent-foreground", toHslToken(h, clamp(s, 35, 85), accentForegroundLightness));
  root.style.setProperty("--sidebar-ring", mainPrimary);
};
