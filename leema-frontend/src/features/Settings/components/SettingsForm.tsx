import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input.tsx";

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

  return (
    <FieldSet>
      <FieldDescription className="pb-5">
        {settingsContent.settingsHeader.description}
      </FieldDescription>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="communities">
            {settingsContent.settingsCommunities.title}
          </FieldLabel>
          <FieldDescription>
            {settingsContent.settingsCommunities.description}
          </FieldDescription>
          <Input
            id="communities"
            autoComplete="off"
            placeholder="e.g. r/smallbusiness, r/startups"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="phrases">
            {settingsContent.settingsPhrases.title}
          </FieldLabel>
          <FieldDescription>
            {settingsContent.settingsPhrases.description}
          </FieldDescription>
          <Input
            id="phrases"
            autoComplete="off"
            placeholder="e.g. so frustrated, wish there was"
          />
        </Field>

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
    </FieldSet>
  );
}
