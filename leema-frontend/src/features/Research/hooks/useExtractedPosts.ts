import { useCallback, useState } from "react";
import {
  researchService,
  type ExtractedPost,
} from "@/features/Research/services/researchService";
import { useNotifications } from "@/features/Notifications/hooks/useNotifications";

export function useExtractedPosts(onPostsLoaded: () => void) {
  const [extractedPosts, setExtractedPosts] = useState<ExtractedPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const { notifyError } = useNotifications();

  const refreshExtractions = useCallback(async () => {
    setIsLoadingPosts(true);
    try {
      const response = await researchService.getExtractions();
      const posts = response?.data?.posts || [];
      if (posts.length > 0) {
        setExtractedPosts(posts);
        onPostsLoaded();
      }
    } catch (error) {
      // Keep existing posts on error
      notifyError(
        error instanceof Error ? error.message : "Could not reach the server",
        { title: "Couldn't load conversations" },
      );
    } finally {
      setIsLoadingPosts(false);
    }
  }, [onPostsLoaded, notifyError]);

  return {
    extractedPosts,
    setExtractedPosts,
    isLoadingPosts,
    refreshExtractions,
  };
}
