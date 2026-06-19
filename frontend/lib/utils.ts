import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, isValid } from "date-fns";
import { vi } from "date-fns/locale";
import { UPLOAD_URL } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined, pattern = "dd/MM/yyyy") {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "—";
  return format(d, pattern, { locale: vi });
}

export function formatDateTime(date: string, time?: string) {
  const formatted = formatDate(date);
  return time ? `${formatted} · ${time.slice(0, 5)}` : formatted;
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function resolveMediaUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${UPLOAD_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function formatScore(a?: number | null, b?: number | null) {
  if (a == null || b == null) return "vs";
  return `${a} - ${b}`;
}
