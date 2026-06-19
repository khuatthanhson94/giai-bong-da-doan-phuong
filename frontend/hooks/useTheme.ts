"use client";

import { useTheme as useNextTheme } from "next-themes";

export function useTheme() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useNextTheme();
  const toggleTheme = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");
  return { theme, setTheme, resolvedTheme, systemTheme, toggleTheme, isDark: resolvedTheme === "dark" };
}
