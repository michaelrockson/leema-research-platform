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

function normalizeSettings(data: SettingsState): SettingsState {
  const conv =
    data.conversations_per_community ?? data.conversationsPerCommunity ?? 50;
  const rep =
    data.replies_per_conversation ?? data.repliesPerConversation ?? 10;

  return {
    id: data.id,
    communities: data.communities || [],
    signals: data.signals || [],
    conversations_per_community: conv,
    replies_per_conversation: rep,
    conversationsPerCommunity: conv,
    repliesPerConversation: rep,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

function requireData(response: SettingsApiResponse | undefined): SettingsState {
  if (!response || !response.data) {
    throw new Error("Server returned an empty settings response");
  }
  return normalizeSettings(response.data);
}

export const settingsService = {
  async fetchSettings(): Promise<SettingsState> {
    return this.getSettings();
  },

  async getSettings(): Promise<SettingsState> {
    const response = await apiRequest<SettingsApiResponse>("/api/v1/settings");
    const normalized = requireData(response);
    this.cacheSettings(normalized);
    return normalized;
  },

  async getSettingsOrCached(): Promise<SettingsState> {
    try {
      return await this.getSettings();
    } catch (error) {
      console.warn(
        "Failed to fetch settings from API, using cached/defaults:",
        error,
      );
      return this.getCachedSettings();
    }
  },

  async updateSettings(
    updates: Partial<SettingsState>,
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

    const response = await apiRequest<SettingsApiResponse>("/api/v1/settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    const normalized = requireData(response);
    this.cacheSettings(normalized);
    return normalized;
  },

  async resetSettings(): Promise<SettingsState> {
    const response = await apiRequest<SettingsApiResponse>(
      "/api/v1/settings/reset",
      {
        method: "POST",
      },
    );
    const normalized = requireData(response);
    this.cacheSettings(normalized);
    return normalized;
  },

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

  cacheSettings(settings: SettingsState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore
    }
  },
};
