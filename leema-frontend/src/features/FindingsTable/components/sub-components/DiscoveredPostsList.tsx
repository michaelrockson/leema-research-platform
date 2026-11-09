import { Card } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { ExternalLink } from "lucide-react";
import type { ExtractedPost } from "@/features/ResearchTable/services/researchService.ts";
import FindingsActivityEmptyState from "@/features/FindingsTable/components/sub-components/emptystates/FindingsActivityEmptyState.tsx";

type DiscoveredPostsListProps = {
  posts: ExtractedPost[];
};

export default function DiscoveredPostsList({ posts }: DiscoveredPostsListProps) {
  if (!posts || posts.length === 0) {
    return <FindingsActivityEmptyState />;
  }

  return (
    <div className="flex flex-col gap-3">
      {posts.map((post) => (
        <Card key={post.submission_id || post.id} className="px-6 py-4 flex flex-col gap-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-2.5 py-0.5 text-xs font-semibold bg-muted">
                r/{post.subreddit}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                #{post.submission_id}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
              <span>Upvotes: {post.score}</span>
              <span>Comments: {post.number_of_comments}</span>
              {post.post_url && (
                <a
                  href={post.post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  View conversation
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          </div>
          <h5 className="font-semibold text-foreground pt-1">
            {post.title}
          </h5>
        </Card>
      ))}
    </div>
  );
}
