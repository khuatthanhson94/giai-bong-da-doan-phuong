"use client";

import Link from "next/link";
import { useTournament } from "@/hooks/useTournament";
import { Button } from "@/components/ui/Button";
import { CountdownTimer } from "./CountdownTimer";

export function HeroBanner() {
  const { tournamentName, settings, homeData } = useTournament();
  const nextMatch = homeData?.upcomingMatches?.[0];

  return (
    <section className="relative overflow-hidden rounded-2xl field-gradient px-6 py-12 text-white sm:px-10 sm:py-16">
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,.05) 40px, rgba(255,255,255,.05) 80px)",
      }} />
      <div className="relative z-10 max-w-2xl">
        <p className="mb-2 text-sm font-medium text-green-100">{settings.season_name || "Mùa giải 2026"}</p>
        <h1 className="text-3xl font-bold sm:text-4xl lg:text-5xl">{tournamentName}</h1>
        <p className="mt-4 text-green-50/90">
          {settings.hero_subtitle || "Theo dõi lịch thi đấu, kết quả và bảng xếp hạng giải bóng đá đoàn phường."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/lich-thi-dau"><Button>Lịch thi đấu</Button></Link>
          <Link href="/bang-xep-hang"><Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">Bảng xếp hạng</Button></Link>
        </div>
        {nextMatch && (
          <div className="mt-8 rounded-xl bg-black/20 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-wide text-green-100">Trận tiếp theo</p>
            <p className="mt-1 font-semibold">
              {nextMatch.team_a_name || nextMatch.team_a?.name} vs {nextMatch.team_b_name || nextMatch.team_b?.name}
            </p>
            <CountdownTimer targetDate={`${nextMatch.match_date}T${nextMatch.match_time}`} />
          </div>
        )}
      </div>
    </section>
  );
}
