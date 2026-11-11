import { useContext } from "react";
import { NotificationHistoryContext } from "@/features/Notifications/context/notificationsContext";

export function useNotificationHistory() {
  const context = useContext(NotificationHistoryContext);
  if (!context) {
    throw new Error(
      "useNotificationHistory must be used within a NotificationsProvider",
    );
  }
  return context;
}
