import { useState } from "react";
import { FieldGroup } from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SettingsSection from "@/features/Settings/components/SettingsSection";
import TagListField from "@/features/Settings/components/fields/TagListField";
import {
  SECTIONS_BY_TAB,
  SETTINGS_TABS,
  tabsWithErrors,
} from "@/features/Settings/settingsFields";
import type {
  ResearchSettings,
  SettingKey,
  SettingsErrors,
  SettingsTab,
} from "@/features/Settings/types";

type SettingsFormProps = {
  settings: ResearchSettings;
  errors: SettingsErrors;
  onFieldChange: <Key extends SettingKey>(
    key: Key,
    value: ResearchSettings[Key],
  ) => void;
};

export default function SettingsForm({
  settings,
  errors,
  onFieldChange,
}: SettingsFormProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("search");
  const invalidTabs = tabsWithErrors(errors);

  return (
    <Tabs
      value={activeTab}
      onValueChange={(tab) => setActiveTab(tab as SettingsTab)}
      className="gap-6"
    >
      <TabsList className="w-full">
        {SETTINGS_TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
            {invalidTabs.has(tab.value) && (
              <span
                aria-label="has errors"
                className="size-1.5 rounded-full bg-destructive"
              />
            )}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="search">
        <FieldGroup className="gap-10">
          <TagListField
            id="setting-communities"
            label="Communities to search"
            description="The subreddits Leema searches for conversations."
            placeholder="e.g. r/smallbusiness"
            items={settings.communities}
            onItemsChange={(communities) =>
              onFieldChange("communities", communities)
            }
            formatItem={(community) => `r/${community}`}
            normalize={(rawValue) => rawValue.trim().replace(/^r\//, "")}
            emptyMessage="Enter a community name."
            duplicateMessage="This community is already added."
            error={errors.communities}
          />
          <TagListField
            id="setting-signals"
            label="Phrases to look for"
            description="Words and phrases that suggest someone is struggling with a problem."
            placeholder="e.g. wish there was"
            items={settings.signals}
            onItemsChange={(signals) => onFieldChange("signals", signals)}
            formatItem={(signal) => `"${signal}"`}
            emptyMessage="Enter a phrase."
            duplicateMessage="This phrase is already added."
            error={errors.signals}
          />
          {SECTIONS_BY_TAB.search.map((section) => (
            <SettingsSection
              key={section.title}
              section={section}
              settings={settings}
              errors={errors}
              onFieldChange={onFieldChange}
            />
          ))}
        </FieldGroup>
      </TabsContent>

      {SETTINGS_TABS.filter((tab) => tab.value !== "search").map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          <FieldGroup className="gap-10">
            {SECTIONS_BY_TAB[tab.value].map((section) => (
              <SettingsSection
                key={section.title}
                section={section}
                settings={settings}
                errors={errors}
                onFieldChange={onFieldChange}
              />
            ))}
          </FieldGroup>
        </TabsContent>
      ))}
    </Tabs>
  );
}
