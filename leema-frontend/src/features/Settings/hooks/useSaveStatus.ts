import { useState } from "react";
import { useNotifications } from "@/features/Notifications/hooks/useNotifications";

type SaveMessages = {
  /** Shown as a success pop-up when the save completes. */
  successMessage: string;
  /** Shown as the error pop-up's title when the save fails. */
  failureTitle: string;
};

export function useSaveStatus() {
  const [isSaving, setIsSaving] = useState(false);
  const { notifyError, notifySuccess } = useNotifications();

  const trackSave = async (
    saveAction: () => Promise<void>,
    { successMessage, failureTitle }: SaveMessages,
  ) => {
    setIsSaving(true);
    try {
      await saveAction();
      notifySuccess(successMessage);
    } catch (caughtError) {
      console.error(`${failureTitle}:`, caughtError);
      notifyError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not reach the server",
        { title: failureTitle },
      );
    } finally {
      setIsSaving(false);
    }
  };

  return { isSaving, trackSave };
}
