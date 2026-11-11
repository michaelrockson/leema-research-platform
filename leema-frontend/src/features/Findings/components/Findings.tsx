import { Button } from "@/components/ui/button.tsx";
import FindingsSelect from "@/features/Findings/components/FindingsSelect.tsx";
import { FindingsList } from "@/features/Findings/components/FindingsList.tsx";
import { useResearchContext } from "@/context/ResearchContext.tsx";
import { findingsExportService } from "@/features/Findings/services/findingsExportService.ts";

export default function Findings() {
  const {
    findings,
    isLoadingFindings,
    selectedChannel,
    setSelectedChannel,
    isSaving,
    saveDiscoveries,
  } = useResearchContext();
  const isFileExport =
    findingsExportService.isFileExportFormat(selectedChannel);

  return (
    <div className="container mx-auto pt-24 pb-16">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex flex-col">
            <h4>
              Your findings
              {findings.length > 0 && (
                <span className="text-muted-foreground font-normal">
                  {" "}
                  ({findings.length})
                </span>
              )}
            </h4>
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
              {isFileExport
                ? isSaving
                  ? "Preparing file…"
                  : "Download findings"
                : isSaving
                  ? "Saving…"
                  : "Save findings"}
            </Button>
          </div>
        </div>
        <div>
          {isLoadingFindings ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading your latest findings…
            </div>
          ) : (
            <FindingsList findingData={findings} />
          )}
        </div>
      </div>
    </div>
  );
}
