"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { newsApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDate, resolveMediaUrl } from "@/lib/utils";

export default function TinTucPage() {
  const { data, isLoading } = useQuery({ queryKey: ["news"], queryFn: () => newsApi.list() });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Tin tức</h1>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48" />)}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data ?? []).map((item) => {
            const img = resolveMediaUrl(item.image);
            return (
              <Link key={item.id} href={`/tin-tuc/${item.slug}`}>
                <Card className="h-full overflow-hidden transition hover:border-primary/40">
                  {img && (
                    <div className="relative aspect-video">
                      <Image src={img} alt={item.title} fill className="object-cover" />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <h2 className="font-semibold line-clamp-2">{item.title}</h2>
                    <p className="mt-2 text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
