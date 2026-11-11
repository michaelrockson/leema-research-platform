import { toResearchSettings } from "@/features/Settings/settingsDefaults";
import type { ResearchSettings } from "@/features/Settings/types";

const STORAGE_KEY = "leema_settings";

export const settingsStorage = {
  read(): ResearchSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return toResearchSettings(stored ? JSON.parse(stored) : null);
    } catch {
      return toResearchSettings(null);
    }
  },

  write(settings: ResearchSettings): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      return;
    }
  },
};
