import { Hero } from "../components/Hero";
import { ProgressCard } from "../components/ProgressCard";
import { StatsChart } from "../components/StatsChart";
import { Recommendations } from "../components/Recommendations";
import { RankCard } from "../components/ui/RankCard";
import { DueFlashcards } from "../components/dashboard/DueFlashcards";
import { CalendarCheckin } from "../components/dashboard/CalendarCheckin";
import { Link } from "react-router-dom";
import CTAZaloZentaskCommunity from "../components/dashboard/CTAZaloZentaskCommunity";

export function Dashboard() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <Hero />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 h-full">
          <RankCard showButton={true} />

          <CTAZaloZentaskCommunity className="mt-2" />
        </div>
        <div className="md:col-span-2">
          <StatsChart />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CalendarCheckin />
        <DueFlashcards />
        <ProgressCard />

        <Link to="https://zalo.me/0842034755" target="_blank" className="bg-white rounded-2xl p-1 border border-gray-100 shadow-sm">
          <img src="/lopy-zentask-bot.png" alt="" className=" w-full cursor-pointer" />
        </Link>
        <Link
          to="https://chromewebstore.google.com/detail/lkhjgkjabnfbfblflgkcapamidmfkjnc?utm_source=item-share-cb"
          target="_blank"
          className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm"
        >
          <img src="/zentask-extension-banner.png" alt="" className="h-full w-full cursor-pointer rounded-xl" />
        </Link>
      </div>

      <Recommendations />
    </div>
  );
}
