import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

type FindingsPaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export default function FindingsPagination({
  currentPage,
  totalPages,
  onPageChange,
}: FindingsPaginationProps) {
  if (totalPages <= 1) return null;

  const pageNumbers = Array.from(
    { length: totalPages },
    (_, pageIndex) => pageIndex + 1
  );

  return (
    <nav
      aria-label="Problem insights pages"
      className="flex items-center justify-end gap-1 pt-2"
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        <ChevronLeft />
        Previous
      </Button>
      {pageNumbers.map((pageNumber) => (
        <Button
          key={pageNumber}
          variant={pageNumber === currentPage ? "outline" : "ghost"}
          size="icon-sm"
          onClick={() => onPageChange(pageNumber)}
          aria-current={pageNumber === currentPage ? "page" : undefined}
        >
          {pageNumber}
        </Button>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        Next
        <ChevronRight />
      </Button>
    </nav>
  );
}
