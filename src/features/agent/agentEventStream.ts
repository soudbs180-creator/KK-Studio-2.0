/** Native EventSource cannot send the local bridge token in a header. */
export interface EventSourceLike {
  onmessage: ((event: { data?: string; type?: string }) => void) | null;
  onerror: ((error?: Error) => void) | null;
  close(): void;
}

export function createAgentEventStream(
  url: string,
  token: string,
  fetcher: typeof fetch = fetch,
): EventSourceLike {
  const controller = new AbortController();
  const source: EventSourceLike = {
    onmessage: null,
    onerror: null,
    close: () => controller.abort(),
  };
  void (async () => {
    try {
      const response = await fetcher(url, {
        headers: { Accept: "text/event-stream", "x-canvas-agent-token": token },
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok || !response.body)
        throw new Error(
          response.status === 401
            ? "本地 Agent 连接凭据无效，请重新连接。"
            : `Agent 事件流不可用（HTTP ${response.status}）`,
        );
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let type = "message";
      let data: string[] = [];
      let dataSize = 0;
      try {
        while (!controller.signal.aborted) {
          const chunk = await reader.read();
          if (chunk.done)
            throw new Error(
              "本地 Agent 事件流已断开，请重新连接并核对任务结果。",
            );
          buffer += decoder.decode(chunk.value, { stream: true });
          if (buffer.length > 2 * 1024 * 1024)
            throw new Error("Agent 事件超过大小限制。");
          let newline: number;
          while ((newline = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, newline).replace(/\r$/, "");
            buffer = buffer.slice(newline + 1);
            if (!line) {
              if (data.length && !controller.signal.aborted)
                source.onmessage?.({ type, data: data.join("\n") });
              type = "message";
              data = [];
              dataSize = 0;
            } else if (line.startsWith("event:")) type = line.slice(6).trim();
            else if (line.startsWith("data:")) {
              data.push(line.slice(5).replace(/^ /, ""));
              dataSize += line.length;
              if (dataSize > 2 * 1024 * 1024)
                throw new Error("Agent 事件超过大小限制。");
            }
          }
        }
      } finally {
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
    } catch (error) {
      if (!controller.signal.aborted)
        source.onerror?.(
          error instanceof Error ? error : new Error("Agent 事件流连接失败"),
        );
    }
  })();
  return source;
}
