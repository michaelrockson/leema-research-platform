import "./App.css";
import { Section } from "@/components/ui/section.tsx";
import Header from "@/features/Header/component/Header.tsx";
import ResearchTable from "@/features/ResearchTable/component/ResearchTable.tsx";
import FindingsTable from "@/features/FindingsTable/components/FindingsTable.tsx";
import { ResearchProvider } from "@/context/ResearchContext.tsx";
import useScheduledTheme from "@/hooks/useScheduledTheme";

function App() {
  useScheduledTheme();

  return (
    <ResearchProvider>
      <Section>
        <Header />
        <ResearchTable />
        <FindingsTable />
      </Section>
    </ResearchProvider>
  );
}

export default App;
