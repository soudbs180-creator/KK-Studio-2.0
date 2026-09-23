import { credentialId, loadApiKey } from "../creation/providerCredentials.ts";
import { readProviderConnections } from "../creation/providerRegistry.ts";
import { GOOGLE_API_BASE } from "./googleInteractions.ts";
export const GOOGLE_CONNECTION_ID = "google-interactions";
export const GOOGLE_CREDENTIAL_REF = credentialId(
  GOOGLE_API_BASE,
  GOOGLE_CONNECTION_ID,
);
export async function getGoogleCredential() {
  const connection = readProviderConnections().find(
    (item) => item.id === GOOGLE_CONNECTION_ID,
  );
  if (
    !connection ||
    connection.state === "disabled" ||
    connection.baseUrl !== GOOGLE_API_BASE ||
    connection.credentialRef !== GOOGLE_CREDENTIAL_REF
  )
    throw new Error("请先在设置 → 模型供应商中保存 Google API Key。");
  const apiKey = await loadApiKey(GOOGLE_API_BASE, GOOGLE_CREDENTIAL_REF);
  if (!apiKey)
    throw new Error(
      "请在模型供应商设置中填写 Google API Key；网页版刷新后需要重新填写。",
    );
  return {
    apiKey,
    identity: `${GOOGLE_CONNECTION_ID}:${connection.healthRevision ?? 0}`,
  };
}
