import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import {
  adaptHome,
  adaptMatch,
  adaptNews,
  adaptPlayer,
  adaptSettings,
  adaptStanding,
  adaptTeam,
  adaptUser,
} from "./adapters";
import { API_URL } from "./constants";
import {
  clearAuthSession,
  getRefreshToken,
  getStoredToken,
  isTokenExpired,
  setAuthSession,
} from "./auth";
import type {
  AuthResponse,
  DashboardData,
  GalleryItem,
  HomeData,
  Match,
  MatchResultInput,
  NewUser,
  NewsItem,
  Player,
  Settings,
  Standing,
  Statistics,
  Team,
  User,
} from "./types";

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const { data } = await axios.post<{
      access_token: string;
      refresh_token?: string;
      user: { id: number; name: string; email: string; role: string };
    }>(`${API_URL}/auth/refresh`, { refresh_token: refreshToken });

    const session: AuthResponse = {
      token: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      user: adaptUser(data.user),
    };
    setAuthSession(session);
    return data.access_token;
  } catch {
    clearAuthSession();
    return null;
  }
}

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = getStoredToken();
  if (token) {
    if (isTokenExpired(token)) {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      if (newToken) config.headers.Authorization = `Bearer ${newToken}`;
    } else {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const token = await refreshPromise;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
      clearAuthSession();
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
        window.location.href = "/admin/login";
      }
    }
    return Promise.reject(error);
  }
);

export const publicApi = {
  getHome: () => api.get("/public/home").then((r) => adaptHome(r.data)),
  getStandings: (tournamentId?: number) =>
    api
      .get("/public/tournaments/" + (tournamentId ? `${tournamentId}` : "active") + "/standings")
      .then((r) => (Array.isArray(r.data) ? r.data.map(adaptStanding) : []))
      .catch(async () => {
        const home = await publicApi.getHome();
        return home.standings;
      }),
  getStatistics: () =>
    api.get("/public/statistics").then((r) => ({
      topScorers: (r.data.top_scorers ?? []).map(adaptPlayer),
      topAssists: [],
      cleanSheets: [],
      totalGoals: r.data.total_goals ?? 0,
      totalMatches: r.data.total_matches ?? 0,
    }) satisfies Statistics),
  getSettings: () =>
    api.get("/public/home").then((r) => adaptSettings(r.data.settings ?? {})),
  getTeams: (params?: { search?: string; tournament_id?: number }) =>
    api.get<Team[]>("/public/teams", { params }).then((r) => r.data),
  getTeam: (id: number | string) =>
    api.get(`/public/teams/${id}`).then((r) => adaptTeam(r.data)),
  getPlayers: (params?: { team_id?: number; tournament_id?: number; search?: string }) =>
    api.get<Player[]>("/public/players", { params }).then((r) => r.data.map(adaptPlayer)),
  getPlayer: (id: number | string) =>
    api.get(`/public/players/${id}`).then((r) => adaptPlayer(r.data)),
  getNews: (params?: { page?: number }) =>
    api.get("/public/news", { params }).then((r) => {
      const items = r.data.data ?? r.data;
      return (Array.isArray(items) ? items : []).map(adaptNews);
    }),
  getNewsDetail: (slug: string) =>
    api.get(`/public/news/${slug}`).then((r) => adaptNews(r.data)),
  getSponsors: () => api.get("/public/sponsors").then((r) => r.data),
  getPage: (slug: string) => api.get(`/public/pages/${slug}`).then((r) => r.data),
  getFixtures: (tournamentSlug: string) =>
    api.get(`/public/tournaments/${tournamentSlug}/fixtures`).then((r) =>
      (r.data as unknown[]).map((m) => adaptMatch(m as Parameters<typeof adaptMatch>[0]))
    ),
};

export const authApi = {
  login: (email: string, password: string) =>
    api
      .post<{ access_token: string; refresh_token: string; user: { id: number; name: string; email: string; role: string } }>(
        "/auth/login",
        { email, password, device_name: "web" }
      )
      .then((r) => ({
        token: r.data.access_token,
        refreshToken: r.data.refresh_token,
        user: adaptUser(r.data.user),
      }) satisfies AuthResponse),
  me: () =>
    api.get<{ user: { id: number; name: string; email: string; role: string } }>("/auth/me").then((r) => adaptUser(r.data.user)),
  logout: (refreshToken?: string) =>
    api.post("/auth/logout", { refresh_token: refreshToken }),
  // New: fetch list of users
  getUsers: () =>
    api.get<User[]>("/users").then((r) => r.data),
  // New: create a user
  createUser: (data: NewUser) =>
    api.post<User>("/users", data).then((r) => r.data),
};

export const teamApi = {
  list: (search?: string, tournamentId?: number) =>
    publicApi.getTeams({ search, tournament_id: tournamentId }),
  get: (id: number | string) => publicApi.getTeam(id),
  create: (data: Partial<Team>) => api.post<Team>("/teams", data).then((r) => adaptTeam(r.data)),
  update: (id: number, data: Partial<Team>) => api.put(`/teams/${id}`, data),
  delete: (id: number) => api.delete(`/teams/${id}`),
  deleteAll: () => api.delete("/teams"),
};

export const playerApi = {
  list: (teamId?: number) => publicApi.getPlayers(teamId ? { team_id: teamId } : undefined),
  get: (id: number | string) => publicApi.getPlayer(id),
  create: (data: Partial<Player>) => api.post<Player>("/players", data).then((r) => adaptPlayer(r.data)),
  update: (id: number, data: Partial<Player>) => api.put(`/players/${id}`, data),
  delete: (id: number) => api.delete(`/players/${id}`),
};

export const matchApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<Match[]>("/matches", { params }).then((r) =>
      (Array.isArray(r.data) ? r.data : r.data.data ?? []).map((m) =>
        adaptMatch(m as Parameters<typeof adaptMatch>[0])
      )
    ),
  get: (id: number | string) =>
    api.get(`/matches/${id}`).then((r) => adaptMatch(r.data)),
  create: (data: Partial<Match>) => api.post("/matches", data),
  update: (id: number, data: Partial<Match>) => api.put(`/matches/${id}`, data),
  delete: (id: number) => api.delete(`/matches/${id}`),
  saveResult: (id: number, data: MatchResultInput) =>
    api
      .put(`/matches/${id}/score`, {
        home_score: data.score_a,
        away_score: data.score_b,
      })
      .then((r) => adaptMatch(r.data)),
  publish: (id: number, mvpPlayerId?: number) =>
    api.post(`/matches/${id}/publish`, { mvp_player_id: mvpPlayerId }).then((r) => adaptMatch(r.data)),
};

export const newsApi = {
  list: (category?: string) => publicApi.getNews(category ? { page: 1 } : undefined),
  adminList: () => api.get<NewsItem[]>("/news").then((r) => (Array.isArray(r.data) ? r.data : r.data.data ?? []).map(adaptNews)),
  get: (id: number | string) => api.get(`/news/${id}`).then((r) => adaptNews(r.data)),
  create: (data: Partial<NewsItem>) => api.post("/news", data),
  update: (id: number, data: Partial<NewsItem>) => api.put(`/news/${id}`, data),
  delete: (id: number) => api.delete(`/news/${id}`),
};

export const galleryApi = {
  // Allow optional query params (e.g., filter by type: "video" or "image")
  list: (params?: { type?: string }) =>
    api
      .get<GalleryItem[]>("/gallery/albums", { params })
      .then((r) => r.data),
  albums: () => api.get<string[]>("/gallery/albums").then((r) => r.data),
  create: (data: Partial<GalleryItem>) => api.post("/gallery/albums", data),
  delete: (id: number) => api.delete(`/gallery/albums/${id}`),
};

export const adminApi = {
  // Dashboard stats
  dashboard: () =>
    api.get("/dashboard").then((r) => {
      const stats = r.data.stats ?? {};
      return {
        totalTeams: stats.teams ?? 0,
        totalPlayers: stats.players ?? 0,
        totalMatches: stats.matches ?? 0,
        finishedMatches: stats.finished_matches ?? 0,
        scheduledMatches: stats.scheduled_matches ?? 0,
        recentNews: [],
        standings: [],
        logs: [],
      } satisfies DashboardData;
    }),

  // Update settings (used by wizard)
  updateSettings: (settings: Settings) => api.put("/settings", { settings }),

  // Export standings endpoint
  exportStandings: (tournamentId?: number) => {
        const url = tournamentId !== undefined ? `/import-export/standings/${tournamentId}/export` : `/import-export/standings/export`;
        return api.get(url, { responseType: "blob" }).then((r) => r.data);
      },

  // QR code generator
  qrcode: (type: string, id: number) => api.get(`/qr/${type}/${id}`).then((r) => r.data),
};

export const groupApi = {
  /**
   * Generate groups for a tournament.
   * @param teamCount Number of teams participating.
   * @param groupCount Number of groups to create.
   * @param type Generation strategy (default "random").
   */
  generate: (teamCount: number, groupCount: number, type: string = "random") =>
    api
      .post("/groups/generate", {
        team_count: teamCount,
        group_count: groupCount,
        type,
      })
      .then((r) => r.data),

  // placeholder methods can be added later (list, update, delete, etc.)
};

export const seasonApi = {
  list: () => api.get("/seasons").then((r) => (Array.isArray(r.data) ? r.data : r.data.data ?? [])),
  create: (data: Record<string, unknown>) => api.post("/seasons", data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/seasons/${id}`, data),
  delete: (id: number) => api.delete(`/seasons/${id}`),
};

export const tournamentApi = {
  list: () => api.get("/tournaments").then((r) => (Array.isArray(r.data) ? r.data : r.data.data ?? [])),
  create: (data: Record<string, unknown>) => api.post("/tournaments", data),
  wizardStep: (tournamentId: number, step: number, payload: Record<string, unknown>) =>
    api.post(`/tournaments/${tournamentId}/wizard/step/${step}`, payload),
};

export const recycleBinApi = {
  list: () => api.get("/recycle-bin").then((r) => r.data),
  restore: (id: number) => api.post(`/recycle-bin/${id}/restore`),
  destroy: (id: number) => api.delete(`/recycle-bin/${id}`),
};
