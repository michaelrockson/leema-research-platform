import { useState } from "react";
import { Loader2, RotateCcw, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import SettingsForm from "@/features/Settings/components/SettingsForm";
import { useSettingsDraft } from "@/features/Settings/hooks/useSettingsDraft";

export default function SettingsDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const settings = useSettingsDraft();

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) settings.load();
  };

  const handleSave = async () => {
    if (await settings.save()) setIsOpen(false);
  };

  const canSave =
    settings.hasChanges && !settings.hasErrors && !settings.isSaving;

  return (
    <Drawer
      swipeDirection="right"
      open={isOpen}
      onOpenChange={handleOpenChange}
    >
      <DrawerTrigger
        render={
          <Button
            variant="outline"
            className="size-10 rounded-lg bg-card"
            aria-label="Settings"
            title="Settings"
          />
        }
      >
        <Settings className="size-5" />
      </DrawerTrigger>

      <DrawerContent>
        <DrawerHeader className="border-b py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <DrawerTitle>
                <h3>Settings</h3>
              </DrawerTitle>
              <DrawerDescription>
                Changes are only applied when you click Save.
              </DrawerDescription>
            </div>
            <DrawerClose
              render={<Button variant="outline" className="px-2 py-2" />}
            >
              <X />
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4">
          <SettingsForm
            settings={settings.draft}
            errors={settings.errors}
            onFieldChange={settings.updateField}
          />
        </div>

        <DrawerFooter className="border-t">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="ghost"
              disabled={settings.isSaving}
              onClick={settings.restoreDefaults}
            >
              <RotateCcw className="size-4" />
              Restore defaults
            </Button>

            <div className="flex items-center gap-3">
              {settings.hasErrors && (
                <span className="text-xs text-destructive">
                  Fix the highlighted fields to save.
                </span>
              )}
              {!settings.hasErrors && settings.hasChanges && (
                <span className="text-xs text-muted-foreground">
                  Unsaved changes
                </span>
              )}
              <DrawerClose
                render={<Button variant="outline" className="px-6 py-6" />}
              >
                Cancel
              </DrawerClose>
              <Button
                className="px-6 py-6"
                disabled={!canSave}
                onClick={handleSave}
              >
                {settings.isSaving && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                {settings.isSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
