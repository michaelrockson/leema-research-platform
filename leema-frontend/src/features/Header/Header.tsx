import { Settings } from "lucide-react";
import DrawerStore from "@/components/DrawerStore.tsx";
import SettingsForm from "@/features/Settings/components/SettingsForm.tsx";

export default function Header() {
  return (
    <div className="flex justify-between">
      <div className="flex flex-col">
        <h3 className="font-bold">Leema: Customer Problem Discovery</h3>
        <span className="py-2 text-muted-foreground">
          Uncover, validate and prioritize customer pain points from online
          discussions
        </span>
      </div>

      <DrawerStore
        drawerProps={{
          buttonClassName: "py-5 px-3 border-b border-accent",
          buttonVariant: "secondary",
          ButtonLabel: <Settings className="size-5" />,
          drawerTitle: "Settings",
          drawerContent: <SettingsForm />,
          drawerSaveButtonLabel: "Save Changes",
          drawerCancelButtonLabel: "Cancel",
        }}
      />
    </div>
  );
}
