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
} from "@/features/ResearchTable/services/researchService";
import { findingsService } from "@/features/FindingsTable/services/findingsService";
import { settingsService } from "@/features/Settings/services/settingsService";
import type { FindingDataProps } from "@/features/FindingsTable/types";

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
    description:
      "Send your results to a supported destination.",
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
  undefined
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
      state: { isRunning: boolean; status: Stages["status"] }
    ) => {
      setStages((prev) =>
        prev.map((s) => (s.id === stageId ? { ...s, ...state } : s))
      );
    },
    []
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
      const res = await researchService.getExtractions();
      const posts = res?.data?.posts || [];
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

  // Load existing findings and extractions from database on initial load
  useEffect(() => {
    refreshFindings();
    refreshExtractions();
  }, [refreshFindings, refreshExtractions]);

  const updateCount = (id: number): void => {
    const isClicked = clickedMap[id] ?? false;
    if (!isClicked) {
      setClickedMap((prev) => ({ ...prev, [id]: true }));
      setStageCount((prev) => prev + 1);
    } else {
      setClickedMap((prev) => ({ ...prev, [id]: false }));
      setStageCount((prev) => prev - 1);
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

    const userSettings = settingsService.getSettings();

    try {
      // Step 1: Extraction & Ingestion
      setStageState(1, { isRunning: true, status: "RUNNING" });
      const extractRes = await researchService.runExtraction(
        userSettings.communities
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
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Research scan execution failed";
      setRunError(msg);
      setStages((prev) =>
        prev.map((s) =>
          s.isRunning ? { ...s, isRunning: false, status: "FAILED" } : s
        )
      );
    } finally {
      setIsRunning(false);
    }
  };

  /**
   * Run ONLY the checked stages.
   * Crucially: unselected stages NEVER enter a loading state!
   */
  const runSelectedStages = async (): Promise<void> => {
    const selectedIds = Object.entries(clickedMap)
      .filter(([, checked]) => checked)
      .map(([id]) => Number(id));

    if (selectedIds.length === 0 || isRunning) return;

    setIsRunning(true);
    setRunError(null);

    // Only mark the SELECTED stages as running
    setStages((prev) =>
      prev.map((stage) =>
        selectedIds.includes(stage.id)
          ? { ...stage, isRunning: true, status: "RUNNING" }
          : stage
      )
    );

    const userSettings = settingsService.getSettings();

    try {
      // Step 1: Extraction & Ingestion
      if (selectedIds.includes(1)) {
        const res = await researchService.runExtraction(
          userSettings.communities
        );
        if (res.data?.recent_posts) {
          setExtractedPosts(res.data.recent_posts);
        }
        setStageState(1, { isRunning: false, status: "COMPLETED" });
      }

      // Step 2: Pain Analysis & Opportunity Synthesis
      if (selectedIds.includes(2)) {
        const res = await researchService.processData();
        if (res.data?.findings) {
          setFindings(res.data.findings);
        }
        setStageState(2, { isRunning: false, status: "COMPLETED" });
      }

      // Step 3: Export & Multi-Channel Delivery
      if (selectedIds.includes(3)) {
        await findingsService.exportDiscoveries(selectedChannel || "All Channels");
        setStageState(3, { isRunning: false, status: "COMPLETED" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Step execution failed";
      setRunError(msg);
      setStages((prev) =>
        prev.map((s) =>
          selectedIds.includes(s.id)
            ? { ...s, isRunning: false, status: "FAILED" }
            : s
        )
      );
    } finally {
      setIsRunning(false);
    }
  };

  const saveDiscoveries = async (channel?: string) => {
    const targetChannel = channel || selectedChannel;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const res = await findingsService.exportDiscoveries(targetChannel);
      setSaveMessage(res.message || `Successfully sent via ${targetChannel}!`);
      setStageState(3, { isRunning: false, status: "COMPLETED" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to export report";
      setSaveMessage(`Export error: ${msg}`);
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
      "useResearchContext must be used within a ResearchProvider"
    );
  }
  return context;
}
