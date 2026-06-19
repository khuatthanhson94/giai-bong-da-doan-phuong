"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { createContext, useContext, type ReactNode } from "react";

type ThemeContextValue = {
  theme: string | undefined;
};

const ThemeContext = createContext<ThemeContextValue>({ theme: undefined });

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ThemeContextInner>{children}</ThemeContextInner>
    </NextThemesProvider>
  );
}

function ThemeContextInner({ children }: { children: ReactNode }) {
  return <ThemeContext.Provider value={{ theme: undefined }}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
