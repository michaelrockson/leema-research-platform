import { useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useNotificationHistory } from "@/features/Notifications/hooks/useNotificationHistory";
import { formatRelativeTime } from "@/features/Notifications/utils/formatRelativeTime";
import {
  VARIANT_ICONS,
  VARIANT_ICON_CLASSES,
} from "@/features/Notifications/variantStyles";
import type { NotificationRecord } from "@/features/Notifications/types";

const MAX_BADGE_COUNT = 9;

/** Header button that opens a list of recently received notifications. */
export default function NotificationBell() {
  const { history, unreadCount, markAllRead, clearHistory } =
    useNotificationHistory();
  // Captured when the popover opens so "5 minutes ago" is stable while open.
  const [openedAtMs, setOpenedAtMs] = useState(0);

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setOpenedAtMs(Date.now());
    } else {
      // Mark read on close so unread items stay highlighted while viewing.
      markAllRead();
    }
  };

  const buttonLabel =
    unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications";

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            className="relative size-10 rounded-lg"
            aria-label={buttonLabel}
            title="Notifications"
          />
        }
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] leading-none font-semibold text-white"
          >
            {unreadCount > MAX_BADGE_COUNT
              ? `${MAX_BADGE_COUNT}+`
              : unreadCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0 sm:w-96">
        <div className="flex items-center justify-between border-b border-foreground/10 px-4 py-3">
          <PopoverTitle>Notifications</PopoverTitle>
          {history.length > 0 && (
            <Button
              variant="ghost"
              size="xs"
              className="text-muted-foreground"
              onClick={clearHistory}
            >
              Clear all
            </Button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
            <BellOff className="size-5" aria-hidden="true" />
            No notifications yet
          </div>
        ) : (
          <ul className="max-h-96 divide-y divide-foreground/10 overflow-y-auto">
            {history.map((record) => (
              <NotificationHistoryItem
                key={record.id}
                record={record}
                nowMs={openedAtMs}
              />
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

function NotificationHistoryItem({
  record,
  nowMs,
}: {
  record: NotificationRecord;
  nowMs: number;
}) {
  const Icon = VARIANT_ICONS[record.variant];

  return (
    <li
      className={cn(
        "flex gap-3 px-4 py-3 text-sm",
        !record.isRead && "bg-muted/60",
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "mt-0.5 size-4 shrink-0",
          VARIANT_ICON_CLASSES[record.variant],
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {record.title && <span className="font-medium">{record.title}</span>}
        <span
          className={cn(
            "break-words",
            record.title ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {record.message}
        </span>
        <time
          dateTime={new Date(record.receivedAtMs).toISOString()}
          className="text-xs text-muted-foreground"
        >
          {formatRelativeTime(record.receivedAtMs, nowMs)}
        </time>
      </div>
      {!record.isRead && (
        <span
          aria-label="Unread"
          className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-600"
        />
      )}
    </li>
  );
}
