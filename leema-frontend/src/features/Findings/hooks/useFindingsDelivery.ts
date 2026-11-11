import { useState } from "react";
import { findingsDeliveryService } from "@/features/Findings/services/findingsDeliveryService";
import { useNotifications } from "@/features/Notifications/hooks/useNotifications";
import type { FindingDataProps } from "@/features/Findings/types";

type FindingsDeliveryOptions = {
  findings: FindingDataProps[];
  onDelivered: () => void;
};

export function useFindingsDelivery({
  findings,
  onDelivered,
}: FindingsDeliveryOptions) {
  const [selectedChannel, setSelectedChannel] = useState<string>("Notion");
  const [isSaving, setIsSaving] = useState(false);
  const { notifyError, notifySuccess, notifyWarning } = useNotifications();

  const saveDiscoveries = async (channel?: string) => {
    const targetChannel = channel || selectedChannel;
    setIsSaving(true);
    try {
      const outcome = await findingsDeliveryService.deliver(
        targetChannel,
        findings,
      );
      if (outcome.wasDelivered) {
        notifySuccess(outcome.message);
        onDelivered();
      } else {
        notifyWarning(outcome.message);
      }
    } catch (error) {
      notifyError(
        error instanceof Error ? error.message : "Failed to export report",
        { title: "Export failed" },
      );
    } finally {
      setIsSaving(false);
    }
  };

  return {
    selectedChannel,
    setSelectedChannel,
    isSaving,
    saveDiscoveries,
  };
}
