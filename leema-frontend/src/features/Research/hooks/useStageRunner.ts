import { useState } from "react";
import { researchService } from "@/features/Research/services/researchService";
import { useNotifications } from "@/features/Notifications/hooks/useNotifications";
import type { ExtractedPost } from "@/features/Research/services/researchService";
import { findingsService } from "@/features/Findings/services/findingsService";
import { findingsDeliveryService } from "@/features/Findings/services/findingsDeliveryService";
import type { FindingDataProps } from "@/features/Findings/types";
import type { RunStatus } from "@/lib/apiClient";
import {
  STAGE_COMPLETED,
  STAGE_IDS,
  STAGE_RUNNING,
  STAGE_FAILED,
  type Stages,
  type useStages,
} from "@/features/Research/hooks/useStages";

type StageControls = Pick<
  ReturnType<typeof useStages>,
  "setStageState" | "updateStagesWhere"
>;

type StageRunnerOptions = StageControls & {
  findings: FindingDataProps[];
  selectedChannel: string;
  setFindings: (findings: FindingDataProps[]) => void;
  setExtractedPosts: (posts: ExtractedPost[]) => void;
};

export function useStageRunner({
  findings,
  selectedChannel,
  setFindings,
  setExtractedPosts,
  setStageState,
  updateStagesWhere,
}: StageRunnerOptions) {
  const [isRunning, setIsRunning] = useState(false);
  const { notifyError, notifyInfo, notifySuccess } = useNotifications();

  /**
   * Show the outcome of a step: success when it did new work, info when it
   * ran fine but had nothing new to do.
   */
  const reportStepOutcome = (
    response: { status: RunStatus; message: string },
    fallbackSuccessMessage: string,
  ) => {
    if (response.status === "no_new_data") {
      notifyInfo(response.message);
    } else {
      notifySuccess(response.message || fallbackSuccessMessage);
    }
  };

  const executeRun = async (
    runSteps: () => Promise<void>,
    isFailedStage: (stage: Stages) => boolean,
    fallbackErrorMessage: string,
  ) => {
    setIsRunning(true);
    try {
      await runSteps();
    } catch (error) {
      notifyError(
        error instanceof Error ? error.message : fallbackErrorMessage,
      );
      updateStagesWhere(isFailedStage, STAGE_FAILED);
    } finally {
      setIsRunning(false);
    }
  };

  // Step 1: Extraction & Ingestion
  const findConversations = async () => {
    const response = await researchService.runExtraction();
    if (response.data?.recent_posts) {
      setExtractedPosts(response.data.recent_posts);
    }
    reportStepOutcome(response, "Found new conversations.");
  };

  // Step 2: Pain Analysis & Opportunity Synthesis
  const identifyProblems = async (): Promise<
    FindingDataProps[] | undefined
  > => {
    const response = await researchService.processData();
    const newFindings = response.data?.findings;
    if (newFindings) {
      setFindings(newFindings);
    }
    reportStepOutcome(response, "Identified customer problems.");
    return newFindings;
  };

  /**
   * Run the full 3-step automated research scan sequentially.
   */
  const runFullResearchScan = async (): Promise<void> => {
    if (isRunning) return;

    await executeRun(
      async () => {
        setStageState(STAGE_IDS.findConversations, STAGE_RUNNING);
        await findConversations();
        setStageState(STAGE_IDS.findConversations, STAGE_COMPLETED);

        setStageState(STAGE_IDS.identifyProblems, STAGE_RUNNING);
        await identifyProblems();
        setStageState(STAGE_IDS.identifyProblems, STAGE_COMPLETED);

        // Step 3: Export & Multi-Channel Delivery
        setStageState(STAGE_IDS.saveFindings, STAGE_RUNNING);
        const egressResponse =
          await findingsService.exportDiscoveries("All Channels");
        reportStepOutcome(egressResponse, "Saved your findings.");
        setStageState(STAGE_IDS.saveFindings, STAGE_COMPLETED);
      },
      (stage) => stage.isRunning,
      "Research scan execution failed",
    );
  };

  const runStages = async (selectedIds: number[]): Promise<void> => {
    if (selectedIds.length === 0 || isRunning) return;

    const isSelected = (stage: Stages) => selectedIds.includes(stage.id);

    await executeRun(
      async () => {
        updateStagesWhere(isSelected, STAGE_RUNNING);

        if (selectedIds.includes(STAGE_IDS.findConversations)) {
          await findConversations();
          setStageState(STAGE_IDS.findConversations, STAGE_COMPLETED);
        }

        let latestFindings = findings;

        if (selectedIds.includes(STAGE_IDS.identifyProblems)) {
          latestFindings = (await identifyProblems()) ?? latestFindings;
          setStageState(STAGE_IDS.identifyProblems, STAGE_COMPLETED);
        }

        if (selectedIds.includes(STAGE_IDS.saveFindings)) {
          const outcome = await findingsDeliveryService.deliver(
            selectedChannel || "All Channels",
            latestFindings,
          );
          if (outcome.wasDelivered) {
            notifySuccess(outcome.message);
          } else {
            notifyInfo(outcome.message);
          }
          setStageState(STAGE_IDS.saveFindings, STAGE_COMPLETED);
        }
      },
      isSelected,
      "Step execution failed",
    );
  };

  const runStage = (stageId: number): Promise<void> => runStages([stageId]);

  return { isRunning, runFullResearchScan, runStage };
}
