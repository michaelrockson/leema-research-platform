import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card.tsx";
import type { FindingDataProps } from "@/features/FindingsTable/hooks/useFindingsTable.tsx";

const tagStyles = {
  positive:
    "bg-green-100 text-green-800 px-2 py-1 text-sm font-semibold rounded-xs text-xs",
  negative:
    "bg-red-100 text-red-800 px-2 py-1 text-sm font-semibold rounded-xs text-xs",
  neutral:
    "bg-primary-100 text-primary-800 px-2 py-1 text-sm font-semibold rounded-xs text-xs",
};

export default function FindingsCard({
  title,
  feasibility,
  tag,
  description,
  source,
}: FindingDataProps) {
  return (
    <Card className="px-6">
      <CardTitle>
        <h5 className="font-bold">{title}</h5>
      </CardTitle>
      <div className="flex justify-start gap-2">
        <CardDescription className={tagStyles.positive}>
          <span>{feasibility}</span>
        </CardDescription>
        <CardDescription className={tagStyles.negative}>
          <span>{tag}</span>
        </CardDescription>
      </div>
      <CardContent className="text-muted-foreground flex flex-col gap-4 pl-0">
        <span>{description}</span>
        <span className="text-caption">{source}</span>
      </CardContent>
    </Card>
  );
}
