import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  researchService,
  type ExtractedPost,
} from "@/features/Research/services/researchService";
import { findingsService } from "@/features/Findings/services/findingsService";
import { findingsExportService } from "@/features/Findings/services/findingsExportService";
import { settingsService } from "@/features/Settings/services/settingsService";
import type { FindingDataProps } from "@/features/Findings/types";

export type Stages = {
  id: number;
  title: string;
  description: string;
  status: "IDLE" | "RUNNING" | "COMPLETED" | "FAILED";
  isRunning: boolean;
};

const initialStages: Stages[] = [
  {
    id: 1,
    title: "Find conversations",
    description:
      "Search your selected communities for discussions that match your phrases.",
    status: "IDLE",
    isRunning: false,
  },
  {
    id: 2,
    title: "Identify customer problems",
    description:
      "Group recurring complaints into clear problem statements and opportunities.",
    status: "IDLE",
    isRunning: false,
  },
  {
    id: 3,
    title: "Share your findings",
    description: "Send your results to a supported destination.",
    status: "IDLE",
    isRunning: false,
  },
];

type ResearchContextType = {
  stages: Stages[];
  stageCount: number;
  clickedMap: Record<number, boolean>;
  updateCount: (id: number) => void;
  runFullResearchScan: () => Promise<void>;
  runSelectedStages: () => Promise<void>;
  runStage: (stageId: number) => Promise<void>;
  isRunning: boolean;
  runError: string | null;

  findings: FindingDataProps[];
  extractedPosts: ExtractedPost[];
  isLoadingFindings: boolean;
  isLoadingPosts: boolean;

  selectedChannel: string;
  setSelectedChannel: (channel: string) => void;
  isSaving: boolean;
  saveMessage: string | null;
  saveDiscoveries: (channel?: string) => Promise<void>;

  refreshFindings: () => Promise<void>;
  refreshExtractions: () => Promise<void>;
};

const ResearchContext = createContext<ResearchContextType | undefined>(
  undefined,
);

export function ResearchProvider({ children }: { children: React.ReactNode }) {
  const [stages, setStages] = useState<Stages[]>(initialStages);
  const [clickedMap, setClickedMap] = useState<Record<number, boolean>>({});
  const [stageCount, setStageCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const [findings, setFindings] = useState<FindingDataProps[]>([]);
  const [extractedPosts, setExtractedPosts] = useState<ExtractedPost[]>([]);
  const [isLoadingFindings, setIsLoadingFindings] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);

  const [selectedChannel, setSelectedChannel] = useState<string>("Notion");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const setStageState = useCallback(
    (
      stageId: number,
      state: { isRunning: boolean; status: Stages["status"] },
    ) => {
      setStages((previousStages) =>
        previousStages.map((stage) =>
          stage.id === stageId ? { ...stage, ...state } : stage,
        ),
      );
    },
    [],
  );

  const refreshFindings = useCallback(async () => {
    setIsLoadingFindings(true);
    try {
      const data = await findingsService.getFindings();
      if (data && data.length > 0) {
        setFindings(data);
        setStageState(2, { isRunning: false, status: "COMPLETED" });
      }
    } catch {
      // Keep existing findings on error
    } finally {
      setIsLoadingFindings(false);
    }
  }, [setStageState]);

  const refreshExtractions = useCallback(async () => {
    setIsLoadingPosts(true);
    try {
      const response = await researchService.getExtractions();
      const posts = response?.data?.posts || [];
      if (posts.length > 0) {
        setExtractedPosts(posts);
        setStageState(1, { isRunning: false, status: "COMPLETED" });
      }
    } catch {
      // Keep existing posts on error
    } finally {
      setIsLoadingPosts(false);
    }
  }, [setStageState]);

  // Load existing findings, extractions, and settings from database on initial load
  useEffect(() => {
    refreshFindings();
    refreshExtractions();
    settingsService.getSettingsOrCached();
  }, [refreshFindings, refreshExtractions]);

  const updateCount = (id: number): void => {
    const isClicked = clickedMap[id] ?? false;
    if (!isClicked) {
      setClickedMap((previousMap) => ({ ...previousMap, [id]: true }));
      setStageCount((previousCount) => previousCount + 1);
    } else {
      setClickedMap((previousMap) => ({ ...previousMap, [id]: false }));
      setStageCount((previousCount) => previousCount - 1);
    }
  };

  /**
   * Run the full 3-step automated research scan sequentially.
   * Updates extractedPosts immediately after Step 1,
   * updates findings immediately after Step 2.
   */
  const runFullResearchScan = async (): Promise<void> => {
    if (isRunning) return;
    setIsRunning(true);
    setRunError(null);

    const userSettings = await settingsService.getSettingsOrCached();

    try {
      // Step 1: Extraction & Ingestion
      setStageState(1, { isRunning: true, status: "RUNNING" });
      const extractRes = await researchService.runExtraction(
        userSettings.communities,
      );
      if (extractRes.data?.recent_posts) {
        setExtractedPosts(extractRes.data.recent_posts);
      }
      setStageState(1, { isRunning: false, status: "COMPLETED" });

      // Step 2: Pain Analysis & Opportunity Synthesis
      setStageState(2, { isRunning: true, status: "RUNNING" });
      const processRes = await researchService.processData();
      if (processRes.data?.findings) {
        setFindings(processRes.data.findings);
      }
      setStageState(2, { isRunning: false, status: "COMPLETED" });

      // Step 3: Export & Multi-Channel Delivery
      setStageState(3, { isRunning: true, status: "RUNNING" });
      await findingsService.exportDiscoveries("All Channels");
      setStageState(3, { isRunning: false, status: "COMPLETED" });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Research scan execution failed";
      setRunError(errorMessage);
      setStages((previousStages) =>
        previousStages.map((stage) =>
          stage.isRunning
            ? { ...stage, isRunning: false, status: "FAILED" }
            : stage,
        ),
      );
    } finally {
      setIsRunning(false);
    }
  };

  /**
   * Run ONLY the checked stages.
   */
  const runSelectedStages = async (): Promise<void> => {
    const selectedIds = Object.entries(clickedMap)
      .filter(([, checked]) => checked)
      .map(([id]) => Number(id));

    await runStages(selectedIds);
  };

  /**
   * Run a single stage on its own.
   */
  const runStage = async (stageId: number): Promise<void> => {
    await runStages([stageId]);
  };

  /**
   * Run the given stages in order.
   * Crucially: stages not in the list NEVER enter a loading state!
   */
  const runStages = async (selectedIds: number[]): Promise<void> => {
    if (selectedIds.length === 0 || isRunning) return;

    setIsRunning(true);
    setRunError(null);

    // Only mark the SELECTED stages as running
    setStages((previousStages) =>
      previousStages.map((stage) =>
        selectedIds.includes(stage.id)
          ? { ...stage, isRunning: true, status: "RUNNING" }
          : stage,
      ),
    );

    const userSettings = await settingsService.getSettingsOrCached();

    try {
      // Step 1: Extraction & Ingestion
      if (selectedIds.includes(1)) {
        const response = await researchService.runExtraction(
          userSettings.communities,
        );
        if (response.data?.recent_posts) {
          setExtractedPosts(response.data.recent_posts);
        }
        setStageState(1, { isRunning: false, status: "COMPLETED" });
      }

      // Findings state won't update until the next render, so keep the
      // freshest copy locally for step 3.
      let latestFindings = findings;

      // Step 2: Pain Analysis & Opportunity Synthesis
      if (selectedIds.includes(2)) {
        const response = await researchService.processData();
        if (response.data?.findings) {
          latestFindings = response.data.findings;
          setFindings(latestFindings);
        }
        setStageState(2, { isRunning: false, status: "COMPLETED" });
      }

      // Step 3: Export & Multi-Channel Delivery
      if (selectedIds.includes(3)) {
        await deliverFindings(
          selectedChannel || "All Channels",
          latestFindings,
        );
        setStageState(3, { isRunning: false, status: "COMPLETED" });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Step execution failed";
      setRunError(errorMessage);
      setStages((previousStages) =>
        previousStages.map((stage) =>
          selectedIds.includes(stage.id)
            ? { ...stage, isRunning: false, status: "FAILED" }
            : stage,
        ),
      );
    } finally {
      setIsRunning(false);
    }
  };

  /**
   * Send findings to a channel. PDF and CSV are built and downloaded in the
   * browser; every other channel goes through the backend.
   * Returns a message describing what happened.
   */
  const deliverFindings = async (
    channel: string,
    findingsToDeliver: FindingDataProps[],
  ): Promise<string> => {
    if (findingsExportService.isFileExportFormat(channel)) {
      await findingsExportService.exportFile(channel, findingsToDeliver);
      return `Downloaded your findings as a ${channel} file.`;
    }

    const response = await findingsService.exportDiscoveries(channel);
    return response.message || `Successfully sent via ${channel}!`;
  };

  const saveDiscoveries = async (channel?: string) => {
    const targetChannel = channel || selectedChannel;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      setSaveMessage(await deliverFindings(targetChannel, findings));
      setStageState(3, { isRunning: false, status: "COMPLETED" });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to export report";
      setSaveMessage(`Export error: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ResearchContext.Provider
      value={{
        stages,
        stageCount,
        clickedMap,
        updateCount,
        runFullResearchScan,
        runSelectedStages,
        runStage,
        isRunning,
        runError,
        findings,
        extractedPosts,
        isLoadingFindings,
        isLoadingPosts,
        selectedChannel,
        setSelectedChannel,
        isSaving,
        saveMessage,
        saveDiscoveries,
        refreshFindings,
        refreshExtractions,
      }}
    >
      {children}
    </ResearchContext.Provider>
  );
}

export function useResearchContext() {
  const context = useContext(ResearchContext);
  if (!context) {
    throw new Error(
      "useResearchContext must be used within a ResearchProvider",
    );
  }
  return context;
}
