import { useState } from "react";

export type Stages = {
  id: number;
  title: string;
  description: string;
  status: string;
  isRunning: boolean;
};

const stages: Stages[] = [
  {
    id: 1,
    title: "Pain Discovery",
    description: "Scanning target communities for product issues & complaints",
    status: "COMPLETED",
    isRunning: false,
  },
  {
    id: 2,
    title: "Data Collection",
    description: "Gathering full customer conversations & feedback threads",
    status: "COMPLETED",
    isRunning: false,
  },
  {
    id: 3,
    title: "Pain & Urgency Assessment",
    description: "Measuring complaint severity and customer frustration levels",
    status: "COMPLETED",
    isRunning: false,
  },
  {
    id: 4,
    title: "Opportunity Briefs",
    description:
      "Synthesizing recurring problems into actionable product ideas",
    status: "COMPLETED",
    isRunning: false,
  },
  {
    id: 5,
    title: "Export & Share",
    description:
      "Delivering formatted findings to Notion and email subscribers",
    status: "COMPLETED",
    isRunning: false,
  },
];

export default function useResearchTable() {
  const [stageCount, setStageCount] = useState(0);
  const [selectedStages, setSelectedStages] = useState<Stages[]>(stages);
  const [clickedMap, setClickedMap] = useState<Record<number, boolean>>({});
  const [isRunning, setIsRunning] = useState(false);

  function updateCount(id: number): void {
    const isClicked = clickedMap[id] ?? false;

    if (!isClicked) {
      setClickedMap({ ...clickedMap, [id]: true });
      setStageCount(stageCount + 1);
    }

    if (isClicked) {
      setClickedMap({ ...clickedMap, [id]: false });
      setStageCount(stageCount - 1);
    }
  }

  function runSelectedStages(): void {
    const selectedIds = Object.entries(clickedMap)
      .filter(([, checked]) => checked)
      .map(([id]) => Number(id));

    setSelectedStages((prev) =>
      prev.map((stage) =>
        selectedIds.includes(stage.id) ? { ...stage, isRunning: true } : stage,
      ),
    );
  }

  return {
    stages: selectedStages,
    stageCount,
    clickedMap,
    setStageCount,
    updateCount,
    runSelectedStages,
    isRunning,
    setIsRunning,
  };
}
