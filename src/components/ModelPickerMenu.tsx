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
import type { ModelKind } from "../features/models/modelCatalog";
import {
  readPickerMemory,
  writePickerMemory,
  type ModelSelection,
} from "../features/models/modelSelection";
import ModelPickerRows from "./ModelPickerRows";
const sources: Entry[] = [
  { id: "google", label: "Google", disabled: "请从对话执行方式选择" },
  { id: "codex", label: "Codex", page: "codex" },
  {
    id: "doubao",
    label: "豆包 Doubao",
    disabled: "账号调用尚未接入；API Key 可通过 API 自定义模型使用",
  },
  {
    id: "workbuddy",
    label: "WorkBuddy",
    disabled: "账号调用尚未接入；请在模型接入中查看可用连接",
  },
  { id: "api", label: "API 自定义模型", page: "api" },
];
export default function ModelPickerMenu({
  scope,
  kind,
  current,
  onSelect,
  onConfigure,
  apiOnly = false,
}: {
  scope: "conversation" | "canvas-image" | "canvas-video" | "canvas-text";
  kind?: ModelKind;
  apiOnly?: boolean;
  current?: ModelSelection;
  onSelect: (selection: ModelSelection) => void;
  onConfigure: () => void;
}) {
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
    if (!menu) return;
    if (menu.closest(".start-composer, .chat-composer")) return;
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
    return () =>
      window.removeEventListener("kk:model-provider-changed", listener);
  }, []);
  useEffect(() => {
    writePickerMemory(scope, memory);
  }, [scope, memory]);
  const connections = readProviderConnections().filter(
    (connection) => connection.kind === "user_byok",
  );
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
            imageLabel,
            "Codex 内置生图 · 型号以上游回执为准",
            agent.status !== "connected" ? "请先连接 Codex" : undefined,
          ),
        ]
      : [];
  const apis = apiMenuEntries(connections, current, kind, query).filter(
    (item) =>
      !kind ||
      item.selection?.kind === kind ||
      item.selection?.kind === "unknown",
  );
  const defaults =
    scope === "conversation" && !apiOnly
      ? [
          entry(
            { source: "default", model: "" },
            "默认 · Codex 主 Agent",
            "使用账号默认模型，负责规划与调用工具",
          ),
        ]
      : [];
  const rootPage = apiOnly ? "api" : "root";
  const page =
    memory.page === "api" || memory.page.startsWith("api/")
      ? memory.page
      : !apiOnly && memory.page === "codex"
        ? "codex"
        : rootPage;
  const providers: Entry[] = connections.map((connection) => ({
    id: connection.id,
    label: connection.displayName,
    detail: connection.baseUrl,
    page: "api/" + connection.id,
  }));
  const global = Boolean(query.trim()) || memory.all;
  const visible: Entry[] = global
    ? [...defaults, ...codexImage, ...codex, ...apis]
    : page === "root"
      ? [...defaults, ...sources]
      : page === "codex"
        ? [...codex, ...codexImage]
        : page === "api"
          ? providers
          : apis.filter(
              (item) => item.selection?.connectionId === page.slice(4),
            );
  const pins = Array.isArray(memory.pins.all)
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
  const title = global
    ? "全部模型"
    : page === "root"
      ? "选择来源"
      : page === "codex"
        ? "Codex 模型"
        : page === "api"
          ? "API 供应商"
          : (connections.find((connection) => "api/" + connection.id === page)
              ?.displayName ?? "供应商已移除");
  return (
    <div
      ref={menuRef}
      className="kk-model-menu"
      role="menu"
      aria-label="选择模型"
    >
      <div className="kk-model-menu-top">
        <strong>模型</strong>
        <input
          type="search"
          className="kk-model-search ui-input"
          aria-label="搜索模型、厂商或参数"
          placeholder="搜索模型…"
          maxLength={120}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Escape") event.stopPropagation();
          }}
        />
      </div>
      <div className="kk-model-menu-head">
        <button
          type="button"
          disabled={global || page === rootPage}
          aria-label="返回上一级"
          onClick={() =>
            setMemory({
              ...memory,
              page: page.startsWith("api/") ? "api" : rootPage,
            })
          }
        >
          ←
        </button>
        <strong title={title}>{title}</strong>
        <button
          type="button"
          aria-label={memory.all ? "切换分级模型" : "切换全部模型"}
          onClick={() => setMemory({ ...memory, all: !memory.all })}
        >
          {memory.all ? "分级" : "全部"}
        </button>
      </div>
      <ModelPickerRows
        ordered={ordered}
        current={current}
        kind={kind}
        pins={pins}
        emptyMessage={
          query.trim()
            ? "没有匹配模型。请减少关键词，或在模型接入中刷新目录。"
            : page === "codex"
              ? "连接 Codex 后读取账号可用模型。"
              : "暂无模型，请在模型接入中保存连接并刷新模型列表。"
        }
        onChoose={(item) =>
          item.page
            ? setMemory({ ...memory, page: item.page })
            : item.selection && onSelect(item.selection)
        }
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
