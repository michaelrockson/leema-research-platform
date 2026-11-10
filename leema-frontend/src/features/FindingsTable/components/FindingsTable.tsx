import { Button } from "@/components/ui/button.tsx";
import FindingsSelect from "@/features/FindingsTable/components/FindingsSelect.tsx";
import { Card, CardContent, CardHeader } from "@/components/ui/card.tsx";
import { FindingsTabs } from "@/features/FindingsTable/components/FindingsTabs.tsx";
import { useResearchContext } from "@/context/ResearchContext.tsx";

export default function FindingsTable() {
  const {
    findings,
    extractedPosts,
    isLoadingFindings,
    selectedChannel,
    setSelectedChannel,
    isSaving,
    saveMessage,
    saveDiscoveries,
  } = useResearchContext();

  return (
    <div className="container mx-auto py-12">
      <Card className="flex flex-col gap-4">
        <CardHeader className="flex justify-between items-center px-6 py-2">
          <div className="flex flex-col">
            <h4>Your findings</h4>
            {saveMessage && (
              <span className="text-sm text-green-600 font-medium pt-1">
                {saveMessage}
              </span>
            )}
          </div>
          <div className="flex justify-between items-center gap-4">
            <FindingsSelect
              value={selectedChannel}
              onValueChange={setSelectedChannel}
            />
            <Button
              className="py-5 px-5"
              disabled={isSaving}
              onClick={() => saveDiscoveries()}
            >
              {isSaving ? "Sending…" : "Send findings"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingFindings ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading your latest findings…
            </div>
          ) : (
            <FindingsTabs
              findingData={findings}
              extractedPosts={extractedPosts}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
