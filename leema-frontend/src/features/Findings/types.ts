export type FindingDataProps = {
  id: string;
  title: string;
  feasibility: string;
  description: string;
  sentiment: string;
  source_url?: string | null;
  source_upvotes?: number | null;
  source_comments?: number | null;
};
