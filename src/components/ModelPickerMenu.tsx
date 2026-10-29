import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { agentConnection } from "../features/agent/index.ts";
import { readProviderConnections } from "../features/creation/index.ts";
import type { ModelKind } from "../domain/modelSelection";
import {
  readPickerMemory,
  resolvePickerPins,
  writePickerMemory,
  type ModelSelection,
} from "../features/models/index.ts";
import {
  aggregateCapabilityEntries,
  type UserCapability,
} from "../features/models/index.ts";
import ModelPickerRows from "./ModelPickerRows";

export default function ModelPickerMenu({
  scope,
  kind,
  current,
  onSelect,
  onConfigure,
  apiOnly = false,
}: {
  scope:
    "home" | "conversation" | "canvas-image" | "canvas-video" | "canvas-text";
  kind?: ModelKind;
  apiOnly?: boolean;
  current?: ModelSelection;
  onSelect: (selection: ModelSelection) => void;
  onConfigure: () => void;
}) {
  const connections = readProviderConnections();
  const [capability, setCapability] = useState<UserCapability>(() => {
    if (
      kind === "image" ||
      current?.kind === "image" ||
      scope === "canvas-image"
    ) {
      return "image";
    }
    if (
      kind === "text" ||
      current?.kind === "text" ||
      scope === "conversation" ||
      scope === "canvas-text"
    ) {
      return "chat";
    }
    const saved = readPickerMemory(scope) as unknown as Record<string, unknown>;
    if (saved.capability === "chat" || saved.capability === "image") {
      return saved.capability as UserCapability;
    }
    return "chat";
  });

  const [memory, setMemory] = useState(() => readPickerMemory(scope));
  const [query, setQuery] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const [, setRevision] = useState(0);

  const agent = useSyncExternalStore(
    agentConnection.subscribe,
    agentConnection.getState,
  );

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu || menu.closest(".start-composer, .chat-composer")) return;
    const place = () => {
      const anchor = menu.parentElement?.getBoundingClientRect();
      if (!anchor) return;
      const above = Math.max(0, anchor.top - 16);
      const below = Math.max(0, window.innerHeight - anchor.bottom - 16);
      const downward = below > above;
      menu.style.maxHeight = `${Math.min(480, Math.max(above, below))}px`;
      menu.style.top = downward ? "calc(100% + 8px)" : "auto";
      menu.style.bottom = downward ? "auto" : "calc(100% + 8px)";
      const left = Math.min(
        anchor.left,
        window.innerWidth - menu.offsetWidth - 8,
      );
      menu.style.left = `${Math.max(8, left) - anchor.left}px`;
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, []);

  useEffect(() => {
    const listener = () => setRevision((value) => value + 1);
    window.addEventListener("kk:model-provider-changed", listener);
    window.addEventListener("storage", listener);
    return () => {
      window.removeEventListener("kk:model-provider-changed", listener);
      window.removeEventListener("storage", listener);
    };
  }, []);

  useEffect(() => {
    writePickerMemory(scope, {
      ...memory,
      ...({ capability } as Record<string, unknown>),
    });
  }, [scope, memory, capability]);

  // Aggregate models by user capability rather than technical channel
  const entries = aggregateCapabilityEntries({
    capability,
    connections,
    agentModels: apiOnly ? [] : agent.models,
    agentStatus: apiOnly ? "disconnected" : agent.status,
    current,
    includeAutoRouting: true,
    query,
  });

  const storedPins = Array.isArray(memory.pins.all)
    ? memory.pins.all
    : [
        ...new Set(
          Object.values(memory.pins).flatMap((ids) =>
            Array.isArray(ids)
              ? ids.filter((id) => typeof id === "string")
              : [],
          ),
        ),
      ];
  const pins = resolvePickerPins(entries, storedPins);

  // Ordering: Auto-Routing first at index 0, then pinned items, then score
  const ordered = entries
    .map((item) => ({ item, fuzzy: false }))
    .sort((a, b) => {
      if (a.item.metadata?.isAutoRouting) return -1;
      if (b.item.metadata?.isAutoRouting) return 1;

      const aPinned = pins.includes(a.item.id);
      const bPinned = pins.includes(b.item.id);
      if (aPinned !== bPinned) return aPinned ? -1 : 1;

      return 0;
    });

  return (
    <div
      ref={menuRef}
      className="kk-model-menu"
      role="menu"
      aria-label="选择模型"
    >
      {/* Capability tabs: text only, one selected pill, arrow keys move focus. */}
      <div
        className="kk-model-channels kk-model-capability-tabs"
        role="tablist"
        aria-label="模型能力分类"
      >
        <button
          type="button"
          role="tab"
          aria-selected={capability === "chat"}
          tabIndex={capability === "chat" ? 0 : -1}
          onClick={() => setCapability("chat")}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
              e.preventDefault();
              setCapability("image");
            }
          }}
          data-capability="chat"
          className={capability === "chat" ? "is-active" : undefined}
        >
          对话 / 推理
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={capability === "image"}
          tabIndex={capability === "image" ? 0 : -1}
          onClick={() => setCapability("image")}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
              e.preventDefault();
              setCapability("chat");
            }
          }}
          data-capability="image"
          className={capability === "image" ? "is-active" : undefined}
        >
          图像生成
        </button>
      </div>

      {/* Model Search Box */}
      <div className="kk-model-menu-top">
        <input
          type="search"
          className="kk-model-search ui-input"
          aria-label="搜索模型、推理能力或厂商"
          placeholder="搜索模型…"
          maxLength={120}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
            if (event.key !== "Escape") event.stopPropagation();
          }}
        />
        <span className="kk-model-scope">
          {capability === "chat" ? "对话/推理" : "生图"}
        </span>
      </div>

      {/* Model Option Rows */}
      <ModelPickerRows
        ordered={ordered}
        current={current}
        kind={kind}
        pins={pins}
        emptyMessage={
          query.trim()
            ? "没有匹配模型。请减少关键词，或在模型接入中刷新目录。"
            : capability === "chat"
              ? "暂无可用的对话或推理模型，请在模型接入中配置。"
              : "暂无可用的图像生成模型，请在模型接入中配置。"
        }
        onChoose={(item) => {
          if (item.selection) onSelect(item.selection);
        }}
        onTogglePin={(id) =>
          setMemory({
            ...memory,
            pins: {
              ...memory.pins,
              all: pins.includes(id)
                ? pins.filter((value) => value !== id)
                : [...pins, id],
            },
          })
        }
      />

      {/* Footer link to Model Access settings */}
      <button
        type="button"
        className="kk-model-configure"
        onClick={onConfigure}
      >
        模型接入…
      </button>
    </div>
  );
}
