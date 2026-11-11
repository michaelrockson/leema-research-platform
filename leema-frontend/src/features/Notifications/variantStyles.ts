import {
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { NotificationVariant } from "@/features/Notifications/types";

export const VARIANT_ICONS: Record<NotificationVariant, LucideIcon> = {
  error: CircleAlert,
  warning: TriangleAlert,
  success: CircleCheck,
  info: Info,
};

/** Tinted background, matching border, and text colour for pop-ups. */
export const VARIANT_TOAST_CLASSES: Record<NotificationVariant, string> = {
  error:
    "border-red-500 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
  warning:
    "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300",
  success:
    "border-emerald-800 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  info: "border-blue-700 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
};

/** Icon colour for each variant in the notification history list. */
export const VARIANT_ICON_CLASSES: Record<NotificationVariant, string> = {
  error: "text-red-600 dark:text-red-400",
  warning: "text-amber-600 dark:text-amber-400",
  success: "text-emerald-700 dark:text-emerald-400",
  info: "text-blue-700 dark:text-blue-400",
};
