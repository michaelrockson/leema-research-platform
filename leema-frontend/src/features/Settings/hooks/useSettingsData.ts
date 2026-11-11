import { useCallback, useEffect, useState } from "react";
import {
  settingsService,
  type SettingsState,
} from "@/features/Settings/services/settingsService.ts";
import { useSaveStatus } from "@/features/Settings/hooks/useSaveStatus";

export type SettingsValues = {
  communities: string[];
  signals: string[];
  conversationsPerCommunity: number;
  repliesPerConversation: number;
};

const DEFAULT_VALUES: SettingsValues = {
  communities: [],
  signals: [],
  conversationsPerCommunity: 50,
  repliesPerConversation: 10,
};

function fromSettingsState(data: SettingsState): SettingsValues {
  return {
    communities: data.communities || [],
    signals: data.signals || [],
    conversationsPerCommunity:
      data.conversations_per_community ??
      data.conversationsPerCommunity ??
      DEFAULT_VALUES.conversationsPerCommunity,
    repliesPerConversation:
      data.replies_per_conversation ??
      data.repliesPerConversation ??
      DEFAULT_VALUES.repliesPerConversation,
  };
}

function toSettingsPayload(values: SettingsValues): Partial<SettingsState> {
  return {
    communities: values.communities,
    signals: values.signals,
    conversations_per_community: values.conversationsPerCommunity,
    replies_per_conversation: values.repliesPerConversation,
  };
}

/**
 * Loads the user's research settings from the server and saves every change
 * back automatically.
 */
export function useSettingsData() {
  const [values, setValues] = useState<SettingsValues>(DEFAULT_VALUES);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { isSaving, trackSave } = useSaveStatus();

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setValues(fromSettingsState(await settingsService.getSettings()));
    } catch (caughtError) {
      setLoadError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to load settings from server",
      );
      setValues(fromSettingsState(settingsService.getCachedSettings()));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  /** Apply `changes` locally and save the full settings to the server. */
  const saveSettings = (changes: Partial<SettingsValues>) => {
    const updatedValues = { ...values, ...changes };
    setValues(updatedValues);
    return trackSave(
      async () => {
        await settingsService.updateSettings(toSettingsPayload(updatedValues));
      },
      { successMessage: "Settings saved.", failureTitle: "Settings not saved" },
    );
  };

  const resetToDefaults = () =>
    trackSave(
      async () => {
        setValues(fromSettingsState(await settingsService.resetSettings()));
      },
      {
        successMessage: "Settings reset to defaults.",
        failureTitle: "Reset failed",
      },
    );

  return {
    values,
    isLoading,
    loadError,
    isSaving,
    saveSettings,
    resetToDefaults,
    reloadSettings: loadSettings,
  };
}
