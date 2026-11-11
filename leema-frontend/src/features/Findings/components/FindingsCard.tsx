import { useId, useState } from "react";
import {
  ArrowBigUp,
  ArrowRight,
  ChevronDown,
  Loader2,
  MessageSquare,
  Trash2,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { cn } from "@/lib/utils";
import type { FindingDataProps } from "@/features/Findings/types.ts";

const opportunityStyles = {
  high: {
    label: "High opportunity",
    className:
      "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300 dark:ring-1 dark:ring-inset dark:ring-green-500/25",
    Icon: TrendingUp,
  },
  medium: {
    label: "Medium opportunity",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-1 dark:ring-inset dark:ring-amber-500/25",
    Icon: Minus,
  },
  low: {
    label: "Low opportunity",
    className:
      "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300 dark:ring-1 dark:ring-inset dark:ring-red-500/25",
    Icon: TrendingDown,
  },
};

const sourceButtonClassName =
  "inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

const countFormatter = new Intl.NumberFormat("en", { notation: "compact" });

function formatCount(count: number) {
  return countFormatter.format(count);
}

function getOpportunityStyle(feasibility: string) {
  const normalized = feasibility.toLowerCase();
  if (normalized.includes("low")) return opportunityStyles.low;
  if (normalized.includes("medium")) return opportunityStyles.medium;
  return opportunityStyles.high;
}

type FindingsCardProps = FindingDataProps & {
  isDeleting: boolean;
  isDeleteDisabled: boolean;
  onDelete: () => void;
};

export default function FindingsCard({
  title,
  feasibility,
  description,
  sentiment,
  source_url,
  source_upvotes,
  source_comments,
  isDeleting,
  isDeleteDisabled,
  onDelete,
}: FindingsCardProps) {
  const opportunity = getOpportunityStyle(feasibility);
  const hasSourceStats = source_upvotes != null || source_comments != null;
  const [isExpanded, setIsExpanded] = useState(false);
  const detailsId = useId();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  return (
    <Card className="gap-0 px-7 py-7 shadow-xs">
      <div className="flex items-start justify-between gap-4">
        <h4 className="text-xl font-bold leading-snug text-foreground">
          {title}
        </h4>
        <Popover open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <PopoverTrigger
            disabled={isDeleteDisabled}
            render={
              <Button
                variant="ghost"
                size="icon"
                className="-mt-1 -mr-2 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Delete problem: ${title}`}
                title="Delete problem"
              />
            }
          >
            {isDeleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </PopoverTrigger>
          <PopoverContent align="end" className="flex w-64 flex-col gap-3">
            <PopoverTitle>Delete this problem?</PopoverTitle>
            <p className="text-sm text-muted-foreground">
              It will be removed from your findings and future reports. This
              can't be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setIsConfirmOpen(false);
                  onDelete();
                }}
              >
                Delete
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div id={detailsId}>
        <p
          className={cn(
            "mt-2 text-muted-foreground leading-relaxed",
            !isExpanded && "line-clamp-2",
          )}
        >
          {description}
        </p>

        {isExpanded && (
          <>
            <h5 className="mt-5 font-semibold text-foreground">
              What people are saying
            </h5>
            <p className="mt-1 text-muted-foreground leading-relaxed">
              {sentiment}
            </p>
          </>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {source_url ? (
          <a
            href={source_url}
            target="_blank"
            rel="noopener noreferrer"
            className={sourceButtonClassName}
          >
            Check source
            <ArrowRight className="size-4" />
          </a>
        ) : (
          <span
            aria-disabled="true"
            title="No source linked yet. Re-run “Identify customer problems” to attach the Reddit post."
            className={cn(
              sourceButtonClassName,
              "cursor-not-allowed opacity-50 hover:bg-background",
            )}
          >
            Check source
            <ArrowRight className="size-4" />
          </span>
        )}
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-semibold",
            opportunity.className,
          )}
        >
          <opportunity.Icon className="size-4" />
          {opportunity.label}
        </span>
        {hasSourceStats && (
          <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
            {source_upvotes != null && (
              <span className="inline-flex items-center gap-1.5">
                <ArrowBigUp className="size-4" />
                {formatCount(source_upvotes)}{" "}
                {source_upvotes === 1 ? "upvote" : "upvotes"}
              </span>
            )}
            {source_comments != null && (
              <span className="inline-flex items-center gap-1.5">
                <MessageSquare className="size-4" />
                {formatCount(source_comments)}{" "}
                {source_comments === 1 ? "comment" : "comments"}
              </span>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsExpanded((wasExpanded) => !wasExpanded)}
          aria-expanded={isExpanded}
          aria-controls={detailsId}
          className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {isExpanded ? "Show less" : "Show details"}
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              isExpanded && "rotate-180",
            )}
          />
        </button>
      </div>
    </Card>
  );
}
