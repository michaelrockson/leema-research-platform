import { useState } from "react";

type TagListInputOptions = {
  items: string[];
  onItemsChange: (updatedItems: string[]) => void;
  emptyMessage: string;
  duplicateMessage: string;
  normalize?: (rawValue: string) => string;
};

export function useTagListInput({
  items,
  onItemsChange,
  emptyMessage,
  duplicateMessage,
  normalize = (rawValue) => rawValue.trim(),
}: TagListInputOptions) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const value = normalize(input);

    if (!value) {
      setError(emptyMessage);
      return;
    }

    if (items.includes(value)) {
      setError(duplicateMessage);
      return;
    }

    onItemsChange([...items, value]);
    setInput("");
    setError(null);
  };

  const remove = (index: number) => {
    onItemsChange(items.filter((_, itemIndex) => itemIndex !== index));
  };

  return { input, setInput, error, setError, add, remove };
}
