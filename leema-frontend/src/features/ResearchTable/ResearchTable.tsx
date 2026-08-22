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
import { CheckIcon } from "lucide-react";

function provideResearchStages({
  researchStages,
}: {
  researchStages: Stages[];
}) {
  return (
    <div className="divide-y -mx-(--card-spacing)">
      {researchStages.map((stage) => {
        return (
          <div
            key={stage.id}
            className="flex justify-between items-center py-4 px-(--card-spacing)"
          >
            <div className="flex gap-6 items-center">
              <Checkbox className="border-2" />
              <div>
                <h5 className="font-semibold">{stage.title}</h5>
                <span className="text-muted-foreground pt-2">
                  {stage.description}
                </span>
              </div>
            </div>
            <div className="px-4">
              {/*<div className="loader"></div>*/}
              <span>
                <CheckIcon className="bg-green-600 text-white rounded-xl size-7 px-1 py-1" />
              </span>
            </div>
          </div>
        );
      })}{" "}
    </div>
  );
}

export default function ResearchTable() {
  const { stages } = useResearchTable();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end pt-8">
        <Button className="py-5 px-5">Run Selected Stages (0)</Button>
      </div>

      <Card>
        <CardHeader className="flex justify-between items-center px-8">
          <CardTitle>
            <h4>Research Discovery Steps</h4>
          </CardTitle>
          <Button variant="outline" className="py-5 px-5">
            Run Full Research Scan
          </Button>
        </CardHeader>
        <CardContent className="border-t border-foreground/10 pt-0">
          {provideResearchStages({ researchStages: stages })}
        </CardContent>
      </Card>
    </div>
  );
}
