import React, { createContext, useCallback, useContext, useEffect } from "react";
import type { ExtractedPost } from "@/features/Research/services/researchService";
import { settingsService } from "@/features/Settings/services/settingsService";
import type { FindingDataProps } from "@/features/Findings/types";
import {
  STAGE_COMPLETED,
  STAGE_IDS,
  useStages,
  type Stages,
} from "@/features/Research/hooks/useStages";
import { useExtractedPosts } from "@/features/Research/hooks/useExtractedPosts";
import { useStageRunner } from "@/features/Research/hooks/useStageRunner";
import { useFindings } from "@/features/Findings/hooks/useFindings";
import { useFindingsDelivery } from "@/features/Findings/hooks/useFindingsDelivery";

export type { Stages };

type ResearchContextType = {
  stages: Stages[];
  runFullResearchScan: () => Promise<void>;
  runStage: (stageId: number) => Promise<void>;
  isRunning: boolean;

  findings: FindingDataProps[];
  extractedPosts: ExtractedPost[];
  isLoadingFindings: boolean;
  isLoadingPosts: boolean;

  selectedChannel: string;
  setSelectedChannel: (channel: string) => void;
  isSaving: boolean;
  saveDiscoveries: (channel?: string) => Promise<void>;
};

const ResearchContext = createContext<ResearchContextType | undefined>(
  undefined,
);

/**
 * Wires the research hooks together and shares them with the app.
 * Each concern lives in its own hook; this provider only connects them.
 */
export function ResearchProvider({ children }: { children: React.ReactNode }) {
  const { stages, setStageState, updateStagesWhere } = useStages();

  const markConversationsFound = useCallback(
    () => setStageState(STAGE_IDS.findConversations, STAGE_COMPLETED),
    [setStageState],
  );
  const markProblemsIdentified = useCallback(
    () => setStageState(STAGE_IDS.identifyProblems, STAGE_COMPLETED),
    [setStageState],
  );
  const markFindingsSaved = useCallback(
    () => setStageState(STAGE_IDS.saveFindings, STAGE_COMPLETED),
    [setStageState],
  );

  const { extractedPosts, setExtractedPosts, isLoadingPosts, refreshExtractions } =
    useExtractedPosts(markConversationsFound);
  const { findings, setFindings, isLoadingFindings, refreshFindings } =
    useFindings(markProblemsIdentified);

  const delivery = useFindingsDelivery({
    findings,
    onDelivered: markFindingsSaved,
  });

  const { isRunning, runFullResearchScan, runStage } =
    useStageRunner({
      findings,
      selectedChannel: delivery.selectedChannel,
      setFindings,
      setExtractedPosts,
      setStageState,
      updateStagesWhere,
    });

  // Load existing findings, extractions, and settings from database on initial load
  useEffect(() => {
    refreshFindings();
    refreshExtractions();
    settingsService.getSettingsOrCached();
  }, [refreshFindings, refreshExtractions]);

  return (
    <ResearchContext.Provider
      value={{
        stages,
        runFullResearchScan,
        runStage,
        isRunning,
        findings,
        extractedPosts,
        isLoadingFindings,
        isLoadingPosts,
        ...delivery,
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
