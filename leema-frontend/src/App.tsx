import "./App.css";
import { Section } from "@/components/ui/section.tsx";
import Header from "@/features/Header/component/Header.tsx";
import HeaderBar from "@/features/Header/component/HeaderBar.tsx";
import Research from "@/features/Research/component/Research.tsx";
import Findings from "@/features/Findings/components/Findings.tsx";
import { ResearchProvider } from "@/context/ResearchContext.tsx";
import { NotificationsProvider } from "@/features/Notifications/components/NotificationsProvider.tsx";

function App() {
  return (
    <NotificationsProvider>
      <ResearchProvider>
        <HeaderBar />
        <Section>
          <Header />
          <Research />
          <Findings />
        </Section>
      </ResearchProvider>
    </NotificationsProvider>
  );
}

export default App;
