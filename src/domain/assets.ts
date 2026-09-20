import { z } from "zod";

const assetSchema = z
  .object({
    id: z.string().min(1).max(100),
    name: z.string().min(1).max(120),
    type: z.enum(["image", "video", "subject"]),
    tag: z.string().max(40),
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
}
export function filterAssets(
  assets: Asset[],
  filter: AssetFilter,
  now = Date.now(),
): Asset[] {
  const query = filter.query.trim().toLocaleLowerCase();
  return assets.filter((asset) => {
    const age = now - Date.parse(asset.createdAt);
    const searchable = [
      asset.name,
      asset.tag,
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
      (filter.tag === "all" || asset.tag === filter.tag) &&
      (!filter.days || (age >= 0 && age <= filter.days * 86400000))
    );
  });
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
