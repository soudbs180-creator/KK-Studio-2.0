import UiIcon, { type UiIconName } from "../UiIcon";
import "../../styles/toolbar-icons.css";

export type ToolbarIconName =
  | "add"
  | "select"
  | "collapse"
  | "favorite"
  | "assets"
  | "help"
  | "arrange"
  | "background"
  | "dots"
  | "lines"
  | "snap"
  | "map"
  | "chevron";

const TOOLBAR_ICON_TO_UI: Record<
  ToolbarIconName,
  { name: UiIconName; size?: number }
> = {
  add: { name: "plus", size: 28 },
  select: { name: "mouse-pointer-2", size: 28 },
  collapse: { name: "chevron-left", size: 20 },
  favorite: { name: "heart", size: 28 },
  assets: { name: "layers", size: 28 },
  help: { name: "circle-help", size: 20 },
  arrange: { name: "nodes-arrange", size: 28 },
  background: { name: "grid-2x2", size: 28 },
  dots: { name: "grip", size: 28 },
  lines: { name: "route", size: 28 },
  snap: { name: "magnet", size: 16 },
  map: { name: "map", size: 28 },
  chevron: { name: "chevron-down", size: 16 },
};

/** Figma 2149:42515: 28px glyphs; the independent arrow stays 8px/16px. */
export default function ToolbarIcon({
  name,
  size,
}: {
  name: ToolbarIconName;
  size?: number;
}) {
  const target = TOOLBAR_ICON_TO_UI[name];
  return (
    <span
      className={`toolbar-icon toolbar-icon-slot toolbar-icon-${name}`}
      aria-hidden="true"
    >
      <UiIcon name={target.name} size={size ?? target.size ?? 28} />
    </span>
  );
}
