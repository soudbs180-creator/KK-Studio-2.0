import "../../styles/toolbar-icons.css";

type ToolbarIconName =
  "add" | "select" | "collapse" | "favorite" | "assets" | "help";

/** Original 170:8361 shapes; single-color masks inherit the current UI state. */
export default function ToolbarIcon({ name }: { name: ToolbarIconName }) {
  if (name === "add") {
    return (
      <img
        className="toolbar-icon-add"
        src="/design/figma/toolbar-add.svg"
        width={40}
        height={40}
        alt=""
        draggable={false}
      />
    );
  }
  return (
    <span className={`toolbar-icon toolbar-icon-${name}`} aria-hidden="true" />
  );
}
