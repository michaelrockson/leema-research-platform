import { X } from "lucide-react";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Notification } from "@/features/Notifications/types";
import {
  VARIANT_ICONS,
  VARIANT_TOAST_CLASSES,
} from "@/features/Notifications/variantStyles";

type NotificationToastProps = {
  notification: Notification;
  onDismiss: (notificationId: number) => void;
};

export default function NotificationToast({
  notification,
  onDismiss,
}: NotificationToastProps) {
  const { id, variant, title, message, isLeaving } = notification;
  const Icon = VARIANT_ICONS[variant];
  const isUrgent = variant === "error" || variant === "warning";

  return (
    <Alert
      // Errors and warnings interrupt screen readers; others wait their turn.
      role={isUrgent ? "alert" : "status"}
      aria-live={isUrgent ? "assertive" : "polite"}
      className={cn(
        "pointer-events-auto shadow-lg transition-all duration-300 ease-out",
        "starting:translate-y-2 starting:opacity-0",
        VARIANT_TOAST_CLASSES[variant],
        isLeaving && "translate-y-2 opacity-0",
      )}
    >
      <Icon />
      {title ? (
        <>
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription className="text-current opacity-85">
            {message}
          </AlertDescription>
        </>
      ) : (
        <AlertTitle className="font-normal">{message}</AlertTitle>
      )}
      <AlertAction>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Dismiss notification"
          className="text-current hover:bg-current/10 hover:text-current dark:hover:bg-current/10"
          onClick={() => onDismiss(id)}
        >
          <X />
        </Button>
      </AlertAction>
    </Alert>
  );
}
