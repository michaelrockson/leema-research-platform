import { useCallback, useEffect, useState } from "react";

type ThemeName = "light" | "dark";

type ThemeOverride = {
  theme: ThemeName;
  // The override lapses at the next scheduled switch, so the time-of-day
  // schedule takes over again on its own.
  expiresAt: number;
};

const THEME_OVERRIDE_STORAGE_KEY = "leema-theme-override";

function isDarkThemeTime(date: Date): boolean {
  const hour = date.getHours();
  return hour < 9 || hour >= 17;
}

function getNextTransition(now: Date): Date {
  const nextTransition = new Date(now);
  if (now.getHours() < 9) {
    nextTransition.setHours(9, 0, 0, 0);
  } else if (now.getHours() < 17) {
    nextTransition.setHours(17, 0, 0, 0);
  } else {
    nextTransition.setDate(nextTransition.getDate() + 1);
    nextTransition.setHours(9, 0, 0, 0);
  }
  return nextTransition;
}

function readThemeOverride(): ThemeOverride | null {
  try {
    const storedValue = window.localStorage.getItem(THEME_OVERRIDE_STORAGE_KEY);
    if (!storedValue) return null;
    const themeOverride = JSON.parse(storedValue) as ThemeOverride;
    if (themeOverride.expiresAt <= Date.now()) {
      window.localStorage.removeItem(THEME_OVERRIDE_STORAGE_KEY);
      return null;
    }
    return themeOverride;
  } catch {
    return null;
  }
}

function writeThemeOverride(themeOverride: ThemeOverride) {
  try {
    window.localStorage.setItem(
      THEME_OVERRIDE_STORAGE_KEY,
      JSON.stringify(themeOverride),
    );
  } catch {
    // Storage can be unavailable (private mode); the toggle still works
    // for this visit.
  }
}

/**
 * Dark theme from 17:00 to 09:00, light otherwise. `toggleTheme` overrides
 * the schedule until its next switch.
 */
export default function useScheduledTheme() {
  const [scheduledIsDark, setScheduledIsDark] = useState(() =>
    isDarkThemeTime(new Date()),
  );
  const [themeOverride, setThemeOverride] = useState(readThemeOverride);

  useEffect(() => {
    let timeoutId: number;

    const scheduleNextSync = () => {
      window.clearTimeout(timeoutId);
      const now = new Date();
      timeoutId = window.setTimeout(
        syncTheme,
        getNextTransition(now).getTime() - now.getTime(),
      );
    };

    const syncTheme = () => {
      setScheduledIsDark(isDarkThemeTime(new Date()));
      setThemeOverride(readThemeOverride());
      scheduleNextSync();
    };

    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") {
        syncTheme();
      }
    };

    scheduleNextSync();
    window.addEventListener("focus", syncTheme);
    document.addEventListener("visibilitychange", syncWhenVisible);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("focus", syncTheme);
      document.removeEventListener("visibilitychange", syncWhenVisible);
    };
  }, []);

  const isDark = themeOverride
    ? themeOverride.theme === "dark"
    : scheduledIsDark;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    const nextOverride: ThemeOverride = {
      theme: isDark ? "light" : "dark",
      expiresAt: getNextTransition(new Date()).getTime(),
    };
    writeThemeOverride(nextOverride);
    setThemeOverride(nextOverride);
  }, [isDark]);

  return { isDark, toggleTheme };
}
