import React, { createContext, useContext, useEffect, useState } from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";

import { useAuth } from "@/context/AuthContext";
import { AppLanguage, translations, TranslationKey } from "@/i18n/translations";
import {
  AccentColorId,
  applyAccentThemeVars,
  getDefaultAccentColorId,
  isAccentColorId,
} from "@/theme/accentPalette";

export type ThemePreference = "light" | "dark" | "system";

type PreferencesContextValue = {
  language: AppLanguage;
  themePreference: ThemePreference;
  accentColorId: AccentColorId;
  setLanguagePreference: (language: AppLanguage) => Promise<void>;
  setThemePreference: (theme: ThemePreference) => Promise<void>;
  setAccentColorPreference: (colorId: AccentColorId) => Promise<void>;
  t: (key: TranslationKey) => string;
};

const LANGUAGE_STORAGE_KEY = "appfit_language";
const THEME_STORAGE_KEY = "appfit_theme_preference";
const ACCENT_STORAGE_KEY = "appfit_accent_color";

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

const isLanguage = (value: string | null | undefined): value is AppLanguage => value === "en" || value === "es";
const isTheme = (value: string | null | undefined): value is ThemePreference =>
  value === "light" || value === "dark" || value === "system";

const PreferencesInnerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, updateProfile, isGuest } = useAuth();
  const { setTheme, resolvedTheme } = useTheme();

  const [language, setLanguage] = useState<AppLanguage>("en");
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system");
  const [accentColorId, setAccentColorId] = useState<AccentColorId>(getDefaultAccentColorId());

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
    const storedAccent = localStorage.getItem(ACCENT_STORAGE_KEY);
    const nextAccent = isAccentColorId(storedAccent) ? storedAccent : getDefaultAccentColorId();
    setAccentColorId(nextAccent);
    localStorage.setItem(ACCENT_STORAGE_KEY, nextAccent);
  }, []);

  useEffect(() => {
    const mode = resolvedTheme === "dark" ? "dark" : "light";
    applyAccentThemeVars(accentColorId, mode);
  }, [accentColorId, resolvedTheme]);

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
  };

  const value: PreferencesContextValue = {
    language,
    themePreference,
    accentColorId,
    setLanguagePreference,
    setThemePreference,
    setAccentColorPreference,
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
