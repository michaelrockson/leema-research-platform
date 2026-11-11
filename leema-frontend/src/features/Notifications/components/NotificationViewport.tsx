import NotificationToast from "@/features/Notifications/components/NotificationToast";
import type { Notification } from "@/features/Notifications/types";

type NotificationViewportProps = {
  notifications: Notification[];
  onDismiss: (notificationId: number) => void;
};

/** Fixed stack in the bottom-right corner where pop-up notifications appear. */
export default function NotificationViewport({
  notifications,
  onDismiss,
}: NotificationViewportProps) {
  return (
    <div
      aria-label="Notifications"
      className="pointer-events-none fixed right-4 bottom-4 left-4 z-100 flex flex-col items-stretch gap-2 sm:left-auto sm:w-96"
    >
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}
