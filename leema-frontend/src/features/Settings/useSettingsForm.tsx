import { useState, useEffect } from "react";
import { settingsService } from "@/features/Settings/services/settingsService";

export default function useSettings() {
  const [communities, setCommunities] = useState<string[]>(() => {
    return settingsService.getSettings().communities;
  });
  const [signals, setSignals] = useState<string[]>(() => {
    return settingsService.getSettings().signals;
  });

  const [communityInput, setCommunityInput] = useState("");
  const [signalInput, setSignalInput] = useState("");

  const [communityError, setCommunityError] = useState<string | null>(null);
  const [signalError, setSignalError] = useState<string | null>(null);

  useEffect(() => {
    settingsService.saveSettings({ communities, signals });
  }, [communities, signals]);

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

    setCommunities((prev) => [...prev, value]);
    setCommunityInput("");
    setCommunityError(null);
  };

  const removeCommunity = (index: number) => {
    setCommunities((prev) =>
      prev.filter((_, currentIndex) => currentIndex !== index),
    );
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

    setSignals((prev) => [...prev, value]);
    setSignalInput("");
    setSignalError(null);
  };

  const removeSignal = (index: number) => {
    setSignals((prev) =>
      prev.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  return {
    communities,
    signals,
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
  };
}
