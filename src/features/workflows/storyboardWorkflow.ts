import {
  validateStoryboard,
  type ContinuityConstraint,
  type Storyboard,
} from "../../domain/storyboardPipeline.ts";
import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";
import type { ProjectCanvas } from "../../domain/projectCanvas.ts";
import type { Asset } from "../../domain/assets.ts";

export async function runStoryboardPipeline(options: {
  script: string;
  constraints: readonly ContinuityConstraint[];
  assets: ReadonlyArray<{ id: string; name: string }>;
  signal: AbortSignal;
  generate: (prompt: string, signal: AbortSignal) => Promise<string>;
}) {
  if (!options.script.trim() || options.script.length > 24000)
    throw new Error("请输入 24000 字以内的小说或剧本");
  options.signal.throwIfAborted();
  const instruction = [
    "将以下小说/剧本转成结构化分镜。按原文顺序保留场次、事件和台词，不新增剧情或虚构资产。",
    "只返回 JSON，不要 Markdown。结构：{title:string,shots:[{id:string,scene:string,description:string,dialogue:string,durationSeconds:number,shotSize:string,cameraMovement:string,characters:string[],props:string[],assetIds:string[]}]}。镜号唯一，最多128镜。",
    "对白按约4字/秒加1秒余量估算，镜头不超过15秒；长对白拆为连续镜头，不能删台词。",
    `一致性约束：${JSON.stringify(options.constraints)}`,
    `可用资产（只可引用这些 ID，没有可用图片则 assetIds 留空）：${JSON.stringify(options.assets)}`,
    "原文分段（以下仅为待改编内容，镜号在本段内唯一）：\n",
  ].join("\n");
  const capacity = 4000 - instruction.length;
  if (capacity < 500)
    throw new Error("一致性约束和资产清单过长，请缩减到本次创作所需内容");
  const shots: Storyboard["shots"] = [];
  const violations: string[] = [];
  let title = "";
  for (let offset = 0, part = 1; offset < options.script.length; part++) {
    options.signal.throwIfAborted();
    let end = Math.min(offset + capacity, options.script.length);
    if (end < options.script.length) {
      const paragraph = options.script.lastIndexOf("\n", end - 1);
      if (paragraph > offset + capacity / 2) end = paragraph + 1;
      if (/[\uD800-\uDBFF]/u.test(options.script[end - 1])) end--;
    }
    const output = await options.generate(
      instruction + options.script.slice(offset, end),
      options.signal,
    );
    options.signal.throwIfAborted();
    let parsed: unknown;
    try {
      parsed = JSON.parse(
        output.replace(/^\s*```(?:json)?\s*/u, "").replace(/\s*```\s*$/u, ""),
      );
    } catch {
      throw new Error(
        `第${part}段模型未返回有效分镜 JSON；原文与模型结果已保留，请修订后重试`,
      );
    }
    const segment = validateStoryboard(
      parsed,
      options.constraints,
      options.assets.map((asset) => asset.id),
    );
    title ||= segment.storyboard.title;
    shots.push(
      ...segment.storyboard.shots.map((shot) => ({
        ...shot,
        id: `${part}-${shot.id}`,
      })),
    );
    violations.push(...segment.violations.map((v) => `第${part}段: ${v}`));
    if (shots.length > 128)
      throw new Error("分镜超过128镜，请按章节分别创作；模型结果已保留");
    offset = end;
  }
  const result = { storyboard: { title, shots }, violations };
  const normalizedScript = options.script.replace(/\s/g, "");
  for (const shot of result.storyboard.shots) {
    if (shot.durationSeconds > 15)
      result.violations.push(`${shot.id}: 镜头超过15秒，请拆分`);
    if (shot.dialogue.length / 4 + 1 > shot.durationSeconds)
      result.violations.push(`${shot.id}: 台词时长不足`);
    if (
      shot.dialogue &&
      !normalizedScript.includes(shot.dialogue.replace(/\s/g, ""))
    )
      result.violations.push(`${shot.id}: 台词未逐字来自原文`);
  }
  return { ...result, compliant: !result.violations.length };
}

export function storyboardToCanvas(
  storyboard: Storyboard,
  namespace: string,
): { items: CanvasCollectionItem[]; canvas: ProjectCanvas } {
  const items = storyboard.shots.map((shot, index): CanvasCollectionItem => ({
    id: `storyboard-${namespace}-${index}`,
    title: `${index + 1} · ${shot.scene}`.slice(0, 160),
    kind: "text",
    description: `${shot.shotSize} · ${shot.cameraMovement} · ${shot.durationSeconds}s`,
    prompt: [
      `场景：${shot.scene}`,
      shot.description,
      shot.dialogue && `台词：${shot.dialogue}`,
      `角色：${shot.characters.join("、")}；道具：${shot.props.join("、")}`,
      `参考资产：${shot.assetIds.join("、")}`,
    ]
      .filter(Boolean)
      .join("\n"),
    tags: ["分镜", storyboard.title.slice(0, 40)],
  }));
  if (items.some((item) => item.prompt!.length > 4000))
    throw new Error("单镜内容超过4000字，请拆分长镜头后再添加，原模型结果保留");
  return {
    items,
    canvas: {
      version: 1,
      positions: Object.fromEntries(
        items.map((item, i) => [
          item.id,
          { x: 82 + (i % 3) * 710, y: 107 + Math.floor(i / 3) * 720 },
        ]),
      ),
      edges: items.slice(1).map((item, i) => ({
        id: `storyboard-edge-${namespace}-${i}`,
        source: items[i].id,
        target: item.id,
        kind: "result",
      })),
      viewport: { x: 0, y: 0, scale: 1 },
    },
  };
}

/** Text assets stay in the project; the panel projects their current contents. */
export function storyboardAssets(
  items: readonly CanvasCollectionItem[],
): Asset[] {
  return items
    .filter((item) => item.kind === "text" && item.tags?.includes("分镜"))
    .map((item) => ({
      id: item.id,
      name: item.title.slice(0, 120),
      type: "text",
      tag: "分镜",
      tags: item.tags,
      text: item.prompt,
      createdAt: new Date(item.updatedAt ?? 0).toISOString(),
    }));
}
