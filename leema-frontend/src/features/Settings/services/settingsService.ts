import { apiRequest } from "@/lib/apiClient";
import type { ResearchSettings } from "@/features/Settings/types";

type SettingsApiResponse = {
  success: boolean;
  message?: string;
  data: ResearchSettings;
};

function requireData(response: SettingsApiResponse | undefined) {
  if (!response?.data) {
    throw new Error("The server returned an empty settings response.");
  }
  return response.data;
}

export const settingsService = {
  async getSettings(): Promise<ResearchSettings> {
    return requireData(
      await apiRequest<SettingsApiResponse>("/api/v1/settings"),
    );
  },

  async getDefaultSettings(): Promise<ResearchSettings> {
    return requireData(
      await apiRequest<SettingsApiResponse>("/api/v1/settings/defaults"),
    );
  },

  async saveSettings(settings: ResearchSettings): Promise<ResearchSettings> {
    return requireData(
      await apiRequest<SettingsApiResponse>("/api/v1/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      }),
    );
  },
};
