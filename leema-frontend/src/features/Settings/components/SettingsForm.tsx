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
import { X, Loader2, Check, RefreshCw } from "lucide-react";
import useSettings from "@/features/Settings/hooks/useSettingsForm.tsx";

const settingsContent = {
  header: {
    description:
      "Choose where to search and which phrases may signal a problem. Your community and phrase changes are saved automatically to the server.",
  },
  communities: {
    title: "Communities to search",
    description: "Choose the online communities to search for conversations.",
  },
  phrases: {
    title: "Phrases to look for",
    description:
      "Words and phrases that may signal someone is struggling with a problem.",
  },
  counts: {
    title: "How much should we review?",
    repliesTitle: "Replies to review per conversation",
    repliesDescription:
      "Reviewing more replies may find more insights, but takes longer.",
  },
};

export default function SettingsForm() {
  const {
    isLoading,
    isSaving,
    saveSuccess,
    saveError,
    error,
    communities,
    signals,
    conversationsPerCommunity,
    repliesPerConversation,
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
    updateConversationsPerCommunity,
    updateRepliesPerConversation,
    resetToDefaults,
    reloadSettings,
  } = useSettings();

  // Loading state before dynamic settings are fetched
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          Loading settings from server...
        </p>
      </div>
    );
  }

  // Error state with retry
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={reloadSettings}>
          <RefreshCw className="mr-2 size-4" />
          Retry loading settings
        </Button>
      </div>
    );
  }

  return (
    <FieldSet>
      <div className="flex items-center justify-between pb-4">
        <FieldDescription>
          {settingsContent.header.description}
        </FieldDescription>

        <div className="flex items-center gap-2 text-xs">
          {isSaving && (
            <span className="flex items-center text-muted-foreground gap-1">
              <Loader2 className="size-3 animate-spin" /> Saving...
            </span>
          )}
          {saveSuccess && (
            <span className="flex items-center text-emerald-500 gap-1 font-medium">
              <Check className="size-3" /> Saved
            </span>
          )}
          {saveError && !isSaving && (
            <span role="alert" className="text-destructive font-medium">
              {saveError}
            </span>
          )}
        </div>

        <Button
            variant="destructive"
            size="sm"
            onClick={resetToDefaults}
            className="text-xs"
          >
            Reset to Defaults
          </Button>
      </div>

      <FieldGroup className="flex flex-col gap-10">
        {/* Communities Section */}
        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="communities">
              {settingsContent.communities.title} ({communities.length})
            </FieldLabel>
          </div>

          <FieldDescription>
            {settingsContent.communities.description}
          </FieldDescription>

          <div className="flex flex-wrap gap-2 min-h-10 py-1">
            {communities.map((community, index) => (
              <Badge
                key={community}
                variant="outline"
                className="px-3 py-2 flex items-center gap-1.5"
              >
                r/{community}
                <button
                  type="button"
                  aria-label={`Remove r/${community}`}
                  className="cursor-pointer hover:text-destructive transition-colors"
                  onClick={() => removeCommunity(index)}
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
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
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCommunity();
                }
              }}
            />

            <Button className="px-4 py-2" onClick={addCommunity}>
              Add
            </Button>
          </div>

          {communityError && (
            <FieldDescription className="text-destructive font-medium">
              {communityError}
            </FieldDescription>
          )}
        </Field>

        {/* Phrases / Signals Section */}
        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="phrases">
              {settingsContent.phrases.title} ({signals.length})
            </FieldLabel>
          </div>

          <FieldDescription>
            {settingsContent.phrases.description}
          </FieldDescription>

          <div className="flex flex-wrap gap-2 min-h-10 py-1">
            {signals.map((signal, index) => (
              <Badge
                key={signal}
                variant="outline"
                className="px-3 py-2 flex items-center gap-1.5"
              >
                "{signal}"
                <button
                  type="button"
                  aria-label={`Remove ${signal}`}
                  className="cursor-pointer hover:text-destructive transition-colors"
                  onClick={() => removeSignal(index)}
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
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
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addSignal();
                }
              }}
            />

            <Button className="px-4 py-2" onClick={addSignal}>
              Add
            </Button>
          </div>

          {signalError && (
            <FieldDescription className="text-destructive font-medium">
              {signalError}
            </FieldDescription>
          )}
        </Field>

        {/* Numeric Limits Section */}
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
              value={conversationsPerCommunity}
              onChange={(event) => {
                const parsedCount = parseInt(event.target.value, 10);
                if (!isNaN(parsedCount) && parsedCount > 0) {
                  updateConversationsPerCommunity(parsedCount);
                }
              }}
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
              value={repliesPerConversation}
              onChange={(event) => {
                const parsedCount = parseInt(event.target.value, 10);
                if (!isNaN(parsedCount) && parsedCount > 0) {
                  updateRepliesPerConversation(parsedCount);
                }
              }}
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
