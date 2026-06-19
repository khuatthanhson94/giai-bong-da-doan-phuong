"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { galleryApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { resolveMediaUrl } from "@/lib/utils";

export default function ThuVienPage() {
  const { data: albums } = useQuery({ queryKey: ["albums"], queryFn: galleryApi.albums });
  const { data: items, isLoading } = useQuery({ queryKey: ["gallery"], queryFn: () => galleryApi.list() });

  const albumList = albums?.length ? albums : ["Chung"];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Thư viện</h1>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="aspect-video" />)}</div>
      ) : (
        <Tabs defaultValue={albumList[0]}>
          <TabsList className="flex-wrap">
            {albumList.map((a) => <TabsTrigger key={a} value={a}>{a}</TabsTrigger>)}
          </TabsList>
          {albumList.map((album) => (
            <TabsContent key={album} value={album}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {(items ?? []).filter((i) => (i.album || "Chung") === album).map((item) => {
                  const src = resolveMediaUrl(item.image_url);
                  return (
                    <div key={item.id} className="group relative aspect-video overflow-hidden rounded-lg bg-muted">
                      {src && <Image src={src} alt={item.title} fill className="object-cover" />}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                        <p className="text-xs text-white">{item.title}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
