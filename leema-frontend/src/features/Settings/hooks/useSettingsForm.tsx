import { useState, useEffect, useCallback, useRef } from "react";
import { settingsService } from "@/features/Settings/services/settingsService.ts";
import type { SettingsState } from "@/features/Settings/services/settingsService.ts";

export default function useSettings() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [communities, setCommunities] = useState<string[]>([]);
  const [signals, setSignals] = useState<string[]>([]);
  const [conversationsPerCommunity, setConversationsPerCommunity] =
    useState<number>(50);
  const [repliesPerConversation, setRepliesPerConversation] =
    useState<number>(10);

  const [communityInput, setCommunityInput] = useState("");
  const [signalInput, setSignalInput] = useState("");

  const [communityError, setCommunityError] = useState<string | null>(null);
  const [signalError, setSignalError] = useState<string | null>(null);

  // Fetch settings from the backend via settingsService before component renders dynamic data
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await settingsService.getSettings();
      setCommunities(data.communities || []);
      setSignals(data.signals || []);
      setConversationsPerCommunity(
        data.conversations_per_community ??
          data.conversationsPerCommunity ??
          50,
      );
      setRepliesPerConversation(
        data.replies_per_conversation ?? data.repliesPerConversation ?? 10,
      );
    } catch (caughtError) {
      const errorMessage =
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to load settings from server";
      setError(errorMessage);
      // Fall back to cached local settings
      const cached = settingsService.getCachedSettings();
      setCommunities(cached.communities);
      setSignals(cached.signals);
      setConversationsPerCommunity(cached.conversations_per_community);
      setRepliesPerConversation(cached.replies_per_conversation);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Show the "Saved" indicator briefly; a newer save restarts the timer
  const flashSaveSuccess = () => {
    setSaveSuccess(true);
    if (saveSuccessTimer.current) clearTimeout(saveSuccessTimer.current);
    saveSuccessTimer.current = setTimeout(() => setSaveSuccess(false), 2500);
  };

  useEffect(() => {
    return () => {
      if (saveSuccessTimer.current) clearTimeout(saveSuccessTimer.current);
    };
  }, []);

  // Persist settings changes through the settings service to the backend
  const persistChanges = async (updates: Partial<SettingsState>) => {
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    try {
      await settingsService.updateSettings(updates);
      flashSaveSuccess();
    } catch (caughtError) {
      console.error("Failed to save settings to server:", caughtError);
      setSaveError(
        caughtError instanceof Error
          ? `Not saved: ${caughtError.message}`
          : "Not saved: could not reach the server",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const addCommunity = () => {
    const value = communityInput.trim().replace(/^r\//, "");

    if (!value) {
      setCommunityError("Community cannot be empty!");
      return;
    }

    if (communities.includes(value)) {
      setCommunityError("This community is already added!");
      return;
    }

    const updated = [...communities, value];
    setCommunities(updated);
    setCommunityInput("");
    setCommunityError(null);
    persistChanges({
      communities: updated,
      signals,
      conversations_per_community: conversationsPerCommunity,
      replies_per_conversation: repliesPerConversation,
    });
  };

  const removeCommunity = (index: number) => {
    const updated = communities.filter((_, communityIndex) => communityIndex !== index);
    setCommunities(updated);
    persistChanges({
      communities: updated,
      signals,
      conversations_per_community: conversationsPerCommunity,
      replies_per_conversation: repliesPerConversation,
    });
  };

  const addSignal = () => {
    const value = signalInput.trim();

    if (!value) {
      setSignalError("Signal cannot be empty!");
      return;
    }

    if (signals.includes(value)) {
      setSignalError("This signal is already added!");
      return;
    }

    const updated = [...signals, value];
    setSignals(updated);
    setSignalInput("");
    setSignalError(null);
    persistChanges({
      communities,
      signals: updated,
      conversations_per_community: conversationsPerCommunity,
      replies_per_conversation: repliesPerConversation,
    });
  };

  const removeSignal = (index: number) => {
    const updated = signals.filter((_, signalIndex) => signalIndex !== index);
    setSignals(updated);
    persistChanges({
      communities,
      signals: updated,
      conversations_per_community: conversationsPerCommunity,
      replies_per_conversation: repliesPerConversation,
    });
  };

  const updateConversationsPerCommunity = (value: number) => {
    setConversationsPerCommunity(value);
    persistChanges({
      communities,
      signals,
      conversations_per_community: value,
      replies_per_conversation: repliesPerConversation,
    });
  };

  const updateRepliesPerConversation = (value: number) => {
    setRepliesPerConversation(value);
    persistChanges({
      communities,
      signals,
      conversations_per_community: conversationsPerCommunity,
      replies_per_conversation: value,
    });
  };

  const resetToDefaults = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const reset = await settingsService.resetSettings();
      setCommunities(reset.communities);
      setSignals(reset.signals);
      setConversationsPerCommunity(reset.conversations_per_community);
      setRepliesPerConversation(reset.replies_per_conversation);
      flashSaveSuccess();
    } catch (caughtError) {
      console.error("Failed to reset settings on server:", caughtError);
      setSaveError(
        caughtError instanceof Error
          ? `Reset failed: ${caughtError.message}`
          : "Reset failed: could not reach the server",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isLoading,
    isSaving,
    saveSuccess,
    saveError,
    error,
    communities,
    signals,
    conversationsPerCommunity,
    repliesPerConversation,
    communityInput,
    signalInput,
    communityError,
    signalError,
    setCommunityInput,
    setSignalInput,
    setCommunityError,
    setSignalError,
    addCommunity,
    removeCommunity,
    addSignal,
    removeSignal,
    updateConversationsPerCommunity,
    updateRepliesPerConversation,
    resetToDefaults,
    reloadSettings: loadSettings,
  };
}
