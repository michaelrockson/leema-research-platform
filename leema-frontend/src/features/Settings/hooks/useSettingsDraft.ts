import { useCallback, useMemo, useRef, useState } from "react";
import { settingsService } from "@/features/Settings/services/settingsService";
import { settingsStorage } from "@/features/Settings/services/settingsStorage";
import { validateSettings } from "@/features/Settings/settingsFields";
import {
  DEFAULT_SETTINGS,
  toResearchSettings,
} from "@/features/Settings/settingsDefaults";
import { useNotifications } from "@/features/Notifications/hooks/useNotifications";
import type { ResearchSettings, SettingKey } from "@/features/Settings/types";

/**
 * Keeps an editable copy of the settings. The form fills instantly from the
 * copy stored in the browser (or built-in defaults) and quietly refreshes
 * from the server when it is reachable. Nothing is written to the database
 * until `save` is called.
 */
export function useSettingsDraft() {
  const [savedSettings, setSavedSettings] = useState<ResearchSettings>(
    settingsStorage.read,
  );
  const [draft, setDraft] = useState<ResearchSettings>(savedSettings);
  const [isSaving, setIsSaving] = useState(false);
  const hasEditedRef = useRef(false);
  const { notifyError, notifySuccess, notifyInfo } = useNotifications();

  const load = useCallback(async () => {
    const storedSettings = settingsStorage.read();
    hasEditedRef.current = false;
    setSavedSettings(storedSettings);
    setDraft(storedSettings);

    try {
      const serverSettings = toResearchSettings(
        await settingsService.getSettings(),
      );
      settingsStorage.write(serverSettings);
      setSavedSettings(serverSettings);
      if (!hasEditedRef.current) setDraft(serverSettings);
    } catch {
      return;
    }
  }, []);

  const updateField = useCallback(
    <Key extends SettingKey>(key: Key, value: ResearchSettings[Key]) => {
      hasEditedRef.current = true;
      setDraft((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const errors = useMemo(() => validateSettings(draft), [draft]);
  const hasErrors = Object.keys(errors).length > 0;
  const hasChanges = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(savedSettings),
    [draft, savedSettings],
  );

  const restoreDefaults = useCallback(() => {
    hasEditedRef.current = true;
    setDraft(DEFAULT_SETTINGS);
    notifyInfo("Defaults restored. Click Save to keep them.");
  }, [notifyInfo]);

  const save = useCallback(async () => {
    if (hasErrors) return false;
    setIsSaving(true);
    try {
      const saved = toResearchSettings(
        await settingsService.saveSettings(draft),
      );
      settingsStorage.write(saved);
      setSavedSettings(saved);
      setDraft(saved);
      notifySuccess("Settings saved.");
      return true;
    } catch (error) {
      notifyError(
        error instanceof Error ? error.message : "Could not reach the server.",
        { title: "Settings not saved" },
      );
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
    isSaving,
    load,
    updateField,
    restoreDefaults,
    save,
  };
}
