import { Card, CardContent, CardDescription } from "@/components/ui/card.tsx";
import emptyBoxImage from "@/assets/empty-box.png";

export default function FindingsActivityEmptyState() {
  return (
    <Card className="flex flex-col items-center justify-center gap-4 py-18">
      <CardContent>
        <img
          src={emptyBoxImage}
          alt="No posts discovered yet"
          className="w-40 h-40 object-contain"
        />
      </CardContent>
      <CardDescription className="text-center text-sm text-muted-foreground">
        No conversations found yet. Run “Find conversations” to search your
        selected communities.
      </CardDescription>
    </Card>
  );
}
