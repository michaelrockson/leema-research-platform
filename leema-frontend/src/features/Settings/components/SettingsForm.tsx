import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";

const DEFAULT_COMMUNITIES: string[] = [
  "r/sales",
  "r/logistics",
  "r/smallbusiness",
  "r/marketing",
  "r/freelance",
  "r/supplychain",
  "r/ecommerce",
  "r/entrepreneur",
  "r/startups",
  "r/procurement",
  "r/retail",
  "r/manufacturing",
  "r/consulting",
];

const DEFAULT_SIGNALS: string[] = [
  "sales",
  "logistics",
  "smallbusiness",
  "marketing",
  "freelance",
  "supplychain",
  "ecommerce",
  "entrepreneur",
  "startups",
  "procurement",
  "retail",
  "manufacturing",
];

function provideSettingsContent() {
  return {
    settingsHeader: {
      title: "Settings",
      description:
        "Tell Leema where to look and how thorough to be. Everything here has a sensible default, so you only need to change what matters to you.",
    },
    settingsCommunities: {
      title: "Where should we look?",
      description: "Online communities to search for customer complaints.",
    },
    settingsPhrases: {
      title: "What should we listen for?",
      description:
        "Words and phrases that signal someone is frustrated with a problem.",
    },
    settingsConCountTitle: {
      countTitle: "How much should we read per community?",
      replyTitle: "Replies per conversation",
      replyDescription: "Higher numbers find more, but take longer to process.",
    },
  };
}

export default function SettingsForm() {
  const settingsContent = provideSettingsContent();
  const [communities, setCommunities] = useState<string[]>(DEFAULT_COMMUNITIES);
  const [signals, setSignals] = useState<string[]>(DEFAULT_SIGNALS);

  const handleRemoveComChip = (indexToRemove: number) => {
    setCommunities((prev) =>
      prev.filter((_, index) => index !== indexToRemove),
    );
  };

  const handleRemoveSigChip = (indexToRemove: number) => {
    setSignals((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  return (
    <FieldSet>
      <FieldDescription className="pb-5">
        {settingsContent.settingsHeader.description}
      </FieldDescription>
      <FieldGroup className="flex flex-col gap-12">
        <Field>
          <FieldLabel htmlFor="communities">
            {settingsContent.settingsCommunities.title}
          </FieldLabel>
          <FieldDescription>
            {settingsContent.settingsCommunities.description}
          </FieldDescription>
          <div className="flex flex-wrap gap-2">
            {communities.map((chip, index) => (
              <Badge key={chip} variant="outline" className="px-3 py-3">
                {chip}
                <div>
                  <X
                    className="cursor-pointer size-3"
                    onClick={() => handleRemoveComChip(index)}
                  />
                </div>
              </Badge>
            ))}
          </div>

          <div className="flex gap-3 items-center">
            <Input
              id="communities"
              autoComplete="off"
              placeholder="e.g. r/smallbusiness, r/startups"
            />
            <Button className="px-3 py-6">Add</Button>
          </div>
        </Field>

        <Field>
          <FieldLabel htmlFor="phrases">
            {settingsContent.settingsPhrases.title}
          </FieldLabel>
          <FieldDescription>
            {settingsContent.settingsPhrases.description}
          </FieldDescription>
          <div className="flex flex-wrap gap-2">
            {signals.map((chip, index) => (
              <Badge key={chip} variant="outline" className="px-3 py-3">
                {chip}
                <div>
                  <X
                    className="cursor-pointer size-3"
                    onClick={() => handleRemoveSigChip(index)}
                  />
                </div>
              </Badge>
            ))}
          </div>

          <div className="flex gap-3 items-center">
            <Input
              id="phrases"
              autoComplete="off"
              placeholder="e.g. so frustrated, wish there was"
            />
            <Button className="px-3 py-6">Add</Button>
          </div>
        </Field>

        <FieldGroup>
          <FieldLegend>
            {settingsContent.settingsConCountTitle.countTitle}
          </FieldLegend>
          <Field>
            <FieldLabel htmlFor="conversationsPerCommunity">
              Conversations per community
            </FieldLabel>
            <Input
              id="conversationsPerCommunity"
              type="number"
              min={1}
              placeholder="50"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="repliesPerConversation">
              {settingsContent.settingsConCountTitle.replyTitle}
            </FieldLabel>
            <Input
              id="repliesPerConversation"
              type="number"
              min={1}
              placeholder="10"
            />
            <FieldDescription>
              {settingsContent.settingsConCountTitle.replyDescription}
            </FieldDescription>
          </Field>
        </FieldGroup>
      </FieldGroup>
    </FieldSet>
  );
}
