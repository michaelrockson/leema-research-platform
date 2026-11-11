import type { NotificationVariant } from "@/features/Notifications/types";

/** How long each kind of notification stays on screen by default. */
export const DEFAULT_DURATION_MS: Record<NotificationVariant, number> = {
  error: 7000,
  warning: 6000,
  success: 5000,
  info: 5000,
};

/** Keep in sync with the `duration-300` transition on NotificationToast. */
export const FADE_OUT_DURATION_MS = 300;

/** Oldest notifications are dropped once more than this are on screen. */
export const MAX_VISIBLE_NOTIFICATIONS = 4;

/** How many past notifications the bell keeps. */
export const MAX_HISTORY_ENTRIES = 20;
