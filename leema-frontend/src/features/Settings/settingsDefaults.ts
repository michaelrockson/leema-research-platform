import type { ResearchSettings } from "@/features/Settings/types";

/** Mirrors the defaults in leema-backend/settings/settings.py. */
export const DEFAULT_SETTINGS: ResearchSettings = {
  communities: [
    "accounting",
    "bookkeeping",
    "sales",
    "ecommerce",
    "logistics",
    "supplychain",
    "realtors",
    "propertymanagement",
    "Construction",
    "manufacturing",
    "procurement",
    "restaurantowners",
    "humanresources",
    "recruiting",
    "projectmanagement",
    "insurance",
  ],
  signals: [
    "tired of",
    "frustrated",
    "annoying",
    "hate",
    "nightmare",
    "painful",
    "struggling with",
    "fed up",
    "overwhelmed",
    "burned out",
    "stressful",
    "time consuming",
    "manual process",
    "repetitive",
    "tedious",
    "inefficient",
    "disorganized",
    "messy",
    "confusing",
  ],
  conversations_per_community: 50,
  replies_per_conversation: 50,
  max_scout_results: 60,
  min_comments: 50,
  min_score: 50,
  min_upvote_ratio: 0.5,
  recipient_address: "",
  notion_database_id: "",
  agent_model: "gemini-2.5-flash",
  scout_model: "gemini-2.5-flash",
  reddit_max_requests_per_min: 55,
  reddit_max_concurrency: 5,
  reddit_batch_size: 5,
  reddit_batch_delay: 1.5,
  reddit_max_retries: 5,
  gemini_max_requests_per_min: 10,
  gemini_max_concurrency: 2,
  gemini_max_retries: 4,
};

/**
 * Keep only known settings, in a fixed key order, with defaults for anything
 * missing. Makes copies from the server and from storage directly comparable.
 */
export function toResearchSettings(
  source: Partial<ResearchSettings> | null | undefined,
): ResearchSettings {
  const settings = { ...DEFAULT_SETTINGS };
  if (!source) return settings;
  for (const key of Object.keys(
    DEFAULT_SETTINGS,
  ) as (keyof ResearchSettings)[]) {
    const value = source[key];
    if (value !== undefined && value !== null) {
      Object.assign(settings, { [key]: value });
    }
  }
  return settings;
}
