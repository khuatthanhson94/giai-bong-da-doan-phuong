"use client";

import { useTournament } from "@/hooks/useTournament";
import { Card, CardContent } from "@/components/ui/Card";

export default function LivestreamPage() {
  const { settings } = useTournament();
  const url = settings.livestream_url || settings.youtube_live_url;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">🔴 Trực tiếp</h1>
      {url ? (
        <Card className="overflow-hidden">
          <div className="aspect-video">
            <iframe src={url} title="Livestream" className="h-full w-full" allowFullScreen />
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Hiện chưa có luồng trực tiếp. Vui lòng quay lại khi trận đấu diễn ra.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
