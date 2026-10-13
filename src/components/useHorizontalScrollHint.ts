import { useEffect, useRef, useState } from "react";

export function useHorizontalScrollHint(key: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({
    left: false,
    right: false,
  });

  useEffect(() => {
    const row = ref.current;
    if (!row) return;

    const update = () => {
      const remaining = row.scrollWidth - row.clientWidth - row.scrollLeft;
      setScrollState({ left: row.scrollLeft > 1, right: remaining > 1 });
    };
    update();
    row.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(row);
    return () => {
      row.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [key]);

  return { ref, ...scrollState };
}
