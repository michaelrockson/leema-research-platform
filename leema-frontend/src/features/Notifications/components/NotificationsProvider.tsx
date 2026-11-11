import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import NotificationViewport from "@/features/Notifications/components/NotificationViewport";
import {
  NotificationHistoryContext,
  NotificationsContext,
} from "@/features/Notifications/context/notificationsContext";
import {
  DEFAULT_DURATION_MS,
  FADE_OUT_DURATION_MS,
  MAX_HISTORY_ENTRIES,
  MAX_VISIBLE_NOTIFICATIONS,
} from "@/features/Notifications/constants";
import type {
  Notification,
  NotificationHistoryApi,
  NotificationOptions,
  NotificationRecord,
  NotificationsApi,
  NotificationVariant,
} from "@/features/Notifications/types";

/**
 * Holds the list of pop-up notifications and renders them in a fixed
 * viewport. Each notification fades out by itself once its duration ends.
 */
export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [history, setHistory] = useState<NotificationRecord[]>([]);
  // Mirror of `notifications` so callbacks can read the latest list without
  // doing side effects (timers) inside a state updater.
  const notificationsRef = useRef<Notification[]>([]);
  const nextIdRef = useRef(1);
  const timersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const commit = useCallback((updated: Notification[]) => {
    notificationsRef.current = updated;
    setNotifications(updated);
  }, []);

  const clearTimer = useCallback((notificationId: number) => {
    clearTimeout(timersRef.current.get(notificationId));
    timersRef.current.delete(notificationId);
  }, []);

  const setTimer = useCallback(
    (notificationId: number, callback: () => void, delayMs: number) => {
      clearTimer(notificationId);
      timersRef.current.set(notificationId, setTimeout(callback, delayMs));
    },
    [clearTimer],
  );

  const remove = useCallback(
    (notificationId: number) => {
      clearTimer(notificationId);
      commit(
        notificationsRef.current.filter(
          (notification) => notification.id !== notificationId,
        ),
      );
    },
    [clearTimer, commit],
  );

  /** Start the fade-out, then remove the notification once it has faded. */
  const dismiss = useCallback(
    (notificationId: number) => {
      commit(
        notificationsRef.current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, isLeaving: true }
            : notification,
        ),
      );
      setTimer(
        notificationId,
        () => remove(notificationId),
        FADE_OUT_DURATION_MS,
      );
    },
    [commit, remove, setTimer],
  );

  const notify = useCallback(
    (
      variant: NotificationVariant,
      message: string,
      options: NotificationOptions = {},
    ) => {
      const durationMs = options.durationMs ?? DEFAULT_DURATION_MS[variant];
      const current = notificationsRef.current;

      // Same message already on screen: restart its timer instead of stacking
      // duplicates (e.g. repeated autosave failures).
      const duplicate = current.find(
        (notification) =>
          notification.variant === variant &&
          notification.message === message &&
          !notification.isLeaving,
      );
      if (duplicate) {
        setTimer(duplicate.id, () => dismiss(duplicate.id), durationMs);
        // Move the matching history entry back to the top as unread.
        setHistory((currentHistory) => {
          const existing = currentHistory.find(
            (record) => record.id === duplicate.id,
          );
          if (!existing) return currentHistory;
          return [
            { ...existing, receivedAtMs: Date.now(), isRead: false },
            ...currentHistory.filter((record) => record.id !== duplicate.id),
          ];
        });
        return;
      }

      const notificationId = nextIdRef.current++;
      const added: Notification = {
        id: notificationId,
        variant,
        message,
        title: options.title,
        durationMs,
        isLeaving: false,
      };

      const updated = [...current, added];
      const overflowCount = Math.max(
        updated.length - MAX_VISIBLE_NOTIFICATIONS,
        0,
      );
      updated
        .slice(0, overflowCount)
        .forEach((dropped) => clearTimer(dropped.id));

      commit(updated.slice(overflowCount));
      setTimer(notificationId, () => dismiss(notificationId), durationMs);

      const record: NotificationRecord = {
        id: notificationId,
        variant,
        message,
        title: options.title,
        receivedAtMs: Date.now(),
        isRead: false,
      };
      setHistory((currentHistory) =>
        [record, ...currentHistory].slice(0, MAX_HISTORY_ENTRIES),
      );
    },
    [clearTimer, commit, dismiss, setTimer],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, []);

  const api = useMemo<NotificationsApi>(
    () => ({
      notifyError: (message, options) => notify("error", message, options),
      notifyWarning: (message, options) => notify("warning", message, options),
      notifySuccess: (message, options) => notify("success", message, options),
      notifyInfo: (message, options) => notify("info", message, options),
      dismiss,
    }),
    [notify, dismiss],
  );

  const markAllRead = useCallback(() => {
    setHistory((currentHistory) =>
      currentHistory.some((record) => !record.isRead)
        ? currentHistory.map((record) => ({ ...record, isRead: true }))
        : currentHistory,
    );
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  const historyApi = useMemo<NotificationHistoryApi>(
    () => ({
      history,
      unreadCount: history.filter((record) => !record.isRead).length,
      markAllRead,
      clearHistory,
    }),
    [history, markAllRead, clearHistory],
  );

  return (
    <NotificationsContext.Provider value={api}>
      <NotificationHistoryContext.Provider value={historyApi}>
        {children}
        <NotificationViewport
          notifications={notifications}
          onDismiss={dismiss}
        />
      </NotificationHistoryContext.Provider>
    </NotificationsContext.Provider>
  );
}
