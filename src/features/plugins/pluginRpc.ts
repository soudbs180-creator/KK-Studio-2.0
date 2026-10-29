import {
  pluginRpcRequestSchema as requestSchema,
  type PluginRpcRequest as Request,
} from "../../../packages/creation-contracts/index.ts";
import {
  PLUGIN_RPC_MAX_BYTES,
  PLUGIN_RPC_TIMEOUT_MS,
} from "../../../packages/creation-contracts/index.ts";
import { PluginPermissionError } from "./pluginPermissions.ts";
import type { PluginNodeContext } from "./pluginTypes.ts";

function run(
  context: PluginNodeContext,
  request: Request,
  signal: AbortSignal,
) {
  const { method, params } = request;
  switch (method) {
    case "canvas.read":
      return context.getNodes();
    case "node.patch":
      return context.updateNode(params);
    case "ai.image":
      return context.ai.generateImage(params.prompt, {
        model: params.model,
        signal,
      });
    case "ai.video":
      return context.ai.generateVideo(params.prompt, {
        model: params.model,
        signal,
      });
    case "ai.text":
      return context.ai.generateText(params.prompt, {
        model: params.model,
        signal,
      });
    case "storage.get":
      return context.storage.get(params.key);
    case "storage.set":
      return context.storage.set(params.key, params.value);
    case "storage.remove":
      return context.storage.remove(params.key);
  }
}

export function createPluginRpc(
  context: () => PluginNodeContext,
  active: () => boolean,
  timeoutMs = PLUGIN_RPC_TIMEOUT_MS,
) {
  let closed = false;
  const seen = new Set<string>();
  const pending = new Map<string, AbortController>();
  const error = (id: string | null, code: string, message: string) =>
    JSON.stringify({ id, error: { code, message } });
  async function dispatch(raw: unknown): Promise<string> {
    if (closed || !active()) return error(null, "DISABLED", "插件已停用。");
    if (
      typeof raw !== "string" ||
      new TextEncoder().encode(raw).byteLength > PLUGIN_RPC_MAX_BYTES
    )
      return error(null, "INVALID_REQUEST", "插件消息无效或过大。");
    let request: Request;
    try {
      request = requestSchema.parse(JSON.parse(raw));
    } catch {
      return error(null, "INVALID_REQUEST", "插件消息不符合契约。");
    }
    if (seen.has(request.id))
      return error(request.id, "DUPLICATE", "请求已处理，不重复提交。");
    if (pending.size >= 8 || seen.size >= 512)
      return error(request.id, "LIMIT", "插件会话请求达到上限。");
    seen.add(request.id);
    const controller = new AbortController();
    pending.set(request.id, controller);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const interrupted = new Promise<never>((_resolve, reject) => {
        controller.signal.addEventListener(
          "abort",
          () => reject(new Error("Stopped")),
          { once: true },
        );
        timer = setTimeout(() => controller.abort(), timeoutMs);
      });
      const operation = Promise.resolve().then(() => {
        if (closed || !active() || controller.signal.aborted)
          throw new Error("Stopped");
        return run(context(), request, controller.signal);
      });
      const result = await Promise.race([operation, interrupted]);
      if (closed || !active())
        return error(request.id, "DISABLED", "插件已停用。");
      const response = JSON.stringify({
        id: request.id,
        result: result ?? null,
      });
      if (new TextEncoder().encode(response).byteLength > PLUGIN_RPC_MAX_BYTES)
        return error(request.id, "LIMIT", "插件响应超过大小上限。");
      return response;
    } catch (cause) {
      return error(
        request.id,
        cause instanceof PluginPermissionError
          ? cause.code
          : controller.signal.aborted
            ? "STOPPED"
            : "FAILED",
        cause instanceof PluginPermissionError
          ? cause.message
          : "插件调用已停止或失败。",
      );
    } finally {
      clearTimeout(timer);
      pending.delete(request.id);
    }
  }
  return {
    dispatch,
    close() {
      closed = true;
      for (const controller of pending.values()) controller.abort();
    },
  };
}
