import { getModelsEndpoint, modelListSchema } from "../domain/modelProvider";
import {
  parseCatalogModels,
  type CatalogModel,
} from "../features/models/modelCatalog";

export async function checkModelProvider(
  baseUrl: string,
  apiKey: string,
  signal: AbortSignal,
): Promise<CatalogModel[]> {
  const response = await fetch(getModelsEndpoint(baseUrl), {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(apiKey.trim() ? { Authorization: `Bearer ${apiKey.trim()}` } : {}),
    },
    credentials: "omit",
    redirect: "error",
    signal,
  });
  if (!response.ok) {
    throw new Error(
      `连接失败（HTTP ${response.status}）。请检查地址、密钥和服务权限。`,
    );
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(
      "服务未返回有效的模型列表，请检查 API Base URL 是否指向模型接口。",
    );
  }
  if (!modelListSchema.safeParse(payload).success) {
    throw new Error(
      "响应不符合 OpenAI 兼容模型列表格式，请检查 API 地址和接口协议。",
    );
  }
  return parseCatalogModels(payload);
}
