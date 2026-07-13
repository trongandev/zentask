import { Hero } from "../components/Hero";
import { ProgressCard } from "../components/ProgressCard";
import { StatsChart } from "../components/StatsChart";
import { Recommendations } from "../components/Recommendations";
import { RankCard } from "../components/shared/RankCard";
import { DueFlashcards } from "../components/dashboard/DueFlashcards";
import { CalendarCheckin } from "../components/dashboard/CalendarCheckin";
import { SEO } from "../components/SEO";

export function Dashboard() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <SEO title="Bảng điều khiển" />
      <Hero />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 h-full">
          <RankCard showButton={true} />
        </div>
        <div className="md:col-span-2">
          <StatsChart />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CalendarCheckin />
        <DueFlashcards />
        <ProgressCard />
      </div>

      <Recommendations />
    </div>
  );
}
