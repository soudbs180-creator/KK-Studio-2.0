import { safeStorage } from "../features/agent/agentConnection";

export default function ConversationChannelSelector({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="chat-agent-controls">
      <label>
        执行方式{" "}
        <select
          aria-label="执行方式"
          value={value}
          disabled={disabled}
          onChange={(event) => {
            safeStorage.setItem("kk-chat-channel", event.target.value);
            onChange(event.target.value);
          }}
        >
          <option value="codex">Codex 主 Agent（默认）</option>
          <option value="direct">直接生成 · 项目 API</option>
        </select>
      </label>
    </div>
  );
}
