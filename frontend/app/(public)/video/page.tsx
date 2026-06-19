"use client";

import { useQuery } from "@tanstack/react-query";
import { galleryApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardContent } from "@/components/ui/Card";

export default function VideoPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["gallery-videos"],
    queryFn: () => galleryApi.list({ type: "video" }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Video</h1>
      {isLoading ? (
        <Skeleton className="aspect-video" />
      ) : (data ?? []).length === 0 ? (
        <p className="text-muted-foreground">Chưa có video.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {(data ?? []).map((item) => (
            <Card key={item.id} className="overflow-hidden">
              {item.video_url && (
                <div className="aspect-video">
                  <iframe
                    src={item.video_url}
                    title={item.title}
                    className="h-full w-full"
                    allowFullScreen
                  />
                </div>
              )}
              <CardContent className="p-4">
                <h3 className="font-semibold">{item.title}</h3>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
