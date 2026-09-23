import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useDismissible } from "../useDismissible";
import type { CanvasItemKind } from "../../domain/canvasItems";
import type { AddMenuState } from "./useCanvasAddMenu";
import { pluginStore } from "../../features/plugins/pluginStore";
import { listPluginNodeDefinitions } from "../../features/plugins/nodeRegistry";
import "../../styles/node-menu.css";

const ITEMS: {
  key: string;
  label: string;
  kind?: CanvasItemKind;
  badge?: string;
  reason?: string;
}[] = [
  { key: "text", label: "文本", kind: "text" },
  { key: "table", label: "表格", reason: "表格编辑器尚未接入" },
  { key: "image", label: "图片", kind: "image" },
  { key: "video", label: "视频", kind: "video", badge: "MiniMax H3" },
  { key: "audio", label: "音频", kind: "audio" },
  {
    key: "director",
    label: "3D 导演台",
    badge: "新",
    reason: "3D 导演台尚未接入",
  },
  {
    key: "edit",
    label: "视频剪辑",
    badge: "新",
    reason: "视频剪辑编辑器尚未接入",
  },
  {
    key: "workflow",
    label: "ComfyUI 工作流",
    badge: "新",
    reason: "ComfyUI 工作流编辑器尚未接入",
  },
];

export default function AddNodeMenu({
  menu,
  onChoose,
  onChoosePlugin,
  onDismiss,
}: {
  menu: AddMenuState;
  onChoose: (kind: CanvasItemKind) => void;
  onChoosePlugin?: (type: string) => void;
  onDismiss: (restoreFocus?: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef(menu.trigger);
  trigger.current = menu.trigger;
  useDismissible(
    true,
    ref,
    () => onDismiss(),
    menu.atPoint ? undefined : trigger,
  );
  const pluginState = useSyncExternalStore(
    pluginStore.subscribe,
    pluginStore.getState,
  );
  const enabledIds = new Set(
    pluginState.plugins
      .filter((record) => record.enabled)
      .map((record) => record.id),
  );
  const pluginEntries = listPluginNodeDefinitions().filter(
    (entry) =>
      enabledIds.has(entry.pluginId) &&
      entry.definition.showInCreateMenu !== false,
  );
  const touch = useRef<{
    key: string;
    id: number;
    x: number;
    y: number;
  } | null>(null);
  const [position, setPosition] = useState({ x: 16, y: 16 });
  useLayoutEffect(() => {
    const place = (): void => {
      const box = ref.current?.getBoundingClientRect();
      if (!box) return;
      setPosition({
        x: Math.max(16, Math.min(menu.client.x, innerWidth - box.width - 16)),
        y: Math.max(16, Math.min(menu.client.y, innerHeight - box.height - 16)),
      });
    };
    place();
    ref.current
      ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
      ?.focus({ preventScroll: true });
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [menu]);
  useEffect(() => {
    const outside = (event: Event): void => {
      if (
        event.target instanceof Node &&
        !ref.current?.contains(event.target) &&
        (menu.atPoint || !menu.trigger.contains(event.target))
      )
        onDismiss(false);
    };
    document.addEventListener("focusin", outside, true);
    return () => {
      document.removeEventListener("focusin", outside, true);
    };
  }, [menu.trigger, menu.atPoint, onDismiss]);
  return createPortal(
    <div
      ref={ref}
      className="add-node-menu"
      role="menu"
      aria-label={menu.parentId ? "新增下游卡片" : "添加节点"}
      style={{ left: position.x, top: position.y }}
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return;
        event.stopPropagation();
        if (event.key === "Tab") onDismiss();
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
          return;
        event.preventDefault();
        const buttons = [
          ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)",
          ),
        ];
        const index = buttons.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? buttons.length - 1
              : (index +
                  (event.key === "ArrowDown" ? 1 : -1) +
                  buttons.length) %
                buttons.length;
        buttons[next]?.focus({ preventScroll: true });
        buttons[next]?.scrollIntoView({ block: "nearest" });
      }}
    >
      <p className="add-node-title">添加节点</p>
      <div className="add-node-items">
        {ITEMS.map((item) => (
          <button
            key={item.key}
            role="menuitem"
            aria-label={item.label}
            aria-description={
              item.reason ??
              (item.key === "video"
                ? "创建视频节点；当前仅支持本地演示素材，API未连接"
                : undefined)
            }
            disabled={!item.kind}
            title={
              item.reason ??
              (item.key === "video"
                ? "创建视频节点；当前仅支持本地演示素材，API未连接"
                : undefined)
            }
            onPointerDown={(event) => {
              if (event.pointerType === "touch")
                touch.current = {
                  key: item.key,
                  id: event.pointerId,
                  x: event.clientX,
                  y: event.clientY,
                };
            }}
            onPointerMove={(event) => {
              if (
                touch.current &&
                Math.hypot(
                  event.clientX - touch.current.x,
                  event.clientY - touch.current.y,
                ) > 8
              )
                touch.current = null;
            }}
            onPointerCancel={() => {
              touch.current = null;
            }}
            onPointerUp={(event) => {
              const tap = touch.current;
              touch.current = null;
              if (
                event.pointerType !== "touch" ||
                tap?.key !== item.key ||
                tap.id !== event.pointerId ||
                !item.kind
              )
                return;
              // Captured touch drags may suppress the following compatibility click.
              event.preventDefault();
              onChoose(item.kind);
            }}
            onClick={() => {
              if (item.kind) onChoose(item.kind);
            }}
          >
            <span className="add-node-icon-box">
              <span
                className={`add-node-icon add-node-icon-${item.key}`}
                aria-hidden="true"
              />
            </span>
            <span className="add-node-label">{item.label}</span>
            {item.badge && (
              <span
                className={`add-node-badge ${item.key === "video" ? "is-model" : ""}`}
              >
                {item.badge}
              </span>
            )}
            {item.key === "workflow" && (
              <span
                className="add-node-icon add-node-icon-next"
                aria-hidden="true"
              />
            )}
            {item.reason && (
              <span className="add-node-unavailable">{item.reason}</span>
            )}
          </button>
        ))}
        {pluginEntries.length > 0 && (
          <>
            <p className="add-node-title add-node-title-plugin">插件</p>
            {pluginEntries.map(({ definition }) => (
              <button
                key={definition.type}
                role="menuitem"
                aria-label={definition.title}
                aria-description={definition.description}
                title={definition.description ?? definition.title}
                onClick={() => {
                  onChoosePlugin?.(definition.type);
                }}
              >
                <span className="add-node-icon-box">
                  <span className="add-node-icon plugin" aria-hidden="true">
                    {definition.icon as ReactNode}
                  </span>
                </span>
                <span className="add-node-label">{definition.title}</span>
                {definition.description && (
                  <span className="add-node-unavailable">
                    {definition.description}
                  </span>
                )}
              </button>
            ))}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
