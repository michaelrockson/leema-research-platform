import { useCallback, useEffect, useRef, useState } from "react";

export default function useFlashFlag(durationMs: number) {
  const [isOn, setIsOn] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const flash = useCallback(() => {
    setIsOn(true);
    clearTimer();
    timerRef.current = setTimeout(() => setIsOn(false), durationMs);
  }, [durationMs]);

  const reset = useCallback(() => {
    clearTimer();
    setIsOn(false);
  }, []);

  useEffect(() => clearTimer, []);

  return { isOn, flash, reset };
}
