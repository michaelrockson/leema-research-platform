import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Running } from "@/components/Running.tsx";
import { CheckIcon } from "lucide-react";
import {
  useResearchContext,
  type Stages,
} from "@/context/ResearchContext.tsx";

function provideResearchStages(
  {
    researchStages,
    clickedMap,
  }: {
    researchStages: Stages[];
    clickedMap: Record<number, boolean>;
  },
  updateCount: (id: number) => void
) {
  return (
    <div className="divide-y -mx-(--card-spacing)">
      {researchStages.map((stage) => {
        // Individual row loading state: strictly controlled by stage.isRunning
        const rowIsLoading = stage.isRunning;

        return (
          <div
            key={stage.id}
            className="flex justify-between items-center py-4 px-(--card-spacing)"
          >
            <div className="flex gap-6 items-center">
              <Checkbox
                className="border-2"
                checked={clickedMap[stage.id] ?? false}
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
              {rowIsLoading && <Running />}
              {!rowIsLoading && stage.status === "COMPLETED" && (
                <span>
                  <CheckIcon className="bg-green-600 text-white rounded-xl size-7 px-1 py-1" />
                </span>
              )}
            </div>
          </div>
        );
      })}
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
    runSelectedStages,
    runFullResearchScan,
    runError,
  } = useResearchContext();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between pt-8">
        <div>
          {runError && (
            <span className="text-sm text-red-500 font-medium">
              Error: {runError}
            </span>
          )}
        </div>
        <Button
          className="py-5 px-5"
          disabled={isRunning || stageCount === 0}
          onClick={() => runSelectedStages()}
        >
          {isRunning ? "Running…" : `Run selected steps (${stageCount})`}
        </Button>
      </div>

      <Card>
        <CardHeader className="flex justify-between items-center px-8">
          <CardTitle>
            <h4>Research steps</h4>
          </CardTitle>
          <Button
            variant="outline"
            className="py-5 px-5"
            disabled={isRunning}
            onClick={() => runFullResearchScan()}
          >
            {isRunning ? "Running all steps…" : "Run all steps"}
          </Button>
        </CardHeader>
        <CardContent className="border-t border-foreground/10 pt-0">
          {provideResearchStages(
            { researchStages: stages, clickedMap },
            updateCount
          )}
        </CardContent>
      </Card>
    </div>
  );
}
