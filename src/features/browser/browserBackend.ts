import {
  getBrowserProvider,
  listBrowserProviders,
} from "./browserProviders.ts";
import type {
  BrowserApprovalRequest,
  BrowserBackend,
  BrowserHandoffKind,
  BrowserProviderId,
  BrowserRuntime,
  BrowserStatus,
} from "./browserTypes.ts";

export type BrowserBackendErrorCode =
  | "authorization-required"
  | "handoff-required"
  | "provider-unavailable"
  | "invalid-provider";

export class BrowserBackendError extends Error {
  readonly code: BrowserBackendErrorCode;

  constructor(code: BrowserBackendErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "BrowserBackendError";
  }
}

export function createBrowserBackend(
  runtime: BrowserRuntime,
  options: { provider?: BrowserProviderId } = {},
): BrowserBackend {
  const selected = options.provider ?? "internal";
  if (!listBrowserProviders().some((provider) => provider.id === selected)) {
    throw new BrowserBackendError(
      "invalid-provider",
      "浏览器后端不存在。请重新选择。",
    );
  }
  let providerId = selected;
  let sequence = 0;
  let handoffConfirmed = false;
  let state = initialState(providerId);

  function patch(next: Partial<BrowserStatus>): void {
    state = { ...state, ...next };
  }

  function initialState(id: BrowserProviderId): BrowserStatus {
    const provider = getBrowserProvider(id);
    return {
      provider: id,
      phase: provider.requiresAuthorization ? "idle" : "ready",
      automation: provider.automation,
      available: id === "internal" ? true : null,
      authorized: !provider.requiresAuthorization,
      message: provider.requiresAuthorization
        ? `已选择 ${provider.label}，等待本次任务授权。`
        : `${provider.label} 已保留并可用。`,
      url: null,
      handoff: null,
    };
  }

  function select(next: BrowserProviderId): void {
    if (!listBrowserProviders().some((provider) => provider.id === next)) {
      throw new BrowserBackendError(
        "invalid-provider",
        "浏览器后端不存在。请重新选择。",
      );
    }
    providerId = next;
    handoffConfirmed = false;
    state = initialState(providerId);
  }

  function authorize(): void {
    const provider = getBrowserProvider(providerId);
    patch({
      authorized: true,
      phase: "ready",
      message: `已获得 ${provider.label} 的本次任务授权；登录、验证和安全警告仍需用户接管。`,
    });
  }

  async function open(url: string): Promise<BrowserStatus> {
    const provider = getBrowserProvider(providerId);
    if (provider.requiresAuthorization && !state.authorized) {
      throw new BrowserBackendError(
        "authorization-required",
        `打开 ${provider.label} 前需要本次任务授权。`,
      );
    }
    if (state.phase === "handoff") {
      throw new BrowserBackendError(
        "handoff-required",
        "浏览器正在等待用户安全接管；确认后才能继续。",
      );
    }
    patch({ phase: "opening", message: `正在打开 ${provider.label}…` });
    try {
      const inspection = await runtime.inspect(providerId);
      if (!inspection.available) {
        patch({
          phase: "error",
          available: false,
          message: inspection.message,
        });
        throw new BrowserBackendError(
          "provider-unavailable",
          inspection.message,
        );
      }
      const result = await runtime.open(providerId, url, state.authorized);
      patch({
        phase: "running",
        available: true,
        url: result.url,
        message:
          provider.automation === "manual-only"
            ? `${provider.label} 已打开；当前为手动浏览，自动化动作需要用户完成。`
            : result.message,
      });
      return state;
    } catch (error) {
      if (error instanceof BrowserBackendError) throw error;
      const message =
        error instanceof Error ? error.message : "浏览器启动失败。";
      patch({ phase: "error", message });
      throw error;
    }
  }

  function requestHandoff(
    kind: BrowserHandoffKind,
    reason: string,
  ): BrowserApprovalRequest {
    if (state.handoff) return state.handoff.request;
    const provider = getBrowserProvider(providerId);
    const request: BrowserApprovalRequest = {
      requestId: `browser-handoff-${++sequence}`,
      method: "browser_handoff",
      reason: `安全接管：${provider.label} 需要用户处理“${kind}”。${reason}`,
      permissions: { provider: providerId, handoffKind: kind },
    };
    handoffConfirmed = false;
    patch({
      phase: "handoff",
      message: `安全接管已暂停自动化：${reason}`,
      handoff: { request, kind, reason, confirmed: false },
    });
    return request;
  }

  function confirmHandoff(): void {
    if (!state.handoff) throw new Error("当前没有待确认的安全接管。");
    handoffConfirmed = true;
    patch({
      message: "用户已确认接管；完成页面操作后可恢复自动化。",
      handoff: { ...state.handoff, confirmed: true },
    });
  }

  function declineHandoff(): void {
    if (!state.handoff) throw new Error("当前没有待确认的安全接管。");
    handoffConfirmed = false;
    const provider = getBrowserProvider(providerId);
    patch({
      phase: "idle",
      authorized: !provider.requiresAuthorization,
      message: "用户拒绝安全接管，自动化已暂停。",
      handoff: null,
    });
  }

  function resume(): void {
    if (!state.handoff || !handoffConfirmed)
      throw new Error("安全接管尚未确认，不能恢复自动化。");
    handoffConfirmed = false;
    patch({
      phase: "ready",
      message: "安全接管完成，已恢复自动化；下一次安全事件仍会再次提示。",
      handoff: null,
    });
  }

  return {
    getState: () => state,
    select,
    authorize,
    open,
    requestHandoff,
    confirmHandoff,
    declineHandoff,
    resume,
  } satisfies BrowserBackend;
}
