import { useEffect, useRef, useState } from "react";
import { useDismissible } from "./useDismissible";

/** Compact entry to the same application actions as the desktop menu. */
export default function CompactAppMenu({
  entries,
}: {
  entries: Record<string, { text: string; action: () => void }[]>;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const media = matchMedia("(max-width: 767px)");
    const change = (): void => {
      if (media.matches) return;
      setOpen(false);
    };
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useDismissible(open, root, () => setOpen(false), trigger);
  return (
    <div className="compact-app-menu" ref={root}>
      <button
        ref={trigger}
        className="compact-app-trigger"
        aria-label="应用功能菜单"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen(!open)}
      >
        <img
          src="/design/figma/project-ellipsis-glyph.svg"
          width={20}
          height={20}
          alt=""
        />
      </button>
      {open && (
        <div className="compact-app-popover" role="menu" aria-label="应用功能">
          {Object.entries(entries).map(([label, items]) => (
            <div key={label} role="group" aria-label={label}>
              <p>{label}</p>
              {items.map((item) => (
                <button
                  key={item.text}
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    trigger.current?.focus({ preventScroll: true });
                    item.action();
                  }}
                >
                  {item.text}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
