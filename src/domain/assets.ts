import { z } from "zod";

export const DEFAULT_ASSET_TAGS = [
  "道具",
  "音色",
  "场景",
  "服装",
  "人物",
  "最终版",
  "待定版",
] as const;
export function validateTagName(
  value: string,
  existing: readonly string[],
): { name?: string; error?: string } {
  const name = value.trim();
  if (!name) return { error: "请输入标签名称。" };
  if (name.length > 40) return { error: "标签名称不能超过 40 个字符。" };
  if (existing.includes(name)) return { error: "这个标签已存在。" };
  return { name };
}
export function normalizeTags(
  values: unknown = [],
  legacyTag?: string,
): string[] {
  const tags: unknown[] = Array.isArray(values) ? values : [];
  return Array.from(
    new Set(
      [...tags, legacyTag ?? ""]
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim().slice(0, 40))
        .filter(Boolean),
    ),
  ).slice(0, 32);
}

const assetSchema = z
  .object({
    id: z.string().min(1).max(100),
    name: z.string().min(1).max(120),
    type: z.enum(["image", "video", "audio", "text", "subject"]),
    tag: z.string().max(40),
    tags: z.array(z.string().max(40)).max(32).optional(),
    resourcePackId: z.string().min(1).max(160).optional(),
    createdAt: z.iso.datetime(),
  })
  .strict();
export type Asset = z.infer<typeof assetSchema> & {
  src?: string;
  /** Optional metadata present for generated assets and provenance views. */
  isAiGenerated?: boolean;
  provider?: string;
  model?: string;
  promptHash?: string;
  parentId?: string;
  sourceTaskId?: string;
  providerConnectionId?: string;
  /** Provider-returned provenance signals; undefined means the provider did not report them. */
  c2paPresent?: boolean;
  synthIdSignal?: boolean;
  originCount?: number;
  sha256?: string;
  source?: "upload" | "demo" | "provider";
};
export interface AssetFilter {
  query: string;
  type: string;
  tag: string;
  days: number;
  resourcePackId?: string;
  sort?: "newest" | "oldest";
  from?: string;
  to?: string;
}
export function getAssetTags(asset: Pick<Asset, "tag" | "tags">): string[] {
  return Array.from(
    new Set([asset.tag, ...(asset.tags ?? [])].filter(Boolean)),
  );
}
export function filterAssets(
  assets: Asset[],
  filter: AssetFilter,
  now = Date.now(),
): Asset[] {
  const query = filter.query.trim().toLocaleLowerCase();
  const visible = assets.filter((asset) => {
    const age = now - Date.parse(asset.createdAt);
    const tags = getAssetTags(asset);
    const searchable = [
      asset.name,
      ...tags,
      asset.provider,
      asset.model,
      asset.promptHash,
      asset.sha256,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();
    return (
      searchable.includes(query) &&
      (filter.type === "all" || asset.type === filter.type) &&
      (filter.tag === "all" || tags.includes(filter.tag)) &&
      (!filter.resourcePackId ||
        filter.resourcePackId === "all" ||
        asset.resourcePackId === filter.resourcePackId) &&
      (!filter.from ||
        Date.parse(asset.createdAt) >= Date.parse(filter.from)) &&
      (!filter.to ||
        Date.parse(asset.createdAt) < Date.parse(filter.to) + 86400000) &&
      (!filter.days ||
        filter.days < 0 ||
        (age >= 0 && age <= filter.days * 86400000))
    );
  });
  if (filter.sort)
    visible.sort((a, b) => {
      const delta = Date.parse(a.createdAt) - Date.parse(b.createdAt);
      return filter.sort === "newest" ? -delta : delta;
    });
  return visible;
}
export function parseResourcePack(raw: string): Asset[] {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("资源包无法读取，请选择有效的 KK 资源包 JSON 文件。");
  }
  const result = z
    .object({ version: z.literal(1), assets: z.array(assetSchema).max(100) })
    .strict()
    .safeParse(value);
  if (!result.success)
    throw new Error(
      "资源包格式不兼容。需要版本 1，且每项包含名称、类型、标签和创建时间。",
    );
  const pack = result.data;
  if (new Set(pack.assets.map((a) => a.id)).size !== pack.assets.length)
    throw new Error("资源包包含重复标识");
  return pack.assets;
}
export function initialAssets(): Asset[] {
  return Array.from({ length: 9 }, (_, i) => ({
    id: `canvas-${i}`,
    name:
      i === 0
        ? "静音冷风扇3.png"
        : i < 4
          ? `静音冷风扇${i === 1 ? "" : i === 3 ? "4" : i}.png`
          : `图片名字${i - 3}.png`,
    type: "image",
    tag: "产品",
    createdAt: new Date().toISOString(),
  }));
}
export function initialSubjects(): Asset[] {
  return [
    {
      id: "subject-1",
      name: "人物",
      type: "subject",
      tag: "人物",
      createdAt: new Date().toISOString(),
    },
    {
      id: "subject-2",
      name: "文件夹名字或资源包名字",
      type: "subject",
      tag: "资源包",
      createdAt: new Date().toISOString(),
    },
  ];
}
