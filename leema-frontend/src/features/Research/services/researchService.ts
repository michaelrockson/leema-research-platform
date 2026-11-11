import { apiRequest, createEventSource, type RunStatus } from "@/lib/apiClient";
import type { FindingDataProps } from "@/features/Findings/types";

export type ExtractedPost = {
  id: number;
  submission_id: string;
  subreddit: string;
  title: string;
  score: number;
  number_of_comments: number;
  post_url?: string;
};

export type ExtractionResponse = {
  phase: "extraction";
  success: boolean;
  status: RunStatus;
  message: string;
  data: {
    total_posts_extracted: number;
    recent_posts: ExtractedPost[];
  };
};

export type ProcessDataResponse = {
  phase: "analysis";
  success: boolean;
  status: RunStatus;
  message: string;
  data: {
    findings_count: number;
    findings: FindingDataProps[];
  };
};

export type RunAllResponse = {
  phase: "all";
  success: boolean;
  status: RunStatus;
  message: string;
  data: {
    extraction?: {
      total_posts_extracted?: number;
      recent_posts?: ExtractedPost[];
    };
    analysis?: {
      findings_count?: number;
      findings?: unknown[];
    };
    egress?: {
      channel?: string;
      status?: string;
    };
  };
};

export type StreamEvent =
  | { type: "status"; stage: string; message: string; subreddits?: string[] }
  | { type: "post_chunk"; data: ExtractedPost }
  | { type: "info"; stage: string; message: string }
  | {
      type: "complete";
      success: boolean;
      status: RunStatus;
      message: string;
      total: number;
    }
  | { type: "error"; message: string };

export const researchService = {
  async runAllPipelines(): Promise<RunAllResponse> {
    return apiRequest<RunAllResponse>("/api/v1/runallprocesses");
  },

  async runExtraction(subreddits?: string[]): Promise<ExtractionResponse> {
    const query =
      subreddits && subreddits.length > 0
        ? `?subreddits=${encodeURIComponent(subreddits.join(","))}`
        : "";
    return apiRequest<ExtractionResponse>(`/api/v1/runextraction${query}`);
  },

  async getExtractions(): Promise<{
    phase: string;
    success: boolean;
    data: { total_posts_extracted: number; posts: ExtractedPost[] };
  }> {
    return apiRequest("/api/v1/extractions");
  },

  async processData(): Promise<ProcessDataResponse> {
    return apiRequest<ProcessDataResponse>("/api/v1/processdata");
  },

  subscribeToExtractionStream(
    subreddits?: string[],
    callbacks?: {
      onStatus?: (message: string, stage: string) => void;
      onPostChunk?: (post: ExtractedPost) => void;
      onComplete?: (total: number) => void;
      onError?: (error: Error) => void;
    },
  ): () => void {
    const query =
      subreddits && subreddits.length > 0
        ? `?subreddits=${encodeURIComponent(subreddits.join(","))}`
        : "";

    const eventSource = createEventSource(
      `/api/v1/runextraction/stream${query}`,
    );

    eventSource.onmessage = (event) => {
      try {
        const payload: StreamEvent = JSON.parse(event.data);

        if (payload.type === "status" || payload.type === "info") {
          callbacks?.onStatus?.(payload.message, payload.stage);
        } else if (payload.type === "post_chunk") {
          callbacks?.onPostChunk?.(payload.data);
        } else if (payload.type === "complete") {
          callbacks?.onComplete?.(payload.total);
          eventSource.close();
        } else if (payload.type === "error") {
          callbacks?.onError?.(new Error(payload.message));
          eventSource.close();
        }
      } catch (parseError) {
        callbacks?.onError?.(
          parseError instanceof Error
            ? parseError
            : new Error("Failed to parse SSE payload"),
        );
      }
    };

    eventSource.onerror = (errorEvent) => {
      callbacks?.onError?.(new Error(`EventSource error: ${errorEvent}`));
      eventSource.close();
    };

    // Return cleanup unsubscribe function
    return () => {
      eventSource.close();
    };
  },
};
