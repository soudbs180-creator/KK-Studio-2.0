import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { agentConnection } from "../features/agent/agentConnection";
import {
  apiMenuEntries,
  entry,
  type Entry,
} from "../features/models/modelMenuEntries";
import { searchModels } from "../features/models/modelSearch";
import { readProviderConnections } from "../features/creation/providerRegistry";
import { providerChannel, type PickerChannel } from "../domain/modelChannels";
import type { ModelKind } from "../features/models/modelCatalog";
import {
  readPickerMemory,
  resolvePickerPins,
  writePickerMemory,
  type ModelSelection,
} from "../features/models/modelSelection";
import ModelPickerRows from "./ModelPickerRows";
import ModelPickerFilters from "./ModelPickerFilters";

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
  const [memory, setMemory] = useState(() => {
    const saved = readPickerMemory(scope);
    const connection = connections.find(
      (item) => item.id === current?.connectionId,
    );
    const legacy = saved.page.startsWith("api")
      ? providerChannel(
          connections.find((item) => saved.page === "api/" + item.id) ?? {},
        )
      : undefined;
    return {
      ...saved,
      channel:
        saved.channel ??
        legacy ??
        (current?.source === "api"
          ? providerChannel(connection ?? {})
          : apiOnly
            ? "relay"
            : "account"),
    };
  });
  const [query, setQuery] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const [, setRevision] = useState(0);
  const agent = useSyncExternalStore(
    agentConnection.subscribe,
    agentConnection.getState,
  );
  const channel: PickerChannel =
    apiOnly && memory.channel === "account" ? "relay" : memory.channel;
  const filter = kind ?? memory.filter ?? "all";
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
    writePickerMemory(scope, memory);
  }, [scope, memory]);
  const codex =
    !apiOnly && (!kind || kind === "text")
      ? agent.models.map((model) =>
          entry(
            { source: "codex", model: model.model || model.id, kind: "text" },
            model.displayName || model.model,
            "Codex · 已登录账号",
            agent.status !== "connected" ? "请先连接 Codex" : undefined,
          ),
        )
      : [];
  const imageLabel =
    current?.source === "codex" && current.kind === "image"
      ? current.effectiveModel || current.displayName || "图片模型未报告"
      : "图片模型未报告";
  const codexImage =
    !apiOnly && (!kind || kind === "image")
      ? [
          entry(
            {
              source: "codex",
              model: "",
              kind: "image",
              displayName: imageLabel,
              effectiveModel:
                current?.source === "codex" && current.kind === "image"
                  ? current.effectiveModel
                  : undefined,
            },
            "Codex 内置生图",
            `ChatGPT 账号 · ${imageLabel}`,
            scope !== "home" && agent.status !== "connected"
              ? "请先连接 Codex"
              : undefined,
          ),
        ]
      : [];
  const defaults =
    scope === "conversation" && !apiOnly
      ? [
          entry(
            { source: "default", model: "", kind: "text" },
            "默认 · Codex 主 Agent",
            "使用账号默认模型，负责规划与调用工具",
          ),
        ]
      : [];
  const visible: Entry[] = (
    channel === "account"
      ? [...defaults, ...codexImage, ...codex]
      : apiMenuEntries(
          connections.filter(
            (connection) =>
              connection.kind !== "user_oauth_local" &&
              providerChannel(connection) === channel,
          ),
          current,
          kind,
          "",
        )
  ).filter(
    (item) =>
      filter === "all" ||
      item.selection?.kind === filter ||
      item.selection?.kind === "unknown",
  );
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
  const pins = resolvePickerPins(visible, storedPins);
  const ordered = searchModels(
    visible.map((item) => ({
      ...item,
      terms: [...(item.terms ?? []), item.detail ?? ""],
    })),
    query,
  ).sort(
    (a, b) =>
      Number(pins.includes(b.item.id)) - Number(pins.includes(a.item.id)) ||
      a.score - b.score,
  );
  return (
    <div
      ref={menuRef}
      className="kk-model-menu"
      role="menu"
      aria-label="选择模型"
    >
      <ModelPickerFilters
        channel={channel}
        apiOnly={apiOnly}
        kind={kind}
        filter={filter}
        query={query}
        onChannel={(channel) => setMemory({ ...memory, channel })}
        onFilter={(filter) => setMemory({ ...memory, filter })}
        onQuery={setQuery}
      />
      <ModelPickerRows
        ordered={ordered}
        current={current}
        kind={kind}
        pins={pins}
        emptyMessage={
          query.trim()
            ? "没有匹配模型。请减少关键词，或在模型接入中刷新目录。"
            : channel === "account"
              ? "连接 Codex 后读取账号可用模型。"
              : "暂无模型，请在模型接入中保存连接并刷新模型列表。"
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
