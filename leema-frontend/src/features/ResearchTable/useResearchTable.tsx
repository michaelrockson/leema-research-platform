export type Stages = {
  id: number;
  title: string;
  description: string;
  status: string;
};

const stages: Stages[] = [
  {
    id: 1,
    title: "Pain Discovery",
    description: "Scanning target communities for product issues & complaints",
    status: "COMPLETED",
  },
  {
    id: 2,
    title: "Data Collection",
    description: "Gathering full customer conversations & feedback threads",
    status: "COMPLETED",
  },
  {
    id: 3,
    title: "Pain & Urgency Assessment",
    description: "Measuring complaint severity and customer frustration levels",
    status: "COMPLETED",
  },
  {
    id: 4,
    title: "Opportunity Briefs",
    description:
      "Synthesizing recurring problems into actionable product ideas",
    status: "IN PROGRESS",
  },
  {
    id: 5,
    title: "Export & Share",
    description:
      "Delivering formatted findings to Notion and email subscribers",
    status: "NOT STARTED",
  },
];

export default function useResearchTable() {
  return { stages };
}
