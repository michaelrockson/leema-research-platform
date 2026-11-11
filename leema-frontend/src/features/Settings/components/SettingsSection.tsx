import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import NumberSettingField from "@/features/Settings/components/fields/NumberSettingField";
import TextSettingField from "@/features/Settings/components/fields/TextSettingField";
import type { FieldSection } from "@/features/Settings/settingsFields";
import type {
  ResearchSettings,
  SettingKey,
  SettingsErrors,
} from "@/features/Settings/types";

type SettingsSectionProps = {
  section: FieldSection;
  settings: ResearchSettings;
  errors: SettingsErrors;
  onFieldChange: <Key extends SettingKey>(
    key: Key,
    value: ResearchSettings[Key],
  ) => void;
};

export default function SettingsSection({
  section,
  settings,
  errors,
  onFieldChange,
}: SettingsSectionProps) {
  return (
    <FieldSet>
      <FieldLegend>{section.title}</FieldLegend>
      {section.description && (
        <FieldDescription>{section.description}</FieldDescription>
      )}
      <FieldGroup className="gap-6">
        {section.numberFields?.map((field) => (
          <NumberSettingField
            key={field.key}
            field={field}
            value={settings[field.key]}
            error={errors[field.key]}
            onChange={(value) => onFieldChange(field.key, value)}
          />
        ))}
        {section.textFields?.map((field) => (
          <TextSettingField
            key={field.key}
            field={field}
            value={settings[field.key]}
            error={errors[field.key]}
            onChange={(value) => onFieldChange(field.key, value)}
          />
        ))}
      </FieldGroup>
    </FieldSet>
  );
}
