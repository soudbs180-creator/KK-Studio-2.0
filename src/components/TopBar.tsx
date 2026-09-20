import { useRef, useState } from "react";
import { useDismissible } from "./useDismissible";
export default function TopBar({
  onOpen,
  onToggleSidebar,
  onToggleChat,
}: {
  onOpen: (view: string) => void;
  onToggleSidebar: () => void;
  onToggleChat: () => void;
}) {
  const [menu, setMenu] = useState("");
  const navRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  useDismissible(menu !== "", navRef, () => setMenu(""), triggerRef);
  const entries: Record<string, { text: string; action: () => void }[]> = {
    文件: [
      { text: "项目库", action: () => onOpen("projects") },
      { text: "资产管理", action: () => onOpen("assets") },
    ],
    编辑: [{ text: "设置", action: () => onOpen("settings") }],
    窗口: [
      { text: "展开 / 收起侧边栏", action: onToggleSidebar },
      { text: "展开 / 收起对话", action: onToggleChat },
    ],
    帮助: [{ text: "使用说明", action: () => onOpen("help") }],
  };
  return (
    <header className="topbar">
      <strong>KK Studio</strong>
      <nav ref={navRef} aria-label="应用菜单">
        {Object.entries(entries).map(([label, items]) => (
          <div className="top-menu" key={label}>
            <button
              aria-expanded={menu === label}
              onClick={(event) => {
                triggerRef.current = event.currentTarget;
                setMenu(menu === label ? "" : label);
              }}
            >
              {label}
            </button>
            {menu === label && (
              <div className="menu-popover">
                {items.map((item) => (
                  <button
                    key={item.text}
                    onClick={() => {
                      setMenu("");
                      item.action();
                    }}
                  >
                    {item.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      <button
        className="mobile-search"
        aria-label="搜索与收藏"
        title="搜索与收藏"
        onClick={() => onOpen("search")}
      >
        <img src="/design/figma/search.svg" alt="" />
      </button>
      <span className="preview-label">前端预览</span>
    </header>
  );
}
