import { Card, CardContent, CardDescription } from "@/components/ui/card.tsx";
import noDataImage from "@/assets/no-data.png";

export default function FindingsDiscoveriesEmptyState() {
  return (
    <Card className="flex flex-col items-center justify-center gap-4 py-18">
      <CardContent>
        <img
          src={noDataImage}
          alt="No findings available"
          className="w-32 h-32 object-contain"
        />
      </CardContent>
      <CardDescription className="text-center text-sm text-muted-foreground">
        There are currently no findings to display. Please check back later.
      </CardDescription>
    </Card>
  );
}
