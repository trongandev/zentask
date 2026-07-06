import { Hero } from "../components/Hero";
import { ProgressCard } from "../components/ProgressCard";
import { StatsChart } from "../components/StatsChart";
import { Recommendations } from "../components/Recommendations";

export function Dashboard() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <Hero />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProgressCard />
        <StatsChart />
      </div>

      <Recommendations />
    </div>
  );
}
