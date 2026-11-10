import { Moon, Settings, Sun } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import DrawerStore from "@/components/DrawerStore.tsx";
import SettingsForm from "@/features/Settings/components/SettingsForm.tsx";
import { useResearchContext } from "@/context/ResearchContext.tsx";
import useScheduledTheme from "@/hooks/useScheduledTheme";

export default function HeaderBar() {
  const { isRunning, runFullResearchScan } = useResearchContext();
  const { isDark, toggleTheme } = useScheduledTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6 lg:px-16">
        <a
          href="/"
          className="inline-flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <img src="/favicon.svg" alt="" className="size-7" />
          <span className="text-lg font-bold tracking-tight text-foreground">
            Leema
          </span>
        </a>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="size-10 rounded-lg"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </Button>

          <Button
            className="h-10 rounded-lg px-4 font-semibold"
            disabled={isRunning}
            onClick={() => runFullResearchScan()}
          >
            {isRunning ? "Running…" : "Run all steps"}
          </Button>

          <DrawerStore
            drawerProps={{
              buttonClassName: "size-10 rounded-lg bg-card",
              buttonVariant: "outline",
              ButtonLabel: (
                <Settings className="size-5" aria-label="Search settings" />
              ),
              drawerTitle: "Search settings",
              drawerContent: <SettingsForm />,
              drawerSaveButtonLabel: "Save Changes",
              drawerCancelButtonLabel: "Cancel",
            }}
          />
        </div>
      </div>
    </header>
  );
}
