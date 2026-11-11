import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useTagListInput } from "@/features/Settings/hooks/useTagListInput";

type TagListFieldProps = {
  id: string;
  label: string;
  description: string;
  placeholder: string;
  items: string[];
  onItemsChange: (updatedItems: string[]) => void;
  formatItem: (item: string) => string;
  normalize?: (rawValue: string) => string;
  emptyMessage: string;
  duplicateMessage: string;
  error?: string;
};

export default function TagListField({
  id,
  label,
  description,
  placeholder,
  items,
  onItemsChange,
  formatItem,
  normalize,
  emptyMessage,
  duplicateMessage,
  error,
}: TagListFieldProps) {
  const tagInput = useTagListInput({
    items,
    onItemsChange,
    emptyMessage,
    duplicateMessage,
    normalize,
  });
  const visibleError = tagInput.error ?? error;

  return (
    <Field data-invalid={Boolean(visibleError)}>
      <FieldLabel htmlFor={id}>
        {label} ({items.length})
      </FieldLabel>
      <FieldDescription>{description}</FieldDescription>

      <div className="flex min-h-10 flex-wrap gap-2 py-1">
        {items.map((item, index) => (
          <Badge
            key={item}
            variant="outline"
            className="flex items-center gap-1.5 px-3 py-2"
          >
            {formatItem(item)}
            <button
              type="button"
              aria-label={`Remove ${formatItem(item)}`}
              className="cursor-pointer transition-colors hover:text-destructive"
              onClick={() => tagInput.remove(index)}
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </Badge>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Input
          id={id}
          autoComplete="off"
          placeholder={placeholder}
          value={tagInput.input}
          aria-invalid={Boolean(visibleError)}
          onChange={(event) => {
            tagInput.setInput(event.target.value);
            tagInput.setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              tagInput.add();
            }
          }}
        />
        <Button type="button" className="px-4 py-2" onClick={tagInput.add}>
          Add
        </Button>
      </div>

      {visibleError && <FieldError>{visibleError}</FieldError>}
    </Field>
  );
}
