import { apiRequest, type RunStatus } from "@/lib/apiClient";
import type { FindingDataProps } from "@/features/Findings/types";

export type FindingsApiResponse = {
  phase: "analysis";
  success: boolean;
  data: {
    findings_count: number;
    findings: FindingDataProps[];
  };
};

export type DeleteFindingApiResponse = {
  success: boolean;
  message: string;
  data: {
    findings_count: number;
    findings: FindingDataProps[];
  };
};

export type EgressApiResponse = {
  phase: "egress";
  success: boolean;
  status: RunStatus;
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
    const response = await apiRequest<FindingsApiResponse>("/api/v1/findings");
    return response.data?.findings || [];
  },

  async deleteFinding(findingId: string): Promise<FindingDataProps[]> {
    const response = await apiRequest<DeleteFindingApiResponse>(
      `/api/v1/findings/${encodeURIComponent(findingId)}`,
      { method: "DELETE" },
    );
    return response.data?.findings || [];
  },

  /**
   * Export discoveries to external channels (Notion, Email, All Channels).
   */
  async exportDiscoveries(channel: string): Promise<EgressApiResponse> {
    const normalized = channel.toLowerCase();

    if (normalized.includes("notion") && !normalized.includes("all")) {
      return apiRequest<EgressApiResponse>("/api/v1/sendbynotion");
    }

    if (normalized.includes("email") && !normalized.includes("all")) {
      return apiRequest<EgressApiResponse>("/api/v1/sendbyemail");
    }

    if (normalized.includes("all")) {
      return apiRequest<EgressApiResponse>("/api/v1/sendallchannels");
    }

    throw new Error(`"${channel}" is not a channel the server can send to.`);
  },
};
