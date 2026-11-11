export type NotificationVariant = "error" | "warning" | "success" | "info";

export type NotificationOptions = {
  /** Optional bold heading shown above the message. */
  title?: string;
  /** How long the notification stays visible before fading out. */
  durationMs?: number;
};

export type Notification = {
  id: number;
  variant: NotificationVariant;
  message: string;
  title?: string;
  durationMs: number;
  /** True while the fade-out transition plays, just before removal. */
  isLeaving: boolean;
};

export type NotifyFunction = (
  message: string,
  options?: NotificationOptions,
) => void;

export type NotificationsApi = {
  notifyError: NotifyFunction;
  notifyWarning: NotifyFunction;
  notifySuccess: NotifyFunction;
  notifyInfo: NotifyFunction;
  dismiss: (notificationId: number) => void;
};

/** A notification kept in the history list after its pop-up has gone. */
export type NotificationRecord = {
  id: number;
  variant: NotificationVariant;
  message: string;
  title?: string;
  receivedAtMs: number;
  isRead: boolean;
};

export type NotificationHistoryApi = {
  /** Most recent first. */
  history: NotificationRecord[];
  unreadCount: number;
  markAllRead: () => void;
  clearHistory: () => void;
};
