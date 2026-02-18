import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTopOnNavigate() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Immediate + small delay to handle async renders that shift scroll position
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const t = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }, 50);
    return () => clearTimeout(t);
  }, [pathname]);

  return null;
}
