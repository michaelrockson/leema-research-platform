import { useState } from "react";

const defaultSettings = [
  "sales",
  "logistics",
  "smallbusiness",
  "marketing",
  "freelance",
  "supplychain",
  "ecommerce",
  "entrepreneur",
  "startups",
  "procurement",
  "retail",
  "manufacturing",
  "consulting",
];

const defaultSignals = [
  "tired of",
  "frustrated",
  "annoying",
  "hate",
  "nightmare",
  "painful",
  "struggling with",
  "fed up",
  "overwhelmed",
  "burned out",
  "stressful",
  "time consuming",
  "manual process",
  "repetitive",
  "tedious",
  "inefficient",
  "disorganized",
  "messy",
  "confusing",
];

export default function useSettings() {
  const [communities, setCommunities] = useState(defaultSettings);
  const [signals, setSignals] = useState(defaultSignals);

  const [communityInput, setCommunityInput] = useState("");
  const [signalInput, setSignalInput] = useState("");

  const [communityError, setCommunityError] = useState<string | null>(null);
  const [signalError, setSignalError] = useState<string | null>(null);

  const addCommunity = () => {
    const value = communityInput.trim();

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
