import type { ComfyHost } from "./comfyContext.ts";
import { checkComfy, comfyContext } from "./comfyContext.ts";
import { localMutation } from "./localMutations.ts";
import { checkedUrl } from "../services/httpClient.ts";

export async function saveComfyConnection(
  host: ComfyHost,
  input: { id?: string; name: string; baseUrl: string },
  secret: string,
  scope?: string,
): Promise<string> {
  const captured = { ...input },
    ctx = comfyContext(host, scope),
    id = captured.id ?? host.app.deps.id();
  const url = checkedUrl(
    captured.baseUrl.trim(),
    host.app.deps.allowLoopbackHttp,
  );
  if (url.pathname !== "/") throw new Error("ComfyUI 地址必须是服务 origin。");
  const baseUrl = url.origin,
    old = ctx.snapshot.connections.find((c) => c.id === id);
  if (old && old.protocol !== "comfyui")
    throw new Error("请为 ComfyUI 添加独立连接。");
  const changed = old && old.baseUrl !== baseUrl;
  if (
    changed &&
    [...host.app.submitting].some((key) => key.startsWith(`${ctx.accountId}:`))
  )
    throw new Error("当前账号正在提交，暂不能更改连接地址。");
  if (
    changed &&
    ctx.snapshot.projects.some((p) =>
      p.tasks.some(
        (t) =>
          t.providerConnectionId === id &&
          ["submitted", "unknown"].includes(t.submissionState ?? ""),
      ),
    )
  )
    throw new Error("连接含未核对任务，暂不能更改地址。");
  if (changed && !secret.trim() && old.credentialRef)
    throw new Error("更换地址请明确填写此服务凭据。");
  const ref = secret.trim()
    ? `comfy-${id}-${host.app.deps.id()}`
    : changed
      ? undefined
      : old?.credentialRef;
  try {
    if (secret.trim()) {
      await ctx.vault.set(ref!, secret.trim());
      checkComfy(host, ctx);
    }
    await localMutation(host.app, ctx, (repo, snapshot) => {
      const current = snapshot.connections.find((c) => c.id === id);
      if (current && current.protocol !== "comfyui")
        throw new Error("连接协议已变化，请添加独立连接。");
      if (!secret.trim() && current?.credentialRef !== old?.credentialRef)
        throw new Error("连接凭据已变化，请重新确认。");
      if (
        current &&
        current.baseUrl !== baseUrl &&
        ([...host.app.submitting].some((key) =>
          key.startsWith(`${ctx.accountId}:`),
        ) ||
          snapshot.projects.some((p) =>
            p.tasks.some(
              (t) =>
                t.providerConnectionId === id &&
                ["submitted", "unknown"].includes(t.submissionState ?? ""),
            ),
          ))
      )
        throw new Error("连接含提交或未核对任务，暂不能更改地址。");
      if (
        current &&
        current.baseUrl !== baseUrl &&
        !secret.trim() &&
        current.credentialRef
      )
        throw new Error("更换地址请明确填写此服务凭据。");
      return repo.saveConnections([
        ...snapshot.connections.filter((c) => c.id !== id),
        {
          id,
          name: captured.name.trim() || "ComfyUI",
          provider: "ComfyUI",
          baseUrl,
          protocol: "comfyui",
          ...(ref ? { credentialRef: ref } : {}),
          capabilities: { text: false, image: true, maxOutputs: 32 },
        },
      ]);
    });
    return id;
  } catch (error) {
    if (ref && ref !== old?.credentialRef) await ctx.vault.remove(ref);
    throw error;
  }
}
