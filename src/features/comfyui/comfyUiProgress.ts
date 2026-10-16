export interface ComfyUiProgressState {
  percent: number;
  stage: string;
  error?: string;
}

/**
 * Parses ComfyUI WebSocket progress and execution messages.
 * Handles `progress`, `executing`, `executed`, and `execution_error` payloads.
 */
export function parseComfyUiProgressMessage(
  data: string | object | unknown,
): ComfyUiProgressState {
  if (data === null || data === undefined) {
    return { percent: 0, stage: "idle" };
  }

  let root: Record<string, unknown>;
  if (typeof data === "string") {
    try {
      root = JSON.parse(data) as Record<string, unknown>;
    } catch (err) {
      return {
        percent: 0,
        stage: "error",
        error: err instanceof Error ? err.message : "Invalid JSON message",
      };
    }
  } else if (typeof data === "object") {
    root = data as Record<string, unknown>;
  } else {
    return { percent: 0, stage: "unknown" };
  }

  const type = typeof root.type === "string" ? root.type : "";
  const payload =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;

  switch (type) {
    case "progress": {
      const value = Number(payload.value ?? root.value ?? 0);
      const max = Number(payload.max ?? root.max ?? 0);
      const percent = max > 0 ? (value / max) * 100 : 0;
      const stage =
        payload.node != null
          ? String(payload.node)
          : typeof payload.stage === "string"
            ? payload.stage
            : "progress";
      return {
        percent,
        stage,
      };
    }

    case "executing": {
      const node = payload.node !== undefined ? payload.node : root.node;
      if (node === null || node === undefined || node === "") {
        return {
          percent: 100,
          stage: "completed",
        };
      }
      return {
        percent: 0,
        stage: String(node),
      };
    }

    case "executed": {
      return {
        percent: 100,
        stage: typeof payload.stage === "string" ? payload.stage : "executed",
      };
    }

    case "execution_error": {
      const errorMsg =
        (typeof payload.exception_message === "string" && payload.exception_message) ||
        (typeof payload.message === "string" && payload.message) ||
        (typeof payload.error === "string" && payload.error) ||
        "Execution error";
      const stage =
        payload.node_id != null
          ? String(payload.node_id)
          : payload.node_type != null
            ? String(payload.node_type)
            : typeof payload.stage === "string"
              ? payload.stage
              : "execution_error";
      return {
        percent: 0,
        stage,
        error: errorMsg,
      };
    }

    default: {
      if (payload.value !== undefined && payload.max !== undefined) {
        const value = Number(payload.value ?? 0);
        const max = Number(payload.max ?? 0);
        return {
          percent: max > 0 ? (value / max) * 100 : 0,
          stage: payload.node != null ? String(payload.node) : "progress",
        };
      }
      if (payload.error || payload.exception_message) {
        return {
          percent: 0,
          stage: "execution_error",
          error: String(payload.error ?? payload.exception_message),
        };
      }
      return {
        percent: 0,
        stage: type || "unknown",
      };
    }
  }
}
