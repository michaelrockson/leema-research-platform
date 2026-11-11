import { useSettingsData } from "@/features/Settings/hooks/useSettingsData";
import { useTagListInput } from "@/features/Settings/hooks/useTagListInput";

export default function useSettings() {
  const settings = useSettingsData();
  const { communities, signals, conversationsPerCommunity, repliesPerConversation } =
    settings.values;

  const communityField = useTagListInput({
    items: communities,
    onItemsChange: (updatedCommunities) =>
      settings.saveSettings({ communities: updatedCommunities }),
    emptyMessage: "Community cannot be empty!",
    duplicateMessage: "This community is already added!",
    normalize: (rawValue) => rawValue.trim().replace(/^r\//, ""),
  });

  const signalField = useTagListInput({
    items: signals,
    onItemsChange: (updatedSignals) =>
      settings.saveSettings({ signals: updatedSignals }),
    emptyMessage: "Signal cannot be empty!",
    duplicateMessage: "This signal is already added!",
  });

  return {
    isLoading: settings.isLoading,
    isSaving: settings.isSaving,
    error: settings.loadError,
    communities,
    signals,
    conversationsPerCommunity,
    repliesPerConversation,
    communityInput: communityField.input,
    signalInput: signalField.input,
    communityError: communityField.error,
    signalError: signalField.error,
    setCommunityInput: communityField.setInput,
    setSignalInput: signalField.setInput,
    setCommunityError: communityField.setError,
    setSignalError: signalField.setError,
    addCommunity: communityField.add,
    removeCommunity: communityField.remove,
    addSignal: signalField.add,
    removeSignal: signalField.remove,
    updateConversationsPerCommunity: (value: number) =>
      settings.saveSettings({ conversationsPerCommunity: value }),
    updateRepliesPerConversation: (value: number) =>
      settings.saveSettings({ repliesPerConversation: value }),
    resetToDefaults: settings.resetToDefaults,
    reloadSettings: settings.reloadSettings,
  };
}
