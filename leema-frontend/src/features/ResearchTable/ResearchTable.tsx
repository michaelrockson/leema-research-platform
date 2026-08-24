import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import useResearchTable, {
  type Stages,
} from "@/features/ResearchTable/useResearchTable.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Loading } from "@/components/Loading.tsx";
import { CheckIcon } from "lucide-react";

function provideResearchStages(
  {
    researchStages,
    clickedMap,
  }: {
    researchStages: Stages[];
    clickedMap: Record<number, boolean>;
  },
  updateCount: (id: number) => void,
  isRunning: boolean,
) {
  return (
    <div className="divide-y -mx-(--card-spacing)">
      {researchStages.map((stage) => {
        const rowIsLoading = isRunning || stage.isRunning;

        return (
          <div
            key={stage.id}
            className="flex justify-between items-center py-4 px-(--card-spacing)"
          >
            <div className="flex gap-6 items-center">
              <Checkbox
                className="border-2"
                checked={!!clickedMap[stage.id]}
                onCheckedChange={() => updateCount(stage.id)}
              />
              <div>
                <h5 className="font-semibold">{stage.title}</h5>
                <span className="text-muted-foreground pt-2">
                  {stage.description}
                </span>
              </div>
            </div>
            <div className="px-4">
              {rowIsLoading && <Loading />}
              {!rowIsLoading && stage.status === "COMPLETED" && (
                <span>
                  <CheckIcon className="bg-green-600 text-white rounded-xl size-7 px-1 py-1" />
                </span>
              )}
            </div>
          </div>
        );
      })}{" "}
    </div>
  );
}

export default function ResearchTable() {
  const {
    stages,
    stageCount,
    clickedMap,
    updateCount,
    isRunning,
    setIsRunning,
  } = useResearchTable();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end pt-8">
        <Button className="py-5 px-5">
          Run Selected Stages ({stageCount})
        </Button>
      </div>

      <Card>
        <CardHeader className="flex justify-between items-center px-8">
          <CardTitle>
            <h4>Research Discovery Steps</h4>
          </CardTitle>
          <Button
            variant="outline"
            className="py-5 px-5"
            onClick={() => setIsRunning(true)}
          >
            Run Full Research Scan
          </Button>
        </CardHeader>
        <CardContent className="border-t border-foreground/10 pt-0">
          {provideResearchStages(
            { researchStages: stages, clickedMap },
            updateCount,
            isRunning,
          )}
        </CardContent>
      </Card>
    </div>
  );
}
