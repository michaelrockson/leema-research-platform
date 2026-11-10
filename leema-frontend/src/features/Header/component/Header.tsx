import { Settings } from "lucide-react";
import DrawerStore from "@/components/DrawerStore.tsx";
import SettingsForm from "@/features/Settings/components/SettingsForm.tsx";

export default function Header() {
  return (
    <div className="flex justify-between">
      <div className="flex flex-col">
        <h2 className="font-bold">Find customer problems worth solving</h2>
        <span className="py-2 text-muted-foreground">
          Explore conversations in your chosen communities to find recurring
          customer pain points and product opportunities.
        </span>
      </div>

      <DrawerStore
        drawerProps={{
          buttonClassName: "py-5 px-3 border-b",
          buttonVariant: "secondary",
          ButtonLabel: <Settings className="size-5" />,
          drawerTitle: "Search settings",
          drawerContent: <SettingsForm />,
          drawerSaveButtonLabel: "Save Changes",
          drawerCancelButtonLabel: "Cancel",
        }}
      />
    </div>
  );
}
