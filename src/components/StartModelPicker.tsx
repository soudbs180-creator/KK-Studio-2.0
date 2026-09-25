import { useState, type KeyboardEvent } from "react";
import type { CreationDraft } from "../features/creation/model";
import { readProviderConnections } from "../features/creation/providerRegistry";
import { catalogForConnection } from "../features/models/modelCatalog";

interface StartModelChoice {
  key: string;
  model: string;
  connectionId?: string;
  detail: string;
  disabled?: string;
}

function modelChoices(draft: CreationDraft, defaultModel: string) {
  const unbound = [
    ...new Set(
      [
        defaultModel,
        draft.providerConnectionId ? "" : draft.model,
        "kk-image-2",
      ]
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ].map((model): StartModelChoice => ({
    key: `default:${model}`,
    model,
    detail: model === defaultModel ? "默认供应商配置" : "需配置可用连接",
  }));
  const connected = readProviderConnections()
    .filter((connection) => connection.kind === "user_byok")
    .flatMap((connection) =>
      catalogForConnection(connection)
        .filter((model) => model.kind === "image")
        .map((model): StartModelChoice => ({
          key: `${connection.id}:${model.id}`,
          model: model.id,
          connectionId: connection.id,
          detail: connection.displayName,
          disabled:
            connection.state === "disabled" ||
            connection.state === "quarantined"
              ? "连接已禁用或隔离，请检查设置"
              : undefined,
        })),
    );
  return [...unbound, ...connected];
}

export default function StartModelPicker({
  draft,
  defaultModel,
  model,
  open,
  onToggle,
  onSelect,
  onConfigure,
}: {
  draft: CreationDraft;
  defaultModel: string;
  model: string;
  open: boolean;
  onToggle: () => void;
  onSelect: (choice: Pick<StartModelChoice, "model" | "connectionId">) => void;
  onConfigure: () => void;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLocaleLowerCase();
  const matches = modelChoices(draft, defaultModel).filter((choice) =>
    `${choice.model} ${choice.detail}`.toLocaleLowerCase().includes(needle),
  );
  const visible = matches.slice(0, 100);
  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const target = event.target as HTMLElement;
    if (target.closest("input, textarea, [contenteditable='true']")) return;
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        '[role="menuitemradio"]:not(:disabled)',
      ),
    );
    const current = target.closest<HTMLButtonElement>('[role="menuitemradio"]');
    const index = current ? items.indexOf(current) : -1;
    if (index < 0 || !items.length) return;
    event.preventDefault();
    event.stopPropagation();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
            items.length;
    items[next]?.focus();
    items[next]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  return (
    <div className="start-model-picker">
      <button
        type="button"
        className="start-tool-button"
        aria-label="模型"
        aria-haspopup="menu"
        aria-expanded={open}
        title={model}
        onClick={onToggle}
      >
        <img src="/design/figma/composer-package.svg" alt="" />
        <span>{draft.model || defaultModel ? model : "模型"}</span>
      </button>
      {open && (
        <div
          className="start-model-popover"
          role="menu"
          aria-label="选择模型"
          onKeyDown={onMenuKeyDown}
        >
          <div className="start-model-menu-top">
            <strong>模型</strong>
            <input
              type="search"
              aria-label="搜索模型"
              placeholder="搜索模型"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="start-model-menu-subtitle">选择当前可用模型</div>
          <div className="start-model-menu-list">
            {visible.map((choice) => {
              const selected =
                model === choice.model &&
                draft.providerConnectionId === choice.connectionId;
              return (
                <button
                  key={choice.key}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  disabled={Boolean(choice.disabled)}
                  title={choice.disabled ?? choice.detail}
                  onClick={() => onSelect(choice)}
                >
                  <span className="start-model-choice">
                    <span>{choice.model}</span>
                    <small>{choice.disabled ?? choice.detail}</small>
                  </span>
                  {selected && <span aria-hidden="true">✓</span>}
                </button>
              );
            })}
            {!visible.length && <p>没有匹配的图片模型，请配置供应商。</p>}
            {matches.length > visible.length && (
              <p>只显示前 100 项，请搜索模型或供应商。</p>
            )}
          </div>
          <button
            type="button"
            className="start-model-configure"
            onClick={onConfigure}
          >
            配置供应商与模型…
          </button>
        </div>
      )}
    </div>
  );
}
