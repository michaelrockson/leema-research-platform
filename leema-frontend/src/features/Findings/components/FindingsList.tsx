import { useState } from "react";
import { useResearchContext } from "@/context/ResearchContext.tsx";
import FindingsCard from "@/features/Findings/components/FindingsCard.tsx";
import type { FindingDataProps } from "@/features/Findings/types.ts";
import FindingsDiscoveriesEmptyState from "@/features/Findings/components/emptystates/FindingsDiscoveriesEmptyState.tsx";
import FindingsPagination from "@/features/Findings/components/FindingsPagination.tsx";

const FINDINGS_PER_PAGE = 2;

type FindingsListProps = {
  findingData: FindingDataProps[] | undefined;
};

function isSubsetOf(
  updatedFindings: FindingDataProps[] | undefined,
  previousFindings: FindingDataProps[] | undefined,
) {
  if (!updatedFindings || !previousFindings) return false;
  const previousTitles = new Set(
    previousFindings.map((finding) => finding.title),
  );
  return updatedFindings.every((finding) => previousTitles.has(finding.title));
}

export function FindingsList({ findingData }: FindingsListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [previousFindingData, setPreviousFindingData] = useState(findingData);
  const { deletingFindingId, deleteFinding } = useResearchContext();

  if (findingData !== previousFindingData) {
    setPreviousFindingData(findingData);
    if (!isSubsetOf(findingData, previousFindingData)) {
      setCurrentPage(1);
    }
  }

  if (!findingData || findingData.length === 0) {
    return <FindingsDiscoveriesEmptyState />;
  }

  const totalPages = Math.ceil(findingData.length / FINDINGS_PER_PAGE);
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * FINDINGS_PER_PAGE;
  const visibleFindings = findingData.slice(
    pageStartIndex,
    pageStartIndex + FINDINGS_PER_PAGE,
  );

  return (
    <div className="flex flex-col gap-6">
      {visibleFindings.map((finding) => (
        <FindingsCard
          key={finding.id}
          {...finding}
          isDeleting={deletingFindingId === finding.id}
          isDeleteDisabled={deletingFindingId !== null}
          onDelete={() => deleteFinding(finding.id)}
        />
      ))}
      <FindingsPagination
        currentPage={safeCurrentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
