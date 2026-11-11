export type ResearchSettings = {
  communities: string[];
  signals: string[];
  conversations_per_community: number;
  replies_per_conversation: number;
  max_scout_results: number;
  min_comments: number;
  min_score: number;
  min_upvote_ratio: number;
  recipient_address: string;
  notion_database_id: string;
  agent_model: string;
  scout_model: string;
  scout_objective: string;
  validate_posts_objective: string;
  reddit_max_requests_per_min: number;
  reddit_max_concurrency: number;
  reddit_batch_size: number;
  reddit_batch_delay: number;
  reddit_max_retries: number;
  gemini_max_requests_per_min: number;
  gemini_max_concurrency: number;
  gemini_max_retries: number;
};

export type SettingKey = keyof ResearchSettings;

export type NumberSettingKey = {
  [Key in SettingKey]: ResearchSettings[Key] extends number ? Key : never;
}[SettingKey];

export type TextSettingKey = {
  [Key in SettingKey]: ResearchSettings[Key] extends string ? Key : never;
}[SettingKey];

export type SettingsErrors = Partial<Record<SettingKey, string>>;

export type SettingsTab = "search" | "filters" | "delivery" | "ai" | "limits";
