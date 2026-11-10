import { apiRequest } from "@/lib/apiClient";

export type SettingsState = {
  id?: number;
  communities: string[];
  signals: string[];
  conversations_per_community: number;
  replies_per_conversation: number;
  conversationsPerCommunity?: number;
  repliesPerConversation?: number;
  created_at?: string;
  updated_at?: string;
};

export type SettingsApiResponse = {
  success: boolean;
  message?: string;
  data: SettingsState;
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
  conversations_per_community: 50,
  replies_per_conversation: 10,
  conversationsPerCommunity: 50,
  repliesPerConversation: 10,
};

export const settingsService = {
  /**
   * Alias for getSettings().
   */
  async fetchSettings(): Promise<SettingsState> {
    return this.getSettings();
  },

  /**
   * Fetch settings from the backend API (/api/v1/settings).
   * Caches response in localStorage and returns normalized SettingsState.
   */
  async getSettings(): Promise<SettingsState> {
    try {
      const response = await apiRequest<SettingsApiResponse>("/api/v1/settings");
      if (response && response.data) {
        const conv =
          response.data.conversations_per_community ??
          response.data.conversationsPerCommunity ??
          50;
        const rep =
          response.data.replies_per_conversation ??
          response.data.repliesPerConversation ??
          10;

        const normalized: SettingsState = {
          id: response.data.id,
          communities: response.data.communities || [],
          signals: response.data.signals || [],
          conversations_per_community: conv,
          replies_per_conversation: rep,
          conversationsPerCommunity: conv,
          repliesPerConversation: rep,
          created_at: response.data.created_at,
          updated_at: response.data.updated_at,
        };
        this.cacheSettings(normalized);
        return normalized;
      }
    } catch (err) {
      console.warn(
        "Failed to fetch settings from API, using cached/defaults:",
        err
      );
    }
    return this.getCachedSettings();
  },

  /**
   * Update settings via PUT /api/v1/settings.
   */
  async updateSettings(
    updates: Partial<SettingsState>
  ): Promise<SettingsState> {
    const payload = {
      communities: updates.communities,
      signals: updates.signals,
      conversations_per_community:
        updates.conversations_per_community ??
        updates.conversationsPerCommunity,
      replies_per_conversation:
        updates.replies_per_conversation ?? updates.repliesPerConversation,
    };

    try {
      const response = await apiRequest<SettingsApiResponse>(
        "/api/v1/settings",
        {
          method: "PUT",
          body: JSON.stringify(payload),
        }
      );
      if (response && response.data) {
        const conv =
          response.data.conversations_per_community ??
          response.data.conversationsPerCommunity ??
          50;
        const rep =
          response.data.replies_per_conversation ??
          response.data.repliesPerConversation ??
          10;

        const normalized: SettingsState = {
          id: response.data.id,
          communities: response.data.communities || [],
          signals: response.data.signals || [],
          conversations_per_community: conv,
          replies_per_conversation: rep,
          conversationsPerCommunity: conv,
          repliesPerConversation: rep,
        };
        this.cacheSettings(normalized);
        return normalized;
      }
    } catch (err) {
      console.error("Failed to update settings on server:", err);
    }

    // Fallback: update local cache
    const current = this.getCachedSettings();
    const merged = { ...current, ...updates };
    this.cacheSettings(merged);
    return merged;
  },

  /**
   * Reset settings to factory defaults via POST /api/v1/settings/reset.
   */
  async resetSettings(): Promise<SettingsState> {
    try {
      const response = await apiRequest<SettingsApiResponse>(
        "/api/v1/settings/reset",
        {
          method: "POST",
        }
      );
      if (response && response.data) {
        this.cacheSettings(response.data);
        return response.data;
      }
    } catch (err) {
      console.error("Failed to reset settings via API:", err);
    }
    this.cacheSettings(defaultSettings);
    return defaultSettings;
  },

  /**
   * Get cached settings synchronously from localStorage.
   */
  getCachedSettings(): SettingsState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const conv =
          parsed.conversations_per_community ??
          parsed.conversationsPerCommunity ??
          50;
        const rep =
          parsed.replies_per_conversation ??
          parsed.repliesPerConversation ??
          10;
        return {
          ...defaultSettings,
          ...parsed,
          conversations_per_community: conv,
          replies_per_conversation: rep,
          conversationsPerCommunity: conv,
          repliesPerConversation: rep,
        };
      }
    } catch {
      // Fallback
    }
    return defaultSettings;
  },

  /**
   * Write to localStorage cache.
   */
  cacheSettings(settings: SettingsState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore
    }
  },
};
