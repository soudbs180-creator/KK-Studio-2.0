import { useState } from "react";
import "../styles/shortcuts.css";

type Shortcut = { label: string; keys: string[]; note?: string };
const pending = "此操作尚未接入当前前端";
const GROUPS: Record<string, Shortcut[][]> = {
  全局: [
    [
      { label: "开始创作", keys: ["Ctrl", "N"], note: pending },
      {
        label: "新建窗口",
        keys: ["Ctrl", "Shift", "N"],
        note: "请使用浏览器或桌面窗口菜单",
      },
      {
        label: "关闭标签页",
        keys: ["Ctrl", "W"],
        note: "由浏览器处理，未接入应用标签页",
      },
      { label: "打开设置", keys: ["Ctrl", ","] },
      {
        label: "截图",
        keys: ["Ctrl", "Shift", "S"],
        note: "请使用系统截图工具",
      },
    ],
    [{ label: "全局搜索", keys: ["Ctrl", "K"] }],
  ],
  画布: [
    [
      { label: "撤销", keys: ["Ctrl", "Z"], note: pending },
      { label: "重做", keys: ["Ctrl", "Shift", "Z"], note: pending },
      { label: "剪切", keys: ["Ctrl", "X"], note: pending },
      { label: "复制", keys: ["Ctrl", "C"], note: pending },
      { label: "粘贴", keys: ["Ctrl", "V"], note: pending },
    ],
    [
      { label: "分组", keys: ["Ctrl", "G"], note: pending },
      { label: "取消成组", keys: ["Ctrl", "Shift", "G"], note: pending },
      {
        label: "删除节点",
        keys: ["Delete"],
        note: "当前支持聚焦后删除新增节点；原稿初始节点保留",
      },
      { label: "多选（+点击）", keys: ["Shift"] },
      { label: "平移画布（+拖拽）", keys: ["Space"] },
    ],
    [
      { label: "放大", keys: ["Ctrl", "+"] },
      { label: "缩小", keys: ["Ctrl", "-"] },
      { label: "适应视图", keys: ["Shift", "1"] },
      { label: "提交生成", keys: ["Ctrl", "Enter"], note: pending },
    ],
  ],
  文件: [
    [
      { label: "树状视图", keys: ["Ctrl", "1"], note: pending },
      { label: "网格视图", keys: ["Ctrl", "2"], note: pending },
      { label: "聚焦搜索", keys: ["Ctrl", "F"], note: pending },
      { label: "复制一份", keys: ["Ctrl", "D"], note: pending },
      { label: "重命名", keys: ["Enter"], note: pending },
    ],
    [{ label: "添加到...", keys: ["Ctrl", "Shift", "A"], note: pending }],
  ],
};
const TABS = Object.keys(GROUPS);

export default function ShortcutsPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState("全局");
  const [detail, setDetail] = useState("");
  return (
    <section className={`shortcuts-panel ${tab === "画布" ? "is-canvas" : ""}`}>
      <header>
        <div
          role="tablist"
          aria-label="快捷键分类"
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
              return;
            event.preventDefault();
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? 2
                  : (TABS.indexOf(tab) +
                      (event.key === "ArrowRight" ? 1 : -1) +
                      3) %
                    3;
            setTab(TABS[next]);
            setDetail("");
            const tabs =
              event.currentTarget.querySelectorAll<HTMLButtonElement>("button");
            tabs[next]?.focus();
          }}
        >
          {TABS.map((name) => (
            <button
              key={name}
              role="tab"
              id={`shortcuts-tab-${name}`}
              aria-controls="shortcuts-body"
              aria-selected={tab === name}
              tabIndex={tab === name ? 0 : -1}
              onClick={() => {
                setTab(name);
                setDetail("");
              }}
            >
              {name}
            </button>
          ))}
        </div>
        <button
          className="shortcuts-close"
          aria-label="关闭快捷键"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <div
        className="shortcuts-body"
        id="shortcuts-body"
        role="tabpanel"
        aria-labelledby={`shortcuts-tab-${tab}`}
      >
        {GROUPS[tab].map((column, index) => (
          <dl className="shortcut-column" key={index}>
            {column.map((item) => (
              <div
                key={item.label}
                className={`shortcut-row ${item.note ? "has-note" : ""}`}
                tabIndex={item.note ? 0 : undefined}
                title={item.note}
                onFocus={() => setDetail(item.note ?? "")}
                onMouseEnter={() => setDetail(item.note ?? "")}
              >
                <dt>{item.label}</dt>
                <dd>
                  {item.keys.map((key) => (
                    <kbd key={key}>{key}</kbd>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        ))}
      </div>
      <footer>
        <p>
          {tab === "画布"
            ? "左键拖动框选 · 中键 / 右键拖动画布 · V 选择 · H 抓手"
            : "浅色文字为可用快捷键；灰色项目可查看支持情况。"}
        </p>
        <p aria-live="polite">{detail || "输入框内保留正常文字操作。"}</p>
      </footer>
    </section>
  );
}
