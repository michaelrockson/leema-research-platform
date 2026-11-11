import { createContext } from "react";
import type {
  NotificationHistoryApi,
  NotificationsApi,
} from "@/features/Notifications/types";

export const NotificationsContext = createContext<NotificationsApi | undefined>(
  undefined,
);

export const NotificationHistoryContext = createContext<
  NotificationHistoryApi | undefined
>(undefined);
