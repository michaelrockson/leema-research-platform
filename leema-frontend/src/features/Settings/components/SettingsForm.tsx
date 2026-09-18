import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import useSettings from "@/features/Settings/useSettingsForm.tsx";

const settingsContent = {
  header: {
    description:
      "Tell Leema where to look and how thorough to be. Everything here has a sensible default, so you only need to change what matters to you.",
  },
  communities: {
    title: "Where should we look?",
    description: "Online communities to search for customer complaints.",
  },
  phrases: {
    title: "What should we listen for?",
    description:
      "Words and phrases that signal someone is frustrated with a problem.",
  },
  counts: {
    title: "How much should we read per community?",
    repliesTitle: "Replies per conversation",
    repliesDescription: "Higher numbers find more, but take longer to process.",
  },
};

export default function SettingsForm() {
  const {
    communities,
    signals,
    communityInput,
    signalInput,
    communityError,
    signalError,
    setCommunityInput,
    setSignalInput,
    setCommunityError,
    setSignalError,
    addCommunity,
    removeCommunity,
    addSignal,
    removeSignal,
  } = useSettings();

  return (
    <FieldSet>
      <FieldDescription className="pb-5">
        {settingsContent.header.description}
      </FieldDescription>

      <FieldGroup className="flex flex-col gap-12">
        <Field>
          <FieldLabel htmlFor="communities">
            {settingsContent.communities.title}
          </FieldLabel>

          <FieldDescription>
            {settingsContent.communities.description}
          </FieldDescription>

          <div className="flex flex-wrap gap-2">
            {communities.map((community, index) => (
              <Badge key={community} variant="outline" className="px-3 py-3">
                {community}

                <X
                  className="size-3 cursor-pointer"
                  onClick={() => removeCommunity(index)}
                />
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Input
              id="communities"
              autoComplete="off"
              placeholder="e.g. r/smallbusiness, r/startups"
              value={communityInput}
              onChange={(event) => {
                setCommunityInput(event.target.value);
                setCommunityError(null);
              }}
            />

            <Button className="px-3 py-6" onClick={addCommunity}>
              Add
            </Button>
          </div>

          {communityError && (
            <FieldDescription className="text-red-500">
              {communityError}
            </FieldDescription>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="phrases">
            {settingsContent.phrases.title}
          </FieldLabel>

          <FieldDescription>
            {settingsContent.phrases.description}
          </FieldDescription>

          <div className="flex flex-wrap gap-2">
            {signals.map((signal, index) => (
              <Badge key={signal} variant="outline" className="px-3 py-3">
                {signal}

                <X
                  className="size-3 cursor-pointer"
                  onClick={() => removeSignal(index)}
                />
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Input
              id="phrases"
              autoComplete="off"
              placeholder="e.g. so frustrated, wish there was"
              value={signalInput}
              onChange={(event) => {
                setSignalInput(event.target.value);
                setSignalError(null);
              }}
            />

            <Button className="px-3 py-6" onClick={addSignal}>
              Add
            </Button>
          </div>

          {signalError && (
            <FieldDescription className="text-red-500">
              {signalError}
            </FieldDescription>
          )}
        </Field>

        <FieldGroup>
          <FieldLegend>{settingsContent.counts.title}</FieldLegend>

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
              {settingsContent.counts.repliesTitle}
            </FieldLabel>

            <Input
              id="repliesPerConversation"
              type="number"
              min={1}
              placeholder="10"
            />

            <FieldDescription>
              {settingsContent.counts.repliesDescription}
            </FieldDescription>
          </Field>
        </FieldGroup>
      </FieldGroup>
    </FieldSet>
  );
}
