import { apiRequest } from "@/lib/apiClient";
import type { FindingDataProps } from "@/features/FindingsTable/types";

export type FindingsApiResponse = {
  phase: "analysis";
  success: boolean;
  data: {
    findings_count: number;
    findings: FindingDataProps[];
  };
};

export type EgressApiResponse = {
  phase: "egress";
  success: boolean;
  message: string;
  data: {
    channel: string;
    status: string;
  };
};

export const findingsService = {
  /**
   * Fetch current discovered problem briefs without re-running the curator agent.
   */
  async getFindings(): Promise<FindingDataProps[]> {
    const response = await apiRequest<FindingsApiResponse>("/Findings");
    return response.data?.findings || [];
  },

  /**
   * Export discoveries to external channels (Notion, Email, All Channels).
   */
  async exportDiscoveries(channel: string): Promise<EgressApiResponse> {
    const normalized = channel.toLowerCase();

    if (normalized.includes("notion") && !normalized.includes("all")) {
      return apiRequest<EgressApiResponse>("/SendByNotion");
    }

    if (normalized.includes("email") && !normalized.includes("all")) {
      return apiRequest<EgressApiResponse>("/SendByEmail");
    }

    return apiRequest<EgressApiResponse>("/SendAllChannels");
  },
};
