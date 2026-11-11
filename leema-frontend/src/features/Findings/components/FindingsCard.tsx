import { useId, useState } from "react";
import {
  ArrowBigUp,
  ArrowRight,
  ChevronDown,
  MessageSquare,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import { Card } from "@/components/ui/card.tsx";
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

export default function FindingsCard({
  title,
  feasibility,
  description,
  sentiment,
  source_url,
  source_upvotes,
  source_comments,
}: FindingDataProps) {
  const opportunity = getOpportunityStyle(feasibility);
  const hasSourceStats = source_upvotes != null || source_comments != null;
  const [isExpanded, setIsExpanded] = useState(false);
  const detailsId = useId();

  return (
    <Card className="gap-0 px-7 py-7 shadow-xs">
      <h4 className="text-xl font-bold leading-snug text-foreground">
        {title}
      </h4>
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
