import { useState } from "react";
import ModelPickerRows from "./ModelPickerRows";
import UiIcon from "./UiIcon";
import {
  googleAgentConnection,
  type GoogleAgentState,
} from "../features/agent/index.ts";
import { searchModels } from "../features/models/index.ts";
import type { Entry } from "../features/models/index.ts";

function GoogleModelOptions({
  state,
  onClose,
}: {
  state: GoogleAgentState;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const models = [...new Set([state.settings.model, ...state.models])].filter(
    Boolean,
  );
  const input = query.trim();
  const entries: Entry[] = models.map((model) => ({
    id: model,
    label: model,
    checked: model === state.settings.model,
  }));
  if (input && !models.includes(input))
    entries.unshift({
      id: input,
      label: input,
      detail: "使用输入型号",
      checked: false,
    });
  const choose = (item: Entry) => {
    googleAgentConnection.configure({ model: item.id });
    onClose();
  };
  return (
    <div className="kk-model-menu" role="menu" aria-label="Google 模型">
      <div className="kk-model-menu-top">
        <strong>Google Gemini</strong>
      </div>
      <div className="kk-model-menu-head">
        <input
          className="kk-model-search"
          aria-label="搜索或输入 Google 型号"
          placeholder="搜索或输入型号"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            event.stopPropagation();
            if (
              !event.nativeEvent.isComposing &&
              event.nativeEvent.keyCode !== 229 &&
              input
            )
              choose({ id: input, label: input });
          }}
        />
      </div>
      <ModelPickerRows
        ordered={searchModels(entries, query)}
        pins={[]}
        emptyMessage="输入完整型号后可直接使用"
        onChoose={choose}
      />
    </div>
  );
}

export default function GoogleModelPicker({
  state,
  open,
  onToggle,
  onClose,
}: {
  state: GoogleAgentState;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const disabled = state.sending || state.status === "connecting";
  return (
    <>
      <button
        type="button"
        className="chat-model-picker"
        aria-label="Google 模型"
        aria-haspopup="menu"
        aria-expanded={open && !disabled}
        disabled={disabled}
        title={state.settings.model}
        onClick={onToggle}
      >
        <UiIcon name="text" size={20} />
        <span className="chat-model-name">
          {state.settings.model || "Google Gemini"}
        </span>
      </button>
      {open && !disabled && (
        <GoogleModelOptions state={state} onClose={onClose} />
      )}
    </>
  );
}
