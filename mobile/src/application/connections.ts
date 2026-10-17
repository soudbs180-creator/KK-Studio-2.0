import type {
  WorkflowHost,
  ConnectionInput,
  ApplicationState,
} from "./types.ts";
import { providerConnection } from "./types.ts";
import type { ModelProbe } from "../services/providerTypes.ts";
import { checkedUrl } from "../services/httpClient.ts";
interface ConnectionHost extends WorkflowHost {
  getState(): ApplicationState;
  updateHealth(health: Record<string, ModelProbe>): void;
}
export async function saveConnection(
  host: ConnectionHost,
  input: ConnectionInput,
  secret: string,
): Promise<string> {
  input = structuredClone(input);
  checkedUrl(input.baseUrl.trim(), host.deps.allowLoopbackHttp);
  const ctx = host.context(),
    id = input.id ?? host.deps.id(),
    existing = ctx.snapshot.connections.find((c) => c.id === id);
  if (
    existing &&
    existing.protocol !== input.protocol &&
    ctx.snapshot.projects.some((p) =>
      p.tasks.some((t) => t.providerConnectionId === id),
    )
  )
    throw new Error(
      "连接已有任务记录；切换协议请添加新连接，历史任务仍使用原协议。",
    );
  if (
    existing &&
    (existing.baseUrl !== input.baseUrl.trim() ||
      existing.protocol !== input.protocol) &&
    (ctx.snapshot.projects.some((p) =>
      p.tasks.some(
        (t) =>
          t.providerConnectionId === id &&
          ["submitted", "unknown"].includes(t.submissionState ?? ""),
      ),
    ) ||
      [...host.submitting].some((key) => key.startsWith(`${ctx.accountId}:`)))
  )
    throw new Error("连接含执行或未核对任务，暂不能更改地址或协议。");
  const oldRef = existing?.credentialRef,
    previous = oldRef ? await ctx.vault.get(oldRef) : null;
  if (existing && existing.baseUrl !== input.baseUrl.trim() && !secret.trim())
    throw new Error("更换地址时请明确填写此服务的 Key，旧任务仍使用原凭据。");
  const ref =
    secret.trim() || !oldRef ? `provider-${id}-${host.deps.id()}` : oldRef;
  if (!secret.trim() && !previous)
    throw new Error("请输入 API Key；凭据仅保存到设备凭据库。");
  try {
    if (secret.trim()) await ctx.vault.set(ref, secret.trim());
    await host.mutate(ctx, (repo, s) =>
      repo.saveConnections([
        ...s.connections.filter((c) => c.id !== id),
        {
          id,
          name: input.name.trim() || "我的连接",
          provider: input.protocol,
          baseUrl: input.baseUrl.trim(),
          credentialRef: ref,
          protocol: input.protocol,
          capabilities: structuredClone(input.capabilities),
        },
      ]),
    );
    host.updateHealth(
      Object.fromEntries(
        Object.entries(host.getState().health).filter(([key]) => key !== id),
      ),
    );
    return id;
  } catch (error) {
    if (ref !== oldRef) await ctx.vault.remove(ref);
    throw error;
  }
}
export async function removeConnection(
  host: ConnectionHost,
  id: string,
): Promise<void> {
  const ctx = host.context();
  if (
    ctx.snapshot.projects.some((p) =>
      p.tasks.some(
        (t) =>
          t.providerConnectionId === id &&
          [
            "queued",
            "running",
            "unknown",
            "partial",
            "offline",
            "interrupted",
          ].includes(t.status),
      ),
    )
  )
    throw new Error("连接仍有未核对任务，请先完成恢复。");
  const ref = ctx.snapshot.connections.find((c) => c.id === id)?.credentialRef;
  await host.mutate(ctx, (r, s) =>
    r.saveConnections(s.connections.filter((c) => c.id !== id)),
  );
  if (ref) await ctx.vault.remove(ref);
}
export async function probeConnection(
  host: ConnectionHost,
  id: string,
): Promise<void> {
  const ctx = host.context(),
    metadata = ctx.snapshot.connections.find((c) => c.id === id);
  if (!metadata) throw new Error("连接不存在。");
  const connection = providerConnection(metadata);
  if (connection.protocol !== "openai-compatible")
    throw new Error("此协议没有兼容的模型发现端点，不能宣称健康。");
  const health = await host.deps.provider(ctx.vault).probeModels(connection);
  if (host.valid(ctx))
    host.updateHealth({ ...host.getState().health, [id]: health });
}
