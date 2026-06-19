"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { galleryApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { resolveMediaUrl } from "@/lib/utils";

export function GalleryPreview() {
  const { data, isLoading } = useQuery({
    queryKey: ["gallery-preview"],
    queryFn: () => galleryApi.list({ type: "image" }),
  });

  const items = (data ?? []).slice(0, 6);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-4">
        <CardTitle>Thư viện ảnh</CardTitle>
        <Link href="/thu-vien" className="text-sm text-primary hover:underline">Xem thêm</Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-video" />)}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có hình ảnh.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {items.map((item) => {
              const src = resolveMediaUrl(item.image_url);
              return (
                <div key={item.id} className="group relative aspect-video overflow-hidden rounded-lg bg-muted">
                  {src && (
                    <Image src={src} alt={item.title} fill className="object-cover transition-transform group-hover:scale-105" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
