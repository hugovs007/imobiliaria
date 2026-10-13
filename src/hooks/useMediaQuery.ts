"use client";

import { useState, useEffect } from "react";

export function useMediaQuery(query: string): { matches: boolean; mounted: boolean } {
  const [matches, setMatches] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [query]);

  return { matches, mounted };
}

export function useIsMobile(): { isMobile: boolean; mounted: boolean } {
  const { matches, mounted } = useMediaQuery("(max-width: 639px)");
  return { isMobile: matches, mounted };
}

export function useIsTablet(): { isTablet: boolean; mounted: boolean } {
  const { matches, mounted } = useMediaQuery("(min-width: 640px) and (max-width: 1023px)");
  return { isTablet: matches, mounted };
}

export function useIsDesktop(): { isDesktop: boolean; mounted: boolean } {
  const { matches, mounted } = useMediaQuery("(min-width: 1024px)");
  return { isDesktop: matches, mounted };
}