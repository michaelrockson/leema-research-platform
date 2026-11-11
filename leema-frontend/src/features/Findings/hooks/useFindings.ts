import { useCallback, useState } from "react";
import { findingsService } from "@/features/Findings/services/findingsService";
import { useNotifications } from "@/features/Notifications/hooks/useNotifications";
import type { FindingDataProps } from "@/features/Findings/types";

export function useFindings(onFindingsLoaded: () => void) {
  const [findings, setFindings] = useState<FindingDataProps[]>([]);
  const [isLoadingFindings, setIsLoadingFindings] = useState(false);
  const { notifyError } = useNotifications();

  const refreshFindings = useCallback(async () => {
    setIsLoadingFindings(true);
    try {
      const data = await findingsService.getFindings();
      if (data && data.length > 0) {
        setFindings(data);
        onFindingsLoaded();
      }
    } catch (error) {
      // Keep existing findings on error
      notifyError(
        error instanceof Error ? error.message : "Could not reach the server",
        { title: "Couldn't load your findings" },
      );
    } finally {
      setIsLoadingFindings(false);
    }
  }, [onFindingsLoaded, notifyError]);

  return { findings, setFindings, isLoadingFindings, refreshFindings };
}
