import { useState, useEffect } from "react";

/**
 * Cross-platform landscape detection hook.
 * Uses screen.orientation API (works on Android Chrome) with fallback
 * to window.innerWidth > window.innerHeight for older browsers / iOS Safari.
 */
export function useIsLandscape(): boolean {
  const getIsLandscape = (): boolean => {
    // screen.orientation is the most reliable on Android Chrome
    if (typeof screen !== "undefined" && screen.orientation) {
      const type = screen.orientation.type;
      return type === "landscape-primary" || type === "landscape-secondary";
    }
    // Fallback: compare dimensions (works on iOS Safari)
    return window.innerWidth > window.innerHeight;
  };

  const [isLandscape, setIsLandscape] = useState<boolean>(getIsLandscape);

  useEffect(() => {
    const update = () => {
      // Small delay to let Android finish the orientation transition
      // before reading the new dimensions
      setTimeout(() => setIsLandscape(getIsLandscape()), 150);
    };

    // Modern API – fires reliably on Android
    if (typeof screen !== "undefined" && screen.orientation) {
      screen.orientation.addEventListener("change", update);
    }

    // Legacy / iOS Safari fallback
    window.addEventListener("orientationchange", update);
    window.addEventListener("resize", update);

    return () => {
      if (typeof screen !== "undefined" && screen.orientation) {
        screen.orientation.removeEventListener("change", update);
      }
      window.removeEventListener("orientationchange", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return isLandscape;
}
