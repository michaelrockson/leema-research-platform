export type FindingDataProps = {
  id: number;
  title: string;
  feasibility: string;
  description: string;
  sentiment: string;
  source_url?: string | null;
  source_upvotes?: number | null;
  source_comments?: number | null;
};
