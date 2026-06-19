"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { newsApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDate, resolveMediaUrl } from "@/lib/utils";

export default function TinTucDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: allNews } = useQuery({ queryKey: ["news"], queryFn: () => newsApi.list() });
  const item = allNews?.find((n) => n.slug === slug);

  if (!allNews) return <Skeleton className="h-64" />;
  if (!item) return <p className="text-muted-foreground">Không tìm thấy bài viết.</p>;

  const img = resolveMediaUrl(item.image);

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">{formatDate(item.created_at)}</p>
        <h1 className="mt-2 text-3xl font-bold">{item.title}</h1>
      </header>
      {img && (
        <div className="relative aspect-video overflow-hidden rounded-xl">
          <Image src={img} alt={item.title} fill className="object-cover" priority />
        </div>
      )}
      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
        {item.content}
      </div>
    </article>
  );
}
