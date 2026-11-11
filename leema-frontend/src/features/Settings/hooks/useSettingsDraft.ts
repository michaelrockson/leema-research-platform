import { useCallback, useMemo, useState } from "react";
import { settingsService } from "@/features/Settings/services/settingsService";
import { validateSettings } from "@/features/Settings/settingsFields";
import { useNotifications } from "@/features/Notifications/hooks/useNotifications";
import type { ResearchSettings, SettingKey } from "@/features/Settings/types";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Keeps an editable copy of the saved settings. Nothing is written to the
 * database until `save` is called.
 */
export function useSettingsDraft() {
  const [savedSettings, setSavedSettings] = useState<ResearchSettings | null>(
    null,
  );
  const [draft, setDraft] = useState<ResearchSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoringDefaults, setIsRestoringDefaults] = useState(false);
  const { notifyError, notifySuccess, notifyInfo } = useNotifications();

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const settings = await settingsService.getSettings();
      setSavedSettings(settings);
      setDraft(settings);
    } catch (error) {
      setLoadError(errorMessage(error, "Couldn't load settings."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateField = useCallback(
    <Key extends SettingKey>(key: Key, value: ResearchSettings[Key]) => {
      setDraft((current) => (current ? { ...current, [key]: value } : current));
    },
    [],
  );

  const errors = useMemo(() => (draft ? validateSettings(draft) : {}), [draft]);
  const hasErrors = Object.keys(errors).length > 0;
  const hasChanges = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(savedSettings),
    [draft, savedSettings],
  );

  const discardChanges = useCallback(() => {
    setDraft(savedSettings);
  }, [savedSettings]);

  const restoreDefaults = useCallback(async () => {
    setIsRestoringDefaults(true);
    try {
      setDraft(await settingsService.getDefaultSettings());
      notifyInfo("Defaults restored. Click Save to keep them.");
    } catch (error) {
      notifyError(errorMessage(error, "Could not reach the server."), {
        title: "Couldn't load the defaults",
      });
    } finally {
      setIsRestoringDefaults(false);
    }
  }, [notifyError, notifyInfo]);

  const save = useCallback(async () => {
    if (!draft || hasErrors) return false;
    setIsSaving(true);
    try {
      const saved = await settingsService.saveSettings(draft);
      setSavedSettings(saved);
      setDraft(saved);
      notifySuccess("Settings saved.");
      return true;
    } catch (error) {
      notifyError(errorMessage(error, "Could not reach the server."), {
        title: "Settings not saved",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [draft, hasErrors, notifyError, notifySuccess]);

  return {
    draft,
    errors,
    hasErrors,
    hasChanges,
    isLoading,
    loadError,
    isSaving,
    isRestoringDefaults,
    load,
    updateField,
    discardChanges,
    restoreDefaults,
    save,
  };
}
