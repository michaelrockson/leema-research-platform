import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  fromDisplayNumber,
  toDisplayNumber,
  type NumberFieldConfig,
} from "@/features/Settings/settingsFields";

type NumberSettingFieldProps = {
  field: NumberFieldConfig;
  value: number;
  error?: string;
  onChange: (value: number) => void;
};

export default function NumberSettingField({
  field,
  value,
  error,
  onChange,
}: NumberSettingFieldProps) {
  const inputId = `setting-${field.key}`;
  const displayValue = Number.isFinite(value)
    ? toDisplayNumber(field, value)
    : "";

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={inputId}>{field.label}</FieldLabel>
      <div className="flex items-center gap-3">
        <Input
          id={inputId}
          type="number"
          inputMode={field.step ? "decimal" : "numeric"}
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          value={displayValue}
          aria-invalid={Boolean(error)}
          className="max-w-40"
          onChange={(event) =>
            onChange(fromDisplayNumber(field, event.target.valueAsNumber))
          }
        />
        {field.unit && (
          <span className="text-sm text-muted-foreground">{field.unit}</span>
        )}
      </div>
      <FieldDescription>{field.description}</FieldDescription>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
