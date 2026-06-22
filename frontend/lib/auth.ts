import { AUTH_COOKIE, AUTH_TOKEN_KEY, AUTH_USER_KEY } from "./constants";
import type { AuthResponse, User } from "./types";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setAuthSession(data: AuthResponse) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_TOKEN_KEY, data.token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
  // Cookie cho middleware Vercel (same-origin)
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${AUTH_COOKIE}=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${secure}`;
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
}

export function hasRole(user: User | null, ...roles: string[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

export function canManageTournament(role?: string) {
  return role === "super_admin" || role === "admin";
}

export function canManageNews(role?: string) {
  return role === "super_admin" || role === "admin" || role === "editor";
}

export function canManageResults(role?: string) {
  return role === "super_admin" || role === "admin" || role === "scorekeeper";
}

export function canManageUsers(role?: string) {
  return role === "super_admin";
}
