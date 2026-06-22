"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { publicApi } from "@/lib/api";
import type { HomeData, Settings } from "@/lib/types";

interface TournamentContextValue {
  settings: Settings;
  homeData: HomeData | null;
  loading: boolean;
  refresh: () => Promise<void>;
  tournamentName: string;
}

const TournamentContext = createContext<TournamentContextValue | null>(null);

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>({});
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const home = await publicApi.getHome();
      setHomeData(home);
      setSettings(home.settings ?? {});
    } catch {
      /* trang công khai vẫn hiển thị khi API lỗi */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const tournamentName = settings.tournament_name || settings.site_name || "Giải bóng đá đoàn phường";

  const value = useMemo(
    () => ({ settings, homeData, loading, refresh, tournamentName }),
    [settings, homeData, loading, refresh, tournamentName]
  );

  return <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>;
}

export function useTournamentContext() {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error("useTournamentContext must be used within TournamentProvider");
  return ctx;
}
