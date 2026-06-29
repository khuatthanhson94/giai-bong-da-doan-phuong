/**
 * API client — tương thích Express server (server/) trên Render.
 * Khớp 100% endpoint legacy client/src/api/client.js
 */
import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_URL, UPLOAD_URL } from "./constants";
import { clearAuthSession, getStoredToken, setAuthSession } from "./auth";
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

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      clearAuthSession();
      if (window.location.pathname.startsWith("/admin") && !window.location.pathname.includes("/login")) {
        window.location.href = "/admin/login";
      }
    }
    return Promise.reject(error);
  }
);

function toUser(raw: Record<string, unknown>): User {
  return {
    id: raw.id as number,
    username: (raw.username as string) || (raw.email as string) || "",
    email: (raw.email as string) || (raw.username as string) || "",
    name: (raw.name as string) || (raw.username as string),
    role: raw.role as User["role"],
    created_at: raw.created_at as string | undefined,
  };
}

export const publicApi = {
  getHome: () => api.get<HomeData>("/home").then((r) => r.data),
  getStandings: () => api.get<Standing[]>("/standings").then((r) => r.data),
  getStatistics: () => api.get<Statistics>("/statistics").then((r) => r.data),
  getSettings: () => api.get<Settings>("/settings").then((r) => r.data),
};

export const authApi = {
  login: (username: string, password: string) =>
    api.post<{ token: string; user: User }>("/auth/login", { username, password }).then((r) => {
      const session: AuthResponse = { token: r.data.token, user: toUser(r.data.user as unknown as Record<string, unknown>) };
      return session;
    }),
  me: () =>
    api.get<User>("/auth/me").then((r) => toUser(r.data as unknown as Record<string, unknown>)),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post("/auth/change-password", { currentPassword, newPassword }),
  getUsers: () => api.get<User[]>("/auth/users").then((r) => r.data.map((u) => toUser(u as unknown as Record<string, unknown>))),
  createUser: (data: NewUser) =>
    api.post<User>("/auth/users", data).then((r) => toUser(r.data as unknown as Record<string, unknown>)),
  updateUser: (id: number, data: { role?: string; password?: string }) =>
    api.put(`/auth/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/auth/users/${id}`),
};

export const teamApi = {
  list: (search?: string) =>
    api.get<Team[]>("/teams", { params: search ? { search } : {} }).then((r) => r.data),
  get: (id: number | string) => api.get<Team>(`/teams/${id}`).then((r) => r.data),
  create: (data: Partial<Team>) => api.post<Team>("/teams", data).then((r) => r.data),
  update: (id: number, data: Partial<Team>) => api.put(`/teams/${id}`, data),
  delete: (id: number) => api.delete(`/teams/${id}`),
  deleteAll: () => api.delete("/teams/all"),
};

export const playerApi = {
  list: (teamId?: number) =>
    api.get<Player[]>("/players", { params: teamId ? { teamId } : {} }).then((r) => r.data),
  get: (id: number | string) => api.get<Player>(`/players/${id}`).then((r) => r.data),
  create: (data: Partial<Player>) => api.post<Player>("/players", data).then((r) => r.data),
  update: (id: number, data: Partial<Player>) => api.put(`/players/${id}`, data),
  delete: (id: number) => api.delete(`/players/${id}`),
};

export const matchApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<Match[]>("/matches", { params }).then((r) => r.data),
  get: (id: number | string) => api.get<Match>(`/matches/${id}`).then((r) => r.data),
  rounds: () => api.get<string[]>("/matches/rounds").then((r) => r.data),
  create: (data: Partial<Match>) => api.post<Match>("/matches", data).then((r) => r.data),
  update: (id: number, data: Partial<Match>) => api.put(`/matches/${id}`, data),
  delete: (id: number) => api.delete(`/matches/${id}`),
  saveResult: (id: number, data: MatchResultInput) =>
    api.post<Match>(`/matches/${id}/result`, data).then((r) => r.data),
  publish: (id: number) => api.post<Match>(`/matches/${id}/publish`).then((r) => r.data),
  generateGroupSchedule: () =>
    api.post<{ message: string }>("/matches/generate-group-schedule").then((r) => r.data),
  generateKnockout: (config: Record<string, unknown>) =>
    api.post<{ message: string }>("/matches/generate-knockout", { config }).then((r) => r.data),
};

export const newsApi = {
  list: (category?: string) =>
    api.get<NewsItem[]>("/news", { params: category ? { category } : {} }).then((r) => r.data),
  adminList: () => api.get<NewsItem[]>("/news/admin/all").then((r) => r.data),
  get: (id: number | string) => api.get<NewsItem>(`/news/${id}`).then((r) => r.data),
  create: (data: Partial<NewsItem>) => api.post<NewsItem>("/news", data).then((r) => r.data),
  update: (id: number, data: Partial<NewsItem>) => api.put(`/news/${id}`, data),
  delete: (id: number) => api.delete(`/news/${id}`),
};

export const galleryApi = {
  list: (params?: { album?: string; type?: string }) =>
    api.get<GalleryItem[]>("/gallery", { params }).then((r) => r.data),
  albums: () => api.get<string[]>("/gallery/albums").then((r) => r.data),
  create: (data: Partial<GalleryItem>) => api.post<GalleryItem>("/gallery", data).then((r) => r.data),
  delete: (id: number) => api.delete(`/gallery/${id}`),
};

export const groupApi = {
  list: () => api.get<GroupWithTeams[]>("/groups").then((r) => r.data),
  create: (name: string) => api.post("/groups", { name }).then((r) => r.data),
  update: (id: number, name: string) => api.put(`/groups/${id}`, { name }),
  delete: (id: number) => api.delete(`/groups/${id}`),
  assignTeams: (groupId: number, teamIds: number[]) =>
    api.post(`/groups/${groupId}/teams`, { teamIds }),
  removeTeam: (groupId: number, teamId: number) =>
    api.delete(`/groups/${groupId}/teams/${teamId}`),
  generate: (count: number) => api.post("/groups/generate", { count }).then((r) => r.data),
};

export interface GroupWithTeams {
  id: number;
  name: string;
  teams?: Team[];
}

export const adminApi = {
  dashboard: () => api.get<DashboardData>("/dashboard").then((r) => r.data),
  updateSettings: (settings: Settings) => api.put("/settings", settings),
  exportStandings: () =>
    api.get("/export/standings", { responseType: "blob" }).then((r) => r.data),
  qrcode: (url: string) =>
    api.get<{ qr: string; url: string }>("/qrcode", { params: { url } }).then((r) => r.data),
};

export async function uploadFile(file: File | Blob) {
  const form = new FormData();
  form.append("file", file);
  const token = getStoredToken();
  const { data } = await axios.post<{ url: string }>(`${UPLOAD_URL}/api/upload`, form, {
    headers: {
      "Content-Type": "multipart/form-data",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  return data;
}

/** Giữ tương thích import cũ */
export const seasonApi = { list: async () => [] as unknown[] };
export const tournamentApi = { list: async () => [] as unknown[], get: async () => ({ groups: [], teams: [] }) };
export const recycleBinApi = { list: async () => [] };
