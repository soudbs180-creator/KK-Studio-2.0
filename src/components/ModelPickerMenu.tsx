import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
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

export default function ModelPickerMenu({
  scope,
  kind,
  current,
  onSelect,
  onConfigure,
  apiOnly = false,
  options,
}: {
  scope: "conversation" | "canvas-image" | "canvas-video" | "canvas-text";
  kind?: ModelKind;
  apiOnly?: boolean;
  options?: ReactNode;
  current?: ModelSelection;
  onSelect: (selection: ModelSelection) => void;
  onConfigure: () => void;
}) {
  const [memory, setMemory] = useState(() => readPickerMemory(scope));
  const [query, setQuery] = useState("");
  const [scene, setScene] = useState<ModelKind>(kind ?? "text");
  const instanceId = useId().replace(/:/g, "");
  const sceneRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [, setRevision] = useState(0);
  const agent = useSyncExternalStore(
    agentConnection.subscribe,
    agentConnection.getState,
  );
  useEffect(() => {
    setScene(kind ?? "text");
  }, [kind]);
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
  const codex = (apiOnly || scene !== "text" ? [] : agent.models).map((model) =>
    entry(
      { source: "codex", model: model.model || model.id, kind: "text" },
      model.displayName || model.model,
      "Codex · 已登录账号",
      kind === "image" || kind === "video" || kind === "audio"
        ? "Codex 当前未接入此生成模式"
        : agent.status !== "connected"
          ? "请先连接 Codex"
          : undefined,
    ),
  );
  const codexImage =
    !apiOnly && scene === "image"
      ? [
          entry(
            {
              source: "codex",
              model: "",
              kind: "image",
              displayName: "图片模型未报告",
            },
            "图片模型未报告",
            "Codex 内置能力 · 上游未返回型号",
            agent.status !== "connected" ? "请先连接 Codex" : undefined,
          ),
        ]
      : [];
  const apis = apiMenuEntries(connections, current, scene, query).filter(
    (item) =>
      item.selection?.kind === scene || item.selection?.kind === "unknown",
  );
  const defaults =
    scope === "conversation" && scene === "text"
      ? [
          entry(
            { source: "default", model: "" },
            "默认 · Codex 主 Agent",
            "使用账号默认模型，负责规划与调用工具",
          ),
        ]
      : [];
  const pinScope = scene;
  const pins = Array.isArray(memory.pins[pinScope])
    ? memory.pins[pinScope]
    : [];
  const visible: Entry[] = [...defaults, ...codexImage, ...codex, ...apis];
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
    <div className="kk-model-menu" role="menu" aria-label="选择模型">
      <div className="kk-model-menu-top">
        <strong>
          {scope === "conversation" ? "Agent 与模型" : "模型配置"}
        </strong>
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
      <div className="kk-model-scenes" role="tablist" aria-label="模型场景">
        {(
          [
            ["text", "Agent"],
            ["image", "图片"],
            ["video", "视频"],
            ["audio", "音频"],
          ] as const
        ).map(([value, label], index, scenes) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={scene === value}
            id={`model-scene-tab-${instanceId}-${value}`}
            aria-controls={`model-scene-panel-${instanceId}`}
            tabIndex={scene === value ? 0 : -1}
            ref={(node) => {
              sceneRefs.current[index] = node;
            }}
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? scenes.length - 1
                    : (index +
                        (event.key === "ArrowLeft" ? -1 : 1) +
                        scenes.length) %
                      scenes.length;
              const [nextValue] = scenes[next];
              setScene(nextValue);
              sceneRefs.current[next]?.focus();
            }}
            onClick={() => setScene(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        id={`model-scene-panel-${instanceId}`}
        className="kk-model-scene-panel"
        role="tabpanel"
        aria-labelledby={`model-scene-tab-${instanceId}-${scene}`}
        tabIndex={0}
      >
        <div className="kk-model-menu-head">
          <strong>{scene === "text" ? "智能体与对话模型" : "生成模型"}</strong>
          {kind && scene !== kind && (
            <small>浏览其他场景；请在对应入口使用</small>
          )}
        </div>
        <div className="kk-model-parameter-summary" aria-label="常用模型参数">
          {scene === "text" && (
            <>
              <span>思考</span>
              <strong>最大（默认）</strong>
              <span>调用</span>
              <strong>Agent 可切换模型</strong>
            </>
          )}
          {scene === "image" && (
            <>
              <span>比例</span>
              <strong>自适应</strong>
              <span>清晰度</span>
              <strong>按模型声明</strong>
              <span>搜索</span>
              <strong>谷歌系按能力显示</strong>
            </>
          )}
          {scene === "video" && (
            <>
              <span>比例</span>
              <strong>草稿可调</strong>
              <span>清晰度</span>
              <strong>草稿可调</strong>
              <span>发送</span>
              <strong>视频接口未接入</strong>
              <span>音频</span>
              <strong>草稿开关</strong>
            </>
          )}
          {scene === "audio" && (
            <>
              <span>音色</span>
              <strong>模型专属</strong>
              <span>格式</span>
              <strong>模型专属</strong>
              <span>语速</span>
              <strong>模型专属</strong>
            </>
          )}
        </div>
        <ModelPickerRows
          ordered={ordered}
          current={current}
          scene={scene}
          pins={pins}
          emptyMessage={
            query.trim()
              ? "没有匹配模型。请减少关键词，或在设置中刷新目录、补充参数信息。"
              : scene === "text"
                ? "连接 Agent 后读取可用模型。"
                : "暂无模型，请在设置中保存连接并刷新模型列表。"
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
                [pinScope]: pins.includes(id)
                  ? pins.filter((value) => value !== id)
                  : [...pins, id],
              },
            })
          }
        />
        {options && (
          <section className="start-model-options" aria-label="生成设置">
            {options}
          </section>
        )}
        <button
          type="button"
          className="kk-model-configure"
          onClick={onConfigure}
        >
          配置供应商与账号…
        </button>
      </div>
    </div>
  );
}
