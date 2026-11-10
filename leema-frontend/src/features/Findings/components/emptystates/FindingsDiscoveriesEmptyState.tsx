import { Card, CardContent, CardDescription } from "@/components/ui/card.tsx";
import emptyBoxImage from "@/assets/empty-box.png";

export default function FindingsDiscoveriesEmptyState() {
  return (
    <Card className="flex flex-col items-center justify-center gap-4 py-18">
      <CardContent>
        <img
          src={emptyBoxImage}
          alt="No findings available"
          className="w-32 h-32 object-contain"
        />
      </CardContent>
      <CardDescription className="text-center text-sm text-muted-foreground">
        No problem insights yet. Run “Identify customer problems” after
        collecting conversations.
      </CardDescription>
    </Card>
  );
}
