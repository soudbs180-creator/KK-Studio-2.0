import "../../styles/toolbar-icons.css";

type ToolbarIconName =
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
  | "map"
  | "chevron";

/** Figma 2149:42515: 28px glyphs; the independent arrow stays 8px. */
export default function ToolbarIcon({ name }: { name: ToolbarIconName }) {
  return (
    <span className={`toolbar-icon toolbar-icon-${name}`} aria-hidden="true" />
  );
}
