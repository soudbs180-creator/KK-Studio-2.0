import { useEffect, useState, type CSSProperties } from "react";
/** Keep mobile software keyboards from covering the composer. */
export function useAvailableImageHeight(): CSSProperties {
  const [height, setHeight] = useState(
    () => window.visualViewport?.height ?? window.innerHeight,
  );
  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () => setHeight(viewport?.height ?? window.innerHeight);
    viewport?.addEventListener("resize", resize);
    window.addEventListener("resize", resize);
    return () => {
      viewport?.removeEventListener("resize", resize);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return { "--image-edit-available-height": `${height}px` } as CSSProperties;
}
