import { z } from "zod";
import { BROWSER_STORAGE_KEYS } from "../runtime/storage-contract.ts";

export const MODEL_PROVIDER_STORAGE_KEY = BROWSER_STORAGE_KEYS.modelProvider;

export const modelProviderSchema = z.object({
  version: z.literal(1),
  name: z.string().trim().min(1, "请输入供应商名称").max(60, "供应商名称过长"),
  baseUrl: z
    .string()
    .trim()
    .url("请输入有效的 API 地址")
    .refine((value) => /^https?:\/\//i.test(value), "仅支持 HTTP 或 HTTPS 地址")
    .refine((value) => {
      try {
        const url = new URL(value);
        return !url.username && !url.password && !url.search && !url.hash;
      } catch {
        return false;
      }
    }, "请填写不含账号、密钥参数或片段的 Base URL；密钥请放入 API Key 字段"),
  model: z.string().trim().max(120, "模型名称过长"),
});

export type ModelProviderProfile = z.infer<typeof modelProviderSchema>;

export const modelListSchema = z.object({
  data: z.array(z.object({ id: z.string().min(1) })),
});

export const DEFAULT_MODEL_PROVIDER: ModelProviderProfile = {
  version: 1,
  name: "OpenAI 兼容 API",
  baseUrl: "https://api.openai.com/v1",
  model: "",
};

export function parseModelProvider(raw: string | null): {
  profile: ModelProviderProfile;
  recovered: boolean;
} {
  if (raw === null) {
    return { profile: { ...DEFAULT_MODEL_PROVIDER }, recovered: false };
  }
  try {
    const parsed = modelProviderSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return { profile: parsed.data, recovered: false };
  } catch {
    // Keep the original value so a later save can replace it deliberately.
  }
  return { profile: { ...DEFAULT_MODEL_PROVIDER }, recovered: true };
}

export function serializeModelProvider(profile: ModelProviderProfile): string {
  return JSON.stringify(modelProviderSchema.parse(profile), null, 2);
}

export function getModelsEndpoint(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.pathname = `${url.pathname.replace(/\/$/, "")}/models`;
  url.search = "";
  url.hash = "";
  return url.toString();
}
