import { useCallback, useState } from "react";

export type Stages = {
  id: number;
  title: string;
  description: string;
  status: "IDLE" | "RUNNING" | "COMPLETED" | "FAILED";
  isRunning: boolean;
};

type StageState = Pick<Stages, "isRunning" | "status">;

export const STAGE_RUNNING: StageState = { isRunning: true, status: "RUNNING" };
export const STAGE_COMPLETED: StageState = {
  isRunning: false,
  status: "COMPLETED",
};
export const STAGE_FAILED: StageState = { isRunning: false, status: "FAILED" };

export const STAGE_IDS = {
  findConversations: 1,
  identifyProblems: 2,
  saveFindings: 3,
} as const;

const initialStages: Stages[] = [
  {
    id: STAGE_IDS.findConversations,
    title: "Find conversations",
    description:
      "Search your selected communities for discussions that match your phrases.",
    status: "IDLE",
    isRunning: false,
  },
  {
    id: STAGE_IDS.identifyProblems,
    title: "Identify customer problems",
    description:
      "Group recurring complaints into clear problem statements and opportunities.",
    status: "IDLE",
    isRunning: false,
  },
  {
    id: STAGE_IDS.saveFindings,
    title: "Save your findings",
    description: "Save your results to a supported destination.",
    status: "IDLE",
    isRunning: false,
  },
];

export function useStages() {
  const [stages, setStages] = useState<Stages[]>(initialStages);

  const updateStagesWhere = useCallback(
    (shouldUpdate: (stage: Stages) => boolean, state: StageState) => {
      setStages((previousStages) =>
        previousStages.map((stage) =>
          shouldUpdate(stage) ? { ...stage, ...state } : stage,
        ),
      );
    },
    [],
  );

  const setStageState = useCallback(
    (stageId: number, state: StageState) => {
      updateStagesWhere((stage) => stage.id === stageId, state);
    },
    [updateStagesWhere],
  );

  return { stages, setStageState, updateStagesWhere };
}
