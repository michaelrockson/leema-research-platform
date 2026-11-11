import { findingsService } from "@/features/Findings/services/findingsService";
import { findingsExportService } from "@/features/Findings/services/findingsExportService";
import type { FindingDataProps } from "@/features/Findings/types";

export type DeliveryOutcome = {
  /** User-facing description of what happened. */
  message: string;
  /** False when the request worked but there was nothing to send yet. */
  wasDelivered: boolean;
};

export const findingsDeliveryService = {
  /**
   * Send findings to a channel. PDF and CSV are built and downloaded in the
   * browser; every other channel goes through the backend.
   */
  async deliver(
    channel: string,
    findingsToDeliver: FindingDataProps[],
  ): Promise<DeliveryOutcome> {
    if (findingsExportService.isFileExportFormat(channel)) {
      await findingsExportService.exportFile(channel, findingsToDeliver);
      return {
        message: `Downloaded your findings as a ${channel} file.`,
        wasDelivered: true,
      };
    }

    const response = await findingsService.exportDiscoveries(channel);
    return {
      message: response.message || `Successfully sent via ${channel}!`,
      wasDelivered: response.status !== "no_new_data",
    };
  },
};
