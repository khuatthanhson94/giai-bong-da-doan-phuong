"use client";

import Link from "next/link";
import Image from "next/image";
import { useTournament } from "@/hooks/useTournament";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatDate, resolveMediaUrl } from "@/lib/utils";

export function FeaturedNews() {
  const { homeData } = useTournament();
  const news = homeData?.news ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-4">
        <CardTitle>Tin tức nổi bật</CardTitle>
        <Link href="/tin-tuc" className="text-sm text-primary hover:underline">Tất cả tin</Link>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {news.length === 0 ? (
          <p className="text-sm text-muted-foreground sm:col-span-2">Chưa có tin tức.</p>
        ) : (
          news.map((item) => {
            const img = resolveMediaUrl(item.image);
            return (
              <Link key={item.id} href={`/tin-tuc/${item.slug}`} className="group flex gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
                {img && (
                  <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg">
                    <Image src={img} alt={item.title} fill className="object-cover" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="line-clamp-2 font-medium group-hover:text-primary">{item.title}</h4>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                </div>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
