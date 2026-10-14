import type { MutableRefObject } from "react";
import { isLocalProviderUrl } from "../../domain/providerUrl.ts";
import { checkModelProvider } from "../../integrations/modelProvider.ts";
import { loadApiKey } from "../../features/creation/providerCredentials.ts";
import { saveModelCatalog } from "../../features/models/modelCatalog.ts";
import {
  providerNeedsKey,
  protocolBindingMatches,
} from "../../domain/providerProtocol.ts";
import { readProviderConnections } from "../../features/creation/providerRegistry.ts";
import type { ModelProviderProfile } from "../../domain/modelProvider.ts";
import type { ProviderConnection } from "../../domain/providerConnections.ts";
import {
  resolveModelProviderConnection,
  type ConnectionState,
} from "./modelProviderSettingsState.ts";

function assertCatalogTargetCurrent(
  tested: ProviderConnection,
  initial: ProviderConnection | undefined,
) {
  const current = readProviderConnections().find(
    (item) => item.id === tested.id,
  );
  const expected = initial ?? tested;
  if (
    (initial && !current) ||
    (current &&
      (expected.baseUrl !== current.baseUrl ||
        expected.credentialRef !== current.credentialRef ||
        expected.healthRevision !== current.healthRevision ||
        !protocolBindingMatches(
          { ...expected, baseUrl: expected.baseUrl! },
          { ...current, baseUrl: current.baseUrl! },
        )))
  )
    throw new Error(
      "连接在检测期间已变化，未更新模型目录；请重新选择连接后检测。",
    );
}
export async function testProviderConnection({
  valid,
  apiKey,
  credentialRef,
  connections,
  requestRef,
  setConnection,
}: {
  valid: ModelProviderProfile;
  apiKey: string;
  credentialRef: string;
  connections: ProviderConnection[];
  requestRef: MutableRefObject<AbortController | null>;
  setConnection: (value: ConnectionState) => void;
}): Promise<void> {
  if (!navigator.onLine && !isLocalProviderUrl(valid.baseUrl)) {
    setConnection({
      kind: "offline",
      message: "设备处于离线状态，请联网后重试。",
    });
    return;
  }
  const controller = new AbortController();
  const tested = resolveModelProviderConnection(
    valid,
    credentialRef,
    connections,
  );
  const initial = connections.find((item) => item.id === tested.id);
  requestRef.current = controller;
  setConnection({ kind: "loading", message: "正在请求模型列表…" });
  const timeout = window.setTimeout(() => controller.abort("timeout"), 10_000);
  try {
    const key = providerNeedsKey(valid)
      ? apiKey.trim() || (await loadApiKey(valid.baseUrl, credentialRef))
      : "";
    if (requestRef.current !== controller) return;
    const models = await checkModelProvider(
      valid.baseUrl,
      key,
      controller.signal,
      { protocol: valid.protocol, authMode: valid.authMode, credentialRef },
    );
    if (requestRef.current !== controller) return;
    assertCatalogTargetCurrent(tested, initial);
    saveModelCatalog(tested, models);
    setConnection({
      kind: "success",
      message: `已获取 ${models.length} 个模型；生成能力仍需实际验证。`,
    });
  } catch (error) {
    if (requestRef.current !== controller) return;
    if (controller.signal.aborted) {
      setConnection({
        kind: "cancelled",
        message:
          controller.signal.reason === "timeout"
            ? "连接超时，已取消请求。"
            : "已取消连接测试。",
      });
    } else {
      setConnection({
        kind:
          navigator.onLine || isLocalProviderUrl(valid.baseUrl)
            ? "error"
            : "offline",
        message:
          navigator.onLine || isLocalProviderUrl(valid.baseUrl)
            ? error instanceof TypeError
              ? "无法连接，请检查地址、网络和服务的跨域访问设置。"
              : error instanceof Error
                ? error.message
                : "连接失败，请重试。"
            : "网络已断开，请恢复后重试。",
      });
    }
  } finally {
    window.clearTimeout(timeout);
    if (requestRef.current === controller) requestRef.current = null;
  }
}
