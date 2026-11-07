import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useSidebarLayout } from "../../src/components/useSidebarLayout.ts";
/** A browser media-query transport fixture; the production hook owns classification. */
export function renderSidebarSurface(width: number) {
  const original = globalThis.matchMedia;
  globalThis.matchMedia = ((query: string) => ({
    matches: width <= Number(query.match(/\d+/u)![0]),
  })) as typeof matchMedia;
  try {
    function Probe() {
      const state = useSidebarLayout();
      return createElement("output", {
        "data-surface": state.surface,
        "data-narrow": state.narrow,
        "data-collapsed": state.collapsed,
      });
    }
    return renderToStaticMarkup(createElement(Probe));
  } finally {
    globalThis.matchMedia = original;
  }
}
