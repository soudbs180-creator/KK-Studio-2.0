import { useEffect, useState } from "react";

/** Keep the desktop preference while narrow screens start with the compact rail. */
export function useSidebarLayout(): {
  collapsed: boolean;
  narrow: boolean;
  toggle: () => void;
} {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [narrow, setNarrow] = useState(
    () => matchMedia("(max-width: 800px)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(max-width: 800px)");
    const change = (): void => {
      setNarrow(media.matches);
      setMobileExpanded(false);
    };
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  return {
    collapsed: narrow ? !mobileExpanded : desktopCollapsed,
    narrow,
    toggle: () => {
      if (narrow) setMobileExpanded((value) => !value);
      else setDesktopCollapsed((value) => !value);
    },
  };
}
