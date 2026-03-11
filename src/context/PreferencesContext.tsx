import React, { createContext, useContext, useEffect, useState } from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";

import { useAuth } from "@/context/AuthContext";
import { AppLanguage, translations, TranslationKey } from "@/i18n/translations";
import { supabase } from "@/services/supabaseClient";
import {
  AccentColorId,
  applyAccentThemeVars,
  getDefaultAccentColorId,
  isAccentColorId,
} from "@/theme/accentPalette";
import {
  AppBackgroundStyleId,
  getDefaultBackgroundStyleId,
  isAppBackgroundStyleId,
} from "@/theme/backgroundStyles";

export type ThemePreference = "light" | "dark" | "system";

type PreferencesContextValue = {
  language: AppLanguage;
  themePreference: ThemePreference;
  accentColorId: AccentColorId;
  backgroundStyleId: AppBackgroundStyleId;
  setLanguagePreference: (language: AppLanguage) => Promise<void>;
  setThemePreference: (theme: ThemePreference) => Promise<void>;
  setAccentColorPreference: (colorId: AccentColorId) => Promise<void>;
  setBackgroundStylePreference: (styleId: AppBackgroundStyleId) => Promise<void>;
  t: (key: TranslationKey) => string;
};

const LANGUAGE_STORAGE_KEY = "appfit_language";
const THEME_STORAGE_KEY = "appfit_theme_preference";
const ACCENT_STORAGE_KEY = "appfit_accent_color";
const BACKGROUND_STYLE_STORAGE_KEY = "appfit_background_style";

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

const isLanguage = (value: string | null | undefined): value is AppLanguage => value === "en" || value === "es";
const isTheme = (value: string | null | undefined): value is ThemePreference =>
  value === "light" || value === "dark" || value === "system";
const isSchemaMissingError = (error: unknown, columnName: string) => {
  const message = (error as { message?: string } | null)?.message?.toLowerCase() ?? "";
  return message.includes(columnName) || message.includes("schema cache") || message.includes("column") || message.includes("could not find");
};

const PreferencesInnerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, updateProfile, isGuest, user } = useAuth();
  const { setTheme, resolvedTheme } = useTheme();

  const [language, setLanguage] = useState<AppLanguage>("en");
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system");
  const [accentColorId, setAccentColorId] = useState<AccentColorId>(getDefaultAccentColorId());
  const [backgroundStyleId, setBackgroundStyleId] = useState<AppBackgroundStyleId>(getDefaultBackgroundStyleId());

  useEffect(() => {
    const profileLanguage = profile?.app_language;
    const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const nextLanguage = isLanguage(profileLanguage)
      ? profileLanguage
      : isLanguage(storedLanguage)
      ? storedLanguage
      : "en";

    setLanguage(nextLanguage);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    document.documentElement.lang = nextLanguage;
  }, [profile?.app_language]);

  useEffect(() => {
    const profileTheme = profile?.theme_preference;
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const nextTheme = isTheme(profileTheme) ? profileTheme : isTheme(storedTheme) ? storedTheme : "system";

    setThemePreferenceState(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
  }, [profile?.theme_preference, setTheme]);

  useEffect(() => {
    const profileAccent = profile?.theme_accent_color;
    const storedAccent = localStorage.getItem(ACCENT_STORAGE_KEY);
    const nextAccent = isAccentColorId(profileAccent) ? profileAccent : isAccentColorId(storedAccent) ? storedAccent : getDefaultAccentColorId();
    setAccentColorId(nextAccent);
    localStorage.setItem(ACCENT_STORAGE_KEY, nextAccent);
  }, [profile?.theme_accent_color]);

  useEffect(() => {
    const profileBackground = profile?.theme_background_style;
    const storedBackground = localStorage.getItem(BACKGROUND_STYLE_STORAGE_KEY);
    const nextBackground = isAppBackgroundStyleId(profileBackground)
      ? profileBackground
      : isAppBackgroundStyleId(storedBackground)
        ? storedBackground
        : getDefaultBackgroundStyleId();
    setBackgroundStyleId(nextBackground);
    localStorage.setItem(BACKGROUND_STYLE_STORAGE_KEY, nextBackground);
    document.documentElement.dataset.appBg = nextBackground;
  }, [profile?.theme_background_style]);

  useEffect(() => {
    const mode = resolvedTheme === "dark" ? "dark" : "light";
    applyAccentThemeVars(accentColorId, mode);
  }, [accentColorId, resolvedTheme]);

  useEffect(() => {
    document.documentElement.dataset.appBg = backgroundStyleId;
  }, [backgroundStyleId]);

  const setLanguagePreference = async (nextLanguage: AppLanguage) => {
    setLanguage(nextLanguage);
    document.documentElement.lang = nextLanguage;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    if (!isGuest) {
      await updateProfile({ app_language: nextLanguage });
    }
  };

  const setThemePreference = async (nextTheme: ThemePreference) => {
    setThemePreferenceState(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
    if (!isGuest) {
      await updateProfile({ theme_preference: nextTheme });
    }
  };

  const setAccentColorPreference = async (nextColorId: AccentColorId) => {
    setAccentColorId(nextColorId);
    localStorage.setItem(ACCENT_STORAGE_KEY, nextColorId);
    if (!isGuest && user?.id) {
      const { error } = await supabase.from("profiles").update({ theme_accent_color: nextColorId }).eq("id", user.id);
      if (error && !isSchemaMissingError(error, "theme_accent_color")) throw error;
    }
  };

  const setBackgroundStylePreference = async (nextStyleId: AppBackgroundStyleId) => {
    setBackgroundStyleId(nextStyleId);
    localStorage.setItem(BACKGROUND_STYLE_STORAGE_KEY, nextStyleId);
    document.documentElement.dataset.appBg = nextStyleId;
    if (!isGuest && user?.id) {
      const { error } = await supabase.from("profiles").update({ theme_background_style: nextStyleId }).eq("id", user.id);
      if (error && !isSchemaMissingError(error, "theme_background_style")) throw error;
    }
  };

  const value: PreferencesContextValue = {
    language,
    themePreference,
    accentColorId,
    backgroundStyleId,
    setLanguagePreference,
    setThemePreference,
    setAccentColorPreference,
    setBackgroundStylePreference,
    t: (key) => translations[language][key] || key,
  };

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <PreferencesInnerProvider>{children}</PreferencesInnerProvider>
    </NextThemesProvider>
  );
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used inside PreferencesProvider");
  }
  return context;
};
