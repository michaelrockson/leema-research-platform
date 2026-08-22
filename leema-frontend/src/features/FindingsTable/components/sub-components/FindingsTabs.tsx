import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";
import FindingsCard from "@/features/FindingsTable/components/sub-components/FindingsCard.tsx";
import type { FindingDataProps } from "@/features/FindingsTable/hooks/useFindingsTable.tsx";

type FindingsTabsProps = {
  findingData: FindingDataProps[];
};

export function FindingsTabs({ findingData }: FindingsTabsProps) {
  return (
    <Tabs className="flex flex-col" defaultValue="findings">
      <TabsList variant="default" className="divide-y py-2 px-2">
        <TabsTrigger value="findings">Discoveries</TabsTrigger>
        <TabsTrigger value="details">Activity Logs</TabsTrigger>
      </TabsList>
      <TabsContent value="findings" className="py-2 flex flex-col gap-4">
        {findingData.map((finding) => (
          <FindingsCard key={finding.id} {...finding} />
        ))}
      </TabsContent>
      <TabsContent value="details" className="py-2 flex flex-col gap-4">
        {findingData.map((finding) => (
          <FindingsCard key={finding.id} {...finding} />
        ))}
      </TabsContent>
    </Tabs>
  );
}
