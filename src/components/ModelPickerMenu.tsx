import { useEffect, useState, useSyncExternalStore } from "react";
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
  modelSelectionId,
  readPickerMemory,
  writePickerMemory,
  type ModelSelection,
} from "../features/models/modelSelection";

const roots: Entry[] = [
  {
    id: "google",
    label: "谷歌",
    disabled: "AI Studio / Antigravity 登录适配器尚未接入",
  },
  { id: "codex", label: "Codex", page: "codex" },
  { id: "doubao", label: "豆包", disabled: "本地账号调用适配器尚未接入" },
  {
    id: "workbuddy",
    label: "WorkBuddy",
    disabled: "本地账号调用适配器尚未接入",
  },
  { id: "api", label: "API 自定义模型", page: "api" },
];
export default function ModelPickerMenu({
  scope,
  kind,
  current,
  onSelect,
  onConfigure,
}: {
  scope: "conversation" | "canvas-image" | "canvas-video" | "canvas-text";
  kind?: ModelKind;
  current?: ModelSelection;
  onSelect: (selection: ModelSelection) => void;
  onConfigure: () => void;
}) {
  const [memory, setMemory] = useState(() => readPickerMemory(scope));
  const [query, setQuery] = useState("");
  const [, setRevision] = useState(0);
  const agent = useSyncExternalStore(
    agentConnection.subscribe,
    agentConnection.getState,
  );
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
  const codex = agent.models.map((model) =>
    entry(
      { source: "codex", model: model.model || model.id },
      model.displayName || model.model,
      "Codex · 已登录账号",
      kind === "video" || kind === "audio"
        ? "Codex 当前未接入此生成模式"
        : agent.status !== "connected"
          ? "请先连接 Codex"
          : undefined,
    ),
  );
  const apis = apiMenuEntries(connections, current, kind, query);
  const defaults =
    scope === "conversation"
      ? [
          entry(
            { source: "default", model: "" },
            "默认 · Codex 主 Agent",
            "使用账号默认模型，负责规划与调用工具",
          ),
        ]
      : [];
  const { page, all } = memory;
  const visible: Entry[] =
    query.trim() || all
      ? [...defaults, ...codex, ...apis]
      : page === "root"
        ? [...defaults, ...roots]
        : page === "codex"
          ? codex
          : page === "api"
            ? connections.map((connection) => ({
                id: connection.id,
                label: connection.displayName,
                detail: connection.baseUrl,
                page: "api/" + connection.id,
              }))
            : apis.filter(
                (item) => item.selection?.connectionId === page.slice(4),
              );
  const pinScope = all ? "all" : page;
  const pins = Array.isArray(memory.pins[pinScope])
    ? memory.pins[pinScope]
    : [];
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
  const title = all
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
    <div className="kk-model-menu" role="menu" aria-label="选择模型">
      <input
        type="search"
        className="kk-model-search ui-input"
        aria-label="搜索模型、厂商或参数"
        placeholder="搜索模型、厂商、4K、16:9…"
        maxLength={120}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Escape") event.stopPropagation();
        }}
      />
      <div className="kk-model-menu-head">
        <button
          type="button"
          disabled={all || page === "root"}
          aria-label="返回上一级"
          onClick={() =>
            setMemory({
              ...memory,
              page: page.startsWith("api/") ? "api" : "root",
            })
          }
        >
          ←
        </button>
        <strong>{title}</strong>
        <button
          type="button"
          aria-label={all ? "切换分级模型" : "切换全部模型"}
          onClick={() => setMemory({ ...memory, all: !all })}
        >
          {all ? "分级" : "全部"}
        </button>
      </div>
      <div className="kk-model-menu-list">
        {ordered.map(({ item, fuzzy }) => (
          <div key={item.id} className="kk-model-menu-row">
            <button
              type="button"
              role={item.selection ? "menuitemradio" : "menuitem"}
              aria-checked={
                item.selection
                  ? Boolean(
                      current &&
                      item.selection &&
                      modelSelectionId(item.selection) ===
                        modelSelectionId(current),
                    )
                  : undefined
              }
              disabled={Boolean(item.disabled)}
              title={item.disabled ?? item.detail}
              onClick={() =>
                item.page
                  ? setMemory({ ...memory, page: item.page })
                  : item.selection && onSelect(item.selection)
              }
            >
              <span>
                {item.label}
                {item.page ? " ›" : ""}
              </span>
              <small>
                {fuzzy ? "可能匹配 · " : ""}
                {item.disabled ?? item.detail}
              </small>
            </button>
            <button
              type="button"
              className="kk-model-pin"
              aria-label={`${pins.includes(item.id) ? "取消置顶" : "置顶"} ${item.label}`}
              aria-pressed={pins.includes(item.id)}
              onClick={() =>
                setMemory({
                  ...memory,
                  pins: {
                    ...memory.pins,
                    [pinScope]: pins.includes(item.id)
                      ? pins.filter((id) => id !== item.id)
                      : [...pins, item.id],
                  },
                })
              }
            >
              ☆
            </button>
          </div>
        ))}
        {!ordered.length && (
          <p>
            {query.trim()
              ? "没有匹配模型。请减少关键词，或在设置中刷新目录、补充参数信息。"
              : page === "codex"
                ? "连接 Codex 后读取账号可用模型。"
                : "暂无模型，请在设置中保存连接并刷新模型列表。"}
          </p>
        )}
      </div>
      <button
        type="button"
        className="kk-model-configure"
        onClick={onConfigure}
      >
        配置供应商与账号…
      </button>
    </div>
  );
}
