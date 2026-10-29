import type {
  AgentActivityDetail,
  AgentChatItem,
} from "../features/agent/index.ts";
import { agentActivityState } from "../features/agent/index.ts";

/** 只展示现有消息活动；折叠状态由原生 details 管理。 */
export default function AgentExecutionProcess({
  items,
}: {
  items: AgentChatItem[];
}) {
  const states = items.map(agentActivityState);
  const running = states.filter((state) => state.tone === "running").length;
  const failures = states.filter((state) => state.tone === "failure").length;
  const interrupted = states.some((state) => state.tone === "interrupted");
  return (
    <details className="chat-agent-execution">
      <summary>
        执行过程 · {items.length} 项
        {running ? " · 执行中" : interrupted ? " · 已中断" : " · 已结束"}
        {failures > 0 && ` · ${failures} 项失败`}
      </summary>
      <ol className="chat-agent-execution-list">
        {items.map((item, index) => {
          const detail = item.detail as AgentActivityDetail | undefined;
          const state = states[index];
          const rows = [
            ...(Array.isArray(detail?.rows) ? detail.rows : []),
            ...(detail?.cwd ? [{ label: "工作目录", value: detail.cwd }] : []),
            ...(detail?.exitCode !== undefined
              ? [{ label: "退出状态", value: String(detail.exitCode) }]
              : []),
          ];
          return (
            <li
              key={item.id}
              className={`chat-agent-execution-item is-${state.tone}`}
              data-item-id={item.itemId ?? item.id}
              data-turn-id={item.turnId}
            >
              <div className="chat-agent-execution-heading">
                <strong>{item.title ?? "工具活动"}</strong>
                <span className="chat-agent-execution-state">
                  {state.label}
                </span>
              </div>
              {item.text && <p>{item.text}</p>}
              {rows.length > 0 && (
                <dl>
                  {rows.map((row, rowIndex) => (
                    <div key={rowIndex}>
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {Array.isArray(detail?.files) &&
                detail.files.map((file, fileIndex) => (
                  <p key={fileIndex}>
                    {file.action} {file.path}
                  </p>
                ))}
              {typeof detail?.output === "string" && detail.output && (
                <pre>{detail.output}</pre>
              )}
              {detail?.error && detail.error !== detail.output && (
                <p className="chat-agent-execution-error">{detail.error}</p>
              )}
            </li>
          );
        })}
      </ol>
    </details>
  );
}
