import type {
  NumberSettingKey,
  ResearchSettings,
  SettingKey,
  SettingsErrors,
  SettingsTab,
  TextSettingKey,
} from "@/features/Settings/types";

export type NumberFieldConfig = {
  key: NumberSettingKey;
  label: string;
  description: string;
  min: number;
  max?: number;
  step?: number;
  unit?: string;
  displayScale?: number;
};

export type TextFieldConfig = {
  key: TextSettingKey;
  label: string;
  description: string;
  placeholder?: string;
  inputType?: "text" | "email";
  suggestions?: string[];
  multiline?: boolean;
  required?: boolean;
  minLength?: number;
};

export type FieldSection = {
  title: string;
  description?: string;
  numberFields?: NumberFieldConfig[];
  textFields?: TextFieldConfig[];
};

export const SETTINGS_TABS: { value: SettingsTab; label: string }[] = [
  { value: "search", label: "Search" },
  { value: "filters", label: "Filters" },
  { value: "delivery", label: "Delivery" },
  { value: "ai", label: "AI" },
  { value: "limits", label: "Limits" },
];

const GEMINI_MODEL_SUGGESTIONS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
];

export const SEARCH_VOLUME_SECTION: FieldSection = {
  title: "How much to review",
  numberFields: [
    {
      key: "conversations_per_community",
      label: "Conversations to check per community",
      description:
        "How many recent conversations to look through in each community for every group of phrases.",
      min: 1,
      max: 250,
    },
    {
      key: "replies_per_conversation",
      label: "Replies to read per conversation",
      description:
        "Reading more replies can surface more detail, but runs take longer.",
      min: 0,
      max: 500,
    },
    {
      key: "max_scout_results",
      label: "Most conversations to analyze per run",
      description:
        "Caps how many matching conversations are sent to the AI, keeping runs fast and within free-tier limits.",
      min: 1,
      max: 500,
    },
  ],
};

export const FILTER_SECTION: FieldSection = {
  title: "Only keep conversations that are popular enough",
  description:
    "Conversations below any of these thresholds are skipped. Lower them to find more, raise them to focus on the most discussed problems.",
  numberFields: [
    {
      key: "min_comments",
      label: "Minimum replies",
      description: "Skip conversations with fewer replies than this.",
      min: 0,
      max: 100000,
    },
    {
      key: "min_score",
      label: "Minimum upvotes",
      description: "Skip conversations with a lower score than this.",
      min: 0,
      max: 100000,
    },
    {
      key: "min_upvote_ratio",
      label: "Minimum approval",
      description:
        "The share of votes that must be upvotes. 50% means at least half.",
      min: 0,
      max: 100,
      unit: "%",
      displayScale: 100,
    },
  ],
};

export const DELIVERY_SECTION: FieldSection = {
  title: "Where reports are sent",
  description:
    "Leave a field empty to use the server's default. Sign-in details for Notion and email stay on the server and are not editable here.",
  textFields: [
    {
      key: "recipient_address",
      label: "Send email reports to",
      description: "The inbox that receives the findings report.",
      placeholder: "name@company.com",
      inputType: "email",
    },
    {
      key: "notion_database_id",
      label: "Notion database ID",
      description:
        "The 32-character ID from your Notion database link, where report pages are created.",
      placeholder: "e.g. 1a2b3c4d5e6f…",
    },
  ],
};

export const AI_MODEL_SECTION: FieldSection = {
  title: "Models",
  textFields: [
    {
      key: "scout_model",
      label: "Screening model",
      description:
        "Reads each conversation and decides whether it describes a problem software could solve.",
      suggestions: GEMINI_MODEL_SUGGESTIONS,
      required: true,
    },
    {
      key: "agent_model",
      label: "Analysis model",
      description:
        "Groups the screened conversations into problem statements and opportunities.",
      suggestions: GEMINI_MODEL_SUGGESTIONS,
      required: true,
    },
  ],
};

export const AI_INSTRUCTIONS_SECTION: FieldSection = {
  title: "Instructions",
  description:
    "The exact instructions given to each model. Change these carefully: the findings list depends on the output format they describe.",
  textFields: [
    {
      key: "validate_posts_objective",
      label: "Screening instructions",
      description: "Tells the screening model which conversations to keep.",
      multiline: true,
      required: true,
      minLength: 20,
    },
    {
      key: "scout_objective",
      label: "Analysis instructions",
      description:
        "Tells the analysis model how to write each problem, including the HEADLINE and PROBLEM STATEMENT format.",
      multiline: true,
      required: true,
      minLength: 20,
    },
  ],
};

export const REDDIT_LIMITS_SECTION: FieldSection = {
  title: "Reddit",
  description:
    "Reddit blocks apps that send more than 60 requests a minute. The defaults stay safely below that.",
  numberFields: [
    {
      key: "reddit_max_requests_per_min",
      label: "Requests per minute",
      description: "Must stay below Reddit's limit of 60.",
      min: 1,
      max: 60,
    },
    {
      key: "reddit_max_concurrency",
      label: "Requests at the same time",
      description: "How many requests can be in progress at once.",
      min: 1,
      max: 20,
    },
    {
      key: "reddit_batch_size",
      label: "Searches per batch",
      description: "Searches are sent in groups of this size.",
      min: 1,
      max: 50,
    },
    {
      key: "reddit_batch_delay",
      label: "Pause between batches",
      description: "Waiting between groups spreads requests out.",
      min: 0,
      max: 30,
      step: 0.5,
      unit: "seconds",
    },
    {
      key: "reddit_max_retries",
      label: "Attempts when rate limited",
      description: "How many times a request is tried before giving up.",
      min: 1,
      max: 10,
    },
  ],
};

export const GEMINI_LIMITS_SECTION: FieldSection = {
  title: "Gemini",
  description: "Match these to the limits of your Gemini plan.",
  numberFields: [
    {
      key: "gemini_max_requests_per_min",
      label: "Requests per minute",
      description: "The free tier allows about 10.",
      min: 1,
      max: 1000,
    },
    {
      key: "gemini_max_concurrency",
      label: "Requests at the same time",
      description: "How many AI requests can be in progress at once.",
      min: 1,
      max: 10,
    },
    {
      key: "gemini_max_retries",
      label: "Attempts when rate limited",
      description: "How many times a request is tried before giving up.",
      min: 1,
      max: 10,
    },
  ],
};

export const SECTIONS_BY_TAB: Record<SettingsTab, FieldSection[]> = {
  search: [SEARCH_VOLUME_SECTION],
  filters: [FILTER_SECTION],
  delivery: [DELIVERY_SECTION],
  ai: [AI_MODEL_SECTION, AI_INSTRUCTIONS_SECTION],
  limits: [REDDIT_LIMITS_SECTION, GEMINI_LIMITS_SECTION],
};

const ALL_SECTIONS = Object.values(SECTIONS_BY_TAB).flat();

function sectionKeys(section: FieldSection): SettingKey[] {
  return [
    ...(section.numberFields ?? []).map((field) => field.key),
    ...(section.textFields ?? []).map((field) => field.key),
  ];
}

export function tabsWithErrors(errors: SettingsErrors): Set<SettingsTab> {
  const tabs = new Set<SettingsTab>();
  if (errors.communities || errors.signals) tabs.add("search");
  for (const [tab, sections] of Object.entries(SECTIONS_BY_TAB)) {
    if (sections.flatMap(sectionKeys).some((key) => errors[key])) {
      tabs.add(tab as SettingsTab);
    }
  }
  return tabs;
}

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function toDisplayNumber(field: NumberFieldConfig, storedValue: number) {
  return Math.round(storedValue * (field.displayScale ?? 1) * 1e6) / 1e6;
}

export function fromDisplayNumber(
  field: NumberFieldConfig,
  displayValue: number,
) {
  return displayValue / (field.displayScale ?? 1);
}

function validateNumber(field: NumberFieldConfig, storedValue: number) {
  const displayValue = toDisplayNumber(field, storedValue);
  if (!Number.isFinite(displayValue)) return "Enter a number.";
  if (!field.step && !Number.isInteger(displayValue)) {
    return "Enter a whole number.";
  }
  if (displayValue < field.min) return `Must be at least ${field.min}.`;
  if (field.max !== undefined && displayValue > field.max) {
    return `Must be ${field.max} or less.`;
  }
  return null;
}

function validateText(field: TextFieldConfig, value: string) {
  const trimmed = value.trim();
  if (field.required && !trimmed) return "This can't be empty.";
  if (field.minLength && trimmed.length < field.minLength) {
    return `Must be at least ${field.minLength} characters.`;
  }
  if (field.inputType === "email" && trimmed && !EMAIL_PATTERN.test(trimmed)) {
    return "Enter a valid email address.";
  }
  return null;
}

export function validateSettings(settings: ResearchSettings): SettingsErrors {
  const errors: SettingsErrors = {};

  if (settings.communities.length === 0) {
    errors.communities = "Add at least one community.";
  }
  if (settings.signals.length === 0) {
    errors.signals = "Add at least one phrase.";
  }

  for (const section of ALL_SECTIONS) {
    for (const field of section.numberFields ?? []) {
      const error = validateNumber(field, settings[field.key]);
      if (error) errors[field.key] = error;
    }
    for (const field of section.textFields ?? []) {
      const error = validateText(field, settings[field.key]);
      if (error) errors[field.key] = error;
    }
  }

  return errors;
}
