import { HeroBanner } from "@/components/home/HeroBanner";
import { UpcomingMatches } from "@/components/home/UpcomingMatches";
import { LatestResults } from "@/components/home/LatestResults";
import { StandingsWidget } from "@/components/home/StandingsWidget";
import { TopScorers } from "@/components/home/TopScorers";
import { MvpWidget } from "@/components/home/MvpWidget";
import { SponsorsSection } from "@/components/home/SponsorsSection";
import { GalleryPreview } from "@/components/home/GalleryPreview";
import { FeaturedNews } from "@/components/home/FeaturedNews";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <HeroBanner />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <UpcomingMatches />
          <FeaturedNews />
          <GalleryPreview />
        </div>
        <div className="space-y-6">
          <LatestResults />
          <StandingsWidget />
          <TopScorers />
          <MvpWidget />
        </div>
      </div>
      <SponsorsSection />
    </div>
  );
}
