export type SettingsState = {
  communities: string[];
  signals: string[];
};

const STORAGE_KEY = "leema_settings";

export const defaultSettings: SettingsState = {
  communities: [
    "accounting",
    "bookkeeping",
    "smallbusiness",
    "ecommerce",
    "sales",
  ],
  signals: [
    "tired of",
    "frustrated",
    "annoying",
    "hate",
    "nightmare",
    "painful",
    "struggling with",
    "fed up",
    "manual process",
  ],
};

export const settingsService = {
  getSettings(): SettingsState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as SettingsState;
      }
    } catch {
      // Fallback on error
    }
    return defaultSettings;
  },

  saveSettings(settings: SettingsState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore write error
    }
  },
};
