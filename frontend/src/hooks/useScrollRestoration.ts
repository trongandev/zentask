import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export function useScrollRestoration(containerSelector: string = "main") {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    // Restore scroll position on back/forward navigation
    if (navigationType === "POP") {
      const savedPosition = sessionStorage.getItem(`scroll-${location.key}`);
      if (savedPosition !== null) {
        requestAnimationFrame(() => {
          container.scrollTo(0, parseInt(savedPosition, 10));
        });
      }
    } else {
      // Scroll to top on new navigation (PUSH or REPLACE)
      requestAnimationFrame(() => {
        container.scrollTo(0, 0);
      });
    }

    // Save scroll position
    const handleScroll = () => {
      sessionStorage.setItem(`scroll-${location.key}`, container.scrollTop.toString());
    };

    let timeoutId: ReturnType<typeof setTimeout>;
    const scrollListener = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 100);
    };

    container.addEventListener("scroll", scrollListener, { passive: true });

    return () => {
      container.removeEventListener("scroll", scrollListener);
      if (timeoutId) clearTimeout(timeoutId);
      // Save final position before location changes
      handleScroll();
    };
  }, [location, navigationType, containerSelector]);
}
