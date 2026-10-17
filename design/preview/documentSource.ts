import { createElement } from "react";

export function DocumentSource({ source }: { source: string }) {
  return createElement("pre", { "data-testid": "design-source" }, source);
}
