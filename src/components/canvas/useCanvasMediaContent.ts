import { useCallback, useLayoutEffect, type RefObject } from "react";

/** Recheck cached media when its owner changes, even without another load event. */
export function useCanvasMediaContent<
  T extends HTMLImageElement | HTMLMediaElement,
>(
  ref: RefObject<T>,
  source: string | undefined,
  onReady?: (ready: boolean) => void,
) {
  const report = useCallback(() => {
    const media = ref.current;
    const ready = Boolean(
      media &&
      media.currentSrc === media.src &&
      (media instanceof HTMLImageElement
        ? media.complete && media.naturalWidth > 0
        : media.readyState >= 1 && !media.error),
    );
    onReady?.(ready);
    return ready;
  }, [ref, onReady]);
  useLayoutEffect(() => {
    report();
  }, [report, source]);
  return report;
}
