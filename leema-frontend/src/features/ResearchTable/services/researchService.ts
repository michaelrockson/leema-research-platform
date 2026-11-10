import { apiRequest, createEventSource } from "@/lib/apiClient";

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
  message: string;
  data: {
    total_posts_extracted: number;
    recent_posts: ExtractedPost[];
  };
};

export type ProcessDataResponse = {
  phase: "analysis";
  success: boolean;
  message: string;
  data: {
    findings_count: number;
    findings: Array<{
      id: number;
      title: string;
      feasibility: string;
      description: string;
      sentiment: string;
    }>;
  };
};

export type RunAllResponse = {
  phase: "all";
  success: boolean;
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
  | { type: "warning"; stage: string; message: string }
  | { type: "complete"; success: boolean; message: string; total: number }
  | { type: "error"; message: string };

export const researchService = {
  /**
   * Run the complete 3-phase automated pipeline sequentially.
   */
  async runAllPipelines(): Promise<RunAllResponse> {
    return apiRequest<RunAllResponse>("/api/v1/runallprocesses");
  },

  /**
   * Run Phase 1: Extraction & Ingestion synchronously.
   */
  async runExtraction(subreddits?: string[]): Promise<ExtractionResponse> {
    const query =
      subreddits && subreddits.length > 0
        ? `?subreddits=${encodeURIComponent(subreddits.join(","))}`
        : "";
    return apiRequest<ExtractionResponse>(`/api/v1/runextraction${query}`);
  },

  /**
   * Fetch existing extracted posts without triggering Reddit scraping.
   */
  async getExtractions(): Promise<{
    phase: string;
    success: boolean;
    data: { total_posts_extracted: number; posts: ExtractedPost[] };
  }> {
    return apiRequest("/api/v1/extractions");
  },

  /**
   * Run Phase 2: Sentiment Analysis & Gemini Curator Agent.
   */
  async processData(): Promise<ProcessDataResponse> {
    return apiRequest<ProcessDataResponse>("/api/v1/processdata");
  },

  /**
   * Stream Phase 1 extraction progress and discovered post chunks in real time via SSE.
   */
  subscribeToExtractionStream(
    subreddits?: string[],
    callbacks?: {
      onStatus?: (message: string, stage: string) => void;
      onPostChunk?: (post: ExtractedPost) => void;
      onComplete?: (total: number) => void;
      onError?: (error: Error) => void;
    }
  ): () => void {
    const query =
      subreddits && subreddits.length > 0
        ? `?subreddits=${encodeURIComponent(subreddits.join(","))}`
        : "";

    const eventSource = createEventSource(`/api/v1/runextraction/stream${query}`);

    eventSource.onmessage = (event) => {
      try {
        const payload: StreamEvent = JSON.parse(event.data);

        if (payload.type === "status") {
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
      } catch (err) {
        callbacks?.onError?.(
          err instanceof Error ? err : new Error("Failed to parse SSE payload")
        );
      }
    };

    eventSource.onerror = (err) => {
      callbacks?.onError?.(new Error(`EventSource error: ${err}`));
      eventSource.close();
    };

    // Return cleanup unsubscribe function
    return () => {
      eventSource.close();
    };
  },
};
