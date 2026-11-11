import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { TextFieldConfig } from "@/features/Settings/settingsFields";

type TextSettingFieldProps = {
  field: TextFieldConfig;
  value: string;
  error?: string;
  onChange: (value: string) => void;
};

export default function TextSettingField({
  field,
  value,
  error,
  onChange,
}: TextSettingFieldProps) {
  const inputId = `setting-${field.key}`;
  const suggestionListId = field.suggestions
    ? `${inputId}-suggestions`
    : undefined;

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={inputId}>{field.label}</FieldLabel>
      <FieldDescription>{field.description}</FieldDescription>
      {field.multiline ? (
        <Textarea
          id={inputId}
          value={value}
          aria-invalid={Boolean(error)}
          spellCheck={false}
          className="h-72 field-sizing-fixed font-mono text-xs leading-relaxed md:text-xs"
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          id={inputId}
          type={field.inputType ?? "text"}
          autoComplete="off"
          placeholder={field.placeholder}
          value={value}
          list={suggestionListId}
          aria-invalid={Boolean(error)}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {field.suggestions && (
        <datalist id={suggestionListId}>
          {field.suggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      )}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
