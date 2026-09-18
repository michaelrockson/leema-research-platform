import { Card, CardContent, CardDescription } from "@/components/ui/card.tsx";
import emptyBoxImage from "@/assets/empty-box.png";

export default function FindingsActivityEmptyState() {
  return (
    <Card className="flex flex-col items-center justify-center gap-4 py-18">
      <CardContent>
        <img
          src={emptyBoxImage}
          alt="No findings available"
          className="w-40 h-40 object-contain"
        />
      </CardContent>
      <CardDescription className="text-center text-sm text-muted-foreground">
        There are currently no activities to display. Please check back later.
      </CardDescription>
    </Card>
  );
}
