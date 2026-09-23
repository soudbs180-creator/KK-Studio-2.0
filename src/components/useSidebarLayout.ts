import { useEffect, useState } from "react";

export type ResponsiveSurface = "phone" | "tablet" | "desktop";

function currentSurface(): ResponsiveSurface {
  return matchMedia("(max-width: 767px)").matches
    ? "phone"
    : matchMedia("(max-width: 1200px)").matches
      ? "tablet"
      : "desktop";
}

/** Desktop preference is independent from either compact surface's drawer. */
export function useSidebarLayout(): {
  collapsed: boolean;
  narrow: boolean;
  surface: ResponsiveSurface;
  toggle: () => void;
} {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [surface, setSurface] = useState(currentSurface);
  useEffect(() => {
    const media = [
      matchMedia("(max-width: 767px)"),
      matchMedia("(max-width: 1200px)"),
    ];
    const change = (): void => {
      setSurface(currentSurface());
      setMobileExpanded(false);
    };
    media.forEach((query) => query.addEventListener("change", change));
    return () =>
      media.forEach((query) => query.removeEventListener("change", change));
  }, []);
  const narrow = surface !== "desktop";
  return {
    collapsed: narrow ? !mobileExpanded : desktopCollapsed,
    narrow,
    surface,
    toggle: () => {
      if (narrow) setMobileExpanded((value) => !value);
      else setDesktopCollapsed((value) => !value);
    },
  };
}
