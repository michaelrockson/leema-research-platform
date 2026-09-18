type SaveOptions = {
  label: string;
  value: string;
};

const saveOptions: SaveOptions[] = [
  {
    label: "Save to Notion",
    value: "Notion",
  },
  {
    label: "Save to Email",
    value: "Email",
  },
  {
    label: "Save to PDF",
    value: "PDF",
  },
  {
    label: "Save to CSV",
    value: "CSV",
  },
  {
    label: "All Channels",
    value: "All Channels",
  },
];

export type FindingDataProps = {
  id: number;
  title: string;
  feasibility: string;
  description: string;
  sentiment: string;
};

const findingData: FindingDataProps[] = [
  {
    id: 1,
    title: "PROBLEM STATEMENT",
    feasibility: "High",
    description:
      "Accounting professionals struggle with an opaque and frustrating job application process, receiving numerous rejections (65+ in two months for one user) with little meaningful feedback, despite meeting or exceeding stated qualifications. This creates an opportunity for a career intelligence and support platform.",
    sentiment:
      "Sentiment toward AI automation in accounting is predominantly negative, driven by frustration with unrealistic expectations from non-accounting departments, fear of job displacement, and the perceived burden of implementing and training AI without sufficient support or proven success",
  },
  {
    id: 2,
    title: "PROBLEM STATEMENT",
    feasibility: "High",
    description:
      'Single-person accounting departments and small teams face immense pressure and frustration from management to implement AI for complex tasks like month-end close and financial reporting, without adequate support, realistic expectations, or clear guidance on practical, effective solutions, leading to fear of job displacement and a burden to "teach" AI themselves. This creates an opportunity for specialized, user-friendly AI accounting automation',
    sentiment:
      "Sentiment toward the job market and hiring process in accounting is predominantly negative, driven by profound frustration, confusion, and feelings of being undervalued due to rapid, unexplained rejections and the perception of a broken system.",
  },
];

export default function useFindingsTable() {
  return { saveOptions, findingData };
}
