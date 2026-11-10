import { useResearchContext } from "@/context/ResearchContext.tsx";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

const saveOptions = [
  { label: "Notion", value: "Notion" },
  { label: "Email", value: "Email" },
  { label: "PDF", value: "PDF" },
  { label: "CSV", value: "CSV" },
  { label: "All channels", value: "All Channels" },
];

type FindingsSelectProps = {
  value?: string;
  onValueChange?: (selectedValue: string) => void;
};

export default function FindingsSelect({
  value,
  onValueChange,
}: FindingsSelectProps) {
  const { selectedChannel, setSelectedChannel } = useResearchContext();

  const currentValue = value ?? selectedChannel;
  const handleChange = onValueChange ?? setSelectedChannel;

  return (
    <Select
      items={saveOptions}
      value={currentValue}
      onValueChange={(selectedValue) => {
        if (typeof selectedValue === "string") {
          handleChange(selectedValue);
        }
      }}
    >
      <SelectTrigger className="px-5 py-5 min-w-[180px]">
        <SelectValue placeholder="Send findings to…" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {saveOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
