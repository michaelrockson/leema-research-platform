import { useEffect } from "react";

function isDarkThemeTime(date: Date): boolean {
  const hour = date.getHours();
  return hour < 9 || hour >= 17;
}

export default function useScheduledTheme(): void {
  useEffect(() => {
    let timeoutId: number;

    const syncTheme = () => {
      window.clearTimeout(timeoutId);

      const now = new Date();
      const isDark = isDarkThemeTime(now);
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";

      const nextTransition = new Date(now);
      if (now.getHours() < 9) {
        nextTransition.setHours(9, 0, 0, 0);
      } else if (now.getHours() < 17) {
        nextTransition.setHours(17, 0, 0, 0);
      } else {
        nextTransition.setDate(nextTransition.getDate() + 1);
        nextTransition.setHours(9, 0, 0, 0);
      }

      timeoutId = window.setTimeout(
        syncTheme,
        nextTransition.getTime() - now.getTime()
      );
    };

    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") {
        syncTheme();
      }
    };

    syncTheme();
    window.addEventListener("focus", syncTheme);
    document.addEventListener("visibilitychange", syncWhenVisible);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("focus", syncTheme);
      document.removeEventListener("visibilitychange", syncWhenVisible);
      document.documentElement.classList.remove("dark");
      document.documentElement.style.removeProperty("color-scheme");
    };
  }, []);
}
