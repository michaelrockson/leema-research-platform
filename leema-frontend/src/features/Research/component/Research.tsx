import { Fragment } from "react";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Running } from "@/components/Running.tsx";
import { cn } from "@/lib/utils";
import { useResearchContext, type Stages } from "@/context/ResearchContext.tsx";

function StageStatus({ stage }: { stage: Stages }) {
  if (stage.isRunning || stage.status === "RUNNING") {
    return (
      <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Running />
        Running
      </span>
    );
  }

  if (stage.status === "COMPLETED") {
    return (
      <span className="inline-flex items-center gap-2 text-xs font-semibold text-green-600 dark:text-green-400">
        <span className="size-2 rounded-full bg-current" />
        Done
      </span>
    );
  }

  if (stage.status === "FAILED") {
    return (
      <span className="inline-flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-400">
        <span className="size-2 rounded-full bg-current" />
        Failed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
      <span className="size-2 rounded-full border-[1.5px] border-current" />
      Not started
    </span>
  );
}

function StageCard({
  stage,
  stepNumber,
  isAnyStageRunning,
  onRun,
}: {
  stage: Stages;
  stepNumber: number;
  isAnyStageRunning: boolean;
  onRun: () => void;
}) {
  const hasRunBefore =
    stage.status === "COMPLETED" || stage.status === "FAILED";

  return (
    <Card className="flex-1 gap-0 px-6 py-6 shadow-xs">
      <div className="flex items-start justify-between gap-4">
        <span className="text-4xl font-bold leading-none tracking-tight text-muted-foreground/60 tabular-nums">
          {String(stepNumber).padStart(2, "0")}
        </span>
        <StageStatus stage={stage} />
      </div>

      <h4 className="mt-8 text-lg font-bold text-foreground">{stage.title}</h4>
      <p className="mt-2 max-w-xs leading-relaxed text-muted-foreground">
        {stage.description}
      </p>

      <div className="mt-auto pt-10">
        <Button
          variant={hasRunBefore ? "outline" : "default"}
          className={cn(
            "h-10 rounded-full px-4 font-semibold",
            !hasRunBefore &&
              "bg-foreground text-background hover:bg-foreground/85",
          )}
          disabled={isAnyStageRunning}
          onClick={onRun}
        >
          {stage.isRunning
            ? "Running…"
            : hasRunBefore
              ? "Run again"
              : "Run this step"}
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </Card>
  );
}

export default function Research() {
  const { stages, isRunning, runStage, runError } = useResearchContext();

  return (
    <div className="flex flex-col gap-4 pt-24">
      {runError && (
        <span className="text-sm font-medium text-red-500">{runError}</span>
      )}

      <div className="flex flex-col items-stretch gap-4 md:flex-row md:gap-2">
        {stages.map((stage, stageIndex) => (
          <Fragment key={stage.id}>
            {stageIndex > 0 && (
              <ChevronRight
                aria-hidden="true"
                className="hidden size-4 shrink-0 self-center text-muted-foreground md:block"
              />
            )}
            <StageCard
              stage={stage}
              stepNumber={stageIndex + 1}
              isAnyStageRunning={isRunning}
              onRun={() => runStage(stage.id)}
            />
          </Fragment>
        ))}
      </div>
    </div>
  );
}
