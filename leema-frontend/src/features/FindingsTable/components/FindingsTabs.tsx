import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";
import FindingsCard from "@/features/FindingsTable/components/FindingsCard.tsx";
import type { FindingDataProps } from "@/features/FindingsTable/types.ts";
import type { ExtractedPost } from "@/features/ResearchTable/services/researchService.ts";
import FindingsDiscoveriesEmptyState from "@/features/FindingsTable/components/emptystates/FindingsDiscoveriesEmptyState.tsx";
import DiscoveredPostsList from "@/features/FindingsTable/components/DiscoveredPostsList.tsx";

type FindingsTabsProps = {
  findingData: FindingDataProps[] | undefined;
  extractedPosts?: ExtractedPost[];
};

export function FindingsTabs({
  findingData,
  extractedPosts = [],
}: FindingsTabsProps) {
  return (
    <Tabs className="flex flex-col" defaultValue="findings">
      <TabsList variant="default" className="divide-y py-2 px-2">
        <TabsTrigger value="findings">
          Problem insights{" "}
          {findingData && findingData.length > 0
            ? `(${findingData.length})`
            : ""}
        </TabsTrigger>
        <TabsTrigger value="posts">
          Source conversations{" "}
          {extractedPosts.length > 0 ? `(${extractedPosts.length})` : ""}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="findings" className="py-2 flex flex-col gap-4">
        {findingData && findingData.length > 0 ? (
          findingData.map((finding) => (
            <FindingsCard key={finding.id} {...finding} />
          ))
        ) : (
          <FindingsDiscoveriesEmptyState />
        )}
      </TabsContent>
      <TabsContent value="posts" className="py-2 flex flex-col gap-4">
        <DiscoveredPostsList posts={extractedPosts} />
      </TabsContent>
    </Tabs>
  );
}
