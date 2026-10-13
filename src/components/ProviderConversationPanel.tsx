import { useState } from "react";
import type { CreationProject } from "../features/creation/model";
import { readProviderConnections } from "../features/creation/providerRegistry";
import { catalogForConnection } from "../features/models/modelCatalog";
import type { SkillRegistry } from "../features/skills/skillRegistry";
import ConversationSharingHeader from "./ConversationSharingHeader";
import ProviderConversationReply from "./ProviderConversationReply";
import ConversationChannelSelector from "./ConversationChannelSelector";
import MessageMarkdown from "./MessageMarkdown";
import MessageActions from "./MessageActions";
import AssistantPicker from "./AssistantPicker";

export interface ProviderConversationInput {
  projectId: string;
  prompt: string;
  routes: Array<{ connectionId: string; modelId: string }>;
  assistantId?: string;
  remoteApproved: boolean;
}

export default function ProviderConversationPanel({
  project,
  onClose,
  onOpen,
  onChannelChange,
  onSubmit,
  onCancelTask,
  registry,
  onDraftChange,
  channelBusy,
}: {
  project: CreationProject;
  onClose: () => void;
  onOpen: (id: string) => void;
  onChannelChange: (id: string) => void;
  onSubmit: (
    input: ProviderConversationInput,
  ) => Promise<string | { notice: string } | undefined>;
  onCancelTask: (id: string) => void;
  registry?: SkillRegistry;
  onDraftChange: (patch: Partial<CreationProject["composerDraft"]>) => void;
  channelBusy: boolean;
}) {
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);
  const [remoteApproved, setRemoteApproved] = useState(false);
  const connections = readProviderConnections().filter(
    (connection) =>
      connection.state !== "disabled" &&
      connection.capabilities.modalities.includes("text"),
  );
  const available = connections.flatMap((connection) =>
    catalogForConnection(connection)
      .filter((model) => model.kind === "text")
      .map((model) => ({
        key: JSON.stringify([connection.id, model.id]),
        connectionId: connection.id,
        modelId: model.id,
        label: `${connection.displayName} · ${model.id}`,
      })),
  );
  const routes = project.composerDraft.conversationRoutes ?? [];
  const tasks = project.tasks.filter((task) => task.conversationRoundId);
  const busy = tasks.some((task) =>
    ["queued", "running"].includes(task.status),
  );
  const uncertain = tasks.some(
    (task) => task.status === "unknown" || task.submissionState === "unknown",
  );
  const messages = project.messages.filter(
    (message) =>
      message.role === "user" &&
      tasks.some((task) => task.conversationUserMessageId === message.id),
  );
  const remote = routes.some((route) => {
    try {
      return !["localhost", "127.0.0.1", "[::1]"].includes(
        new URL(
          connections.find((connection) => connection.id === route.connectionId)
            ?.baseUrl ?? "",
        ).hostname,
      );
    } catch {
      return true;
    }
  });
  const shareMessages = messages.flatMap((message) => [
    { role: "user", content: message.content },
    ...tasks
      .filter(
        (task) =>
          task.conversationUserMessageId === message.id &&
          task.status === "succeeded",
      )
      .flatMap(
        (task) =>
          task.outputs
            ?.filter((output) => output.status === "succeeded" && output.text)
            .map((output) => ({
              role: "assistant",
              content: `**${task.providerName ?? "模型"} · ${task.model}**\n\n${output.text}`,
            })) ?? [],
      ),
  ]);
  async function submit() {
    if (sending || busy || channelBusy || uncertain) return;
    setSending(true);
    try {
      const result = await onSubmit({
        projectId: project.id,
        prompt: project.composerDraft.prompt,
        routes,
        assistantId: project.composerDraft.assistantId,
        remoteApproved,
      });
      setStatus(
        typeof result === "string"
          ? result
          : (result?.notice ??
              "已提交给所选模型，回复分别显示。结果也会保存在当前画布。"),
      );
      if (typeof result !== "string") {
        onDraftChange({ prompt: "" });
        setRemoteApproved(false);
      }
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "提交失败，草稿仍保留。",
      );
    } finally {
      setSending(false);
    }
  }
  return (
    <aside className="conversation-panel provider-conversation-panel">
      <ConversationSharingHeader
        title={project.name}
        messageCount={shareMessages.length}
        onClose={onClose}
        onStatus={setStatus}
        messages={shareMessages}
      />
      <ConversationChannelSelector
        value="models"
        disabled={busy || sending || channelBusy}
        onChange={onChannelChange}
      />
      <div className="provider-conversation-routes">
        <p>
          选择 2–3
          个文本模型，同一条消息分别发送；每个模型只接收自己的历史回复。
        </p>
        {[0, 1, 2].map((index) => (
          <label key={index}>
            模型 {index + 1}
            <select
              aria-label={`对话模型 ${index + 1}`}
              disabled={busy || sending}
              value={
                routes[index]
                  ? JSON.stringify([
                      routes[index].connectionId,
                      routes[index].modelId,
                    ])
                  : ""
              }
              onChange={(event) => {
                const option = available.find(
                  (item) => item.key === event.target.value,
                );
                const next = [...routes];
                if (option)
                  next[index] = {
                    connectionId: option.connectionId,
                    modelId: option.modelId,
                  };
                else next.splice(index, 1);
                onDraftChange({ conversationRoutes: next.filter(Boolean) });
                setRemoteApproved(false);
              }}
            >
              <option value="">
                {index === 2 ? "不添加第三个模型" : "选择已配置的文本模型"}
              </option>
              {available.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        {!available.length && (
          <button type="button" onClick={() => onOpen("settings/providers")}>
            配置云端或本地模型
          </button>
        )}
      </div>
      <div className="conversation-messages" aria-label="多模型对话">
        {messages.map((message) => (
          <section key={message.id} className="provider-conversation-round">
            <div className="chat-bubble">
              <MessageMarkdown content={message.content} />
              <MessageActions content={message.content} />
            </div>
            <div className="provider-conversation-replies">
              {tasks
                .filter((task) => task.conversationUserMessageId === message.id)
                .map((task) => (
                  <ProviderConversationReply
                    key={task.id}
                    task={task}
                    onCancel={() => onCancelTask(task.id)}
                  />
                ))}
            </div>
          </section>
        ))}
        {!messages.length && (
          <p className="chat-status">
            选择模型后开始对话。代码、图片和视频助手会提供对应指导；此通道只发送文字。
          </p>
        )}
        {uncertain && (
          <p role="status" className="chat-status">
            上一轮有结果需核对，请先在任务面板核对供应商，避免重复发送。
          </p>
        )}
        {status && (
          <p role="status" className="chat-status">
            {status}
          </p>
        )}
      </div>
      {registry && (
        <AssistantPicker
          registry={registry}
          selectedId={project.composerDraft.assistantId}
          onSelect={(assistantId) => onDraftChange({ assistantId })}
          onStatus={setStatus}
          disabled={busy || sending}
        />
      )}
      <div className="provider-conversation-composer">
        <textarea
          aria-label="多模型对话输入"
          placeholder="输入要同时发给所选模型的内容"
          maxLength={4000}
          value={project.composerDraft.prompt}
          disabled={busy || sending}
          onChange={(event) => onDraftChange({ prompt: event.target.value })}
        />
        {remote && (
          <label>
            <input
              type="checkbox"
              checked={remoteApproved}
              disabled={busy || sending}
              onChange={(event) => setRemoteApproved(event.target.checked)}
            />
            允许将本轮文字及各模型的历史发送至所选远程连接
          </label>
        )}
        <div>
          <button
            type="button"
            disabled={
              busy ||
              sending ||
              channelBusy ||
              uncertain ||
              !project.composerDraft.prompt.trim() ||
              routes.length < 2 ||
              (remote && !remoteApproved)
            }
            onClick={() => void submit()}
          >
            同时发送
          </button>
          {busy && (
            <button
              type="button"
              onClick={() =>
                tasks
                  .filter((task) => ["queued", "running"].includes(task.status))
                  .forEach((task) => onCancelTask(task.id))
              }
            >
              停止全部
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
