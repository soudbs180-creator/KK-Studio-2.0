import {
  StoryboardSchema,
  validateStoryboard,
  type ContinuityConstraint,
  type Storyboard,
} from "../../domain/storyboardPipeline.ts";
import {
  readStoryboardJson,
  type StoryboardTextTask,
} from "../../domain/storyboardBible.ts";
export { extractContinuityBible } from "../../domain/storyboardBible.ts";

export interface StoryboardReviewOptions {
  script: string;
  constraints: readonly ContinuityConstraint[];
  assets: ReadonlyArray<{ id: string; name: string }>;
  signal: AbortSignal;
  generate: StoryboardTextTask;
}
export function reviewStoryboard(
  storyboard: Storyboard,
  options: Pick<StoryboardReviewOptions, "script" | "constraints" | "assets">,
) {
  const report = validateStoryboard(
    storyboard,
    options.constraints,
    options.assets.map((a) => a.id),
  );
  const script = options.script.replace(/\s/g, "");
  for (const shot of storyboard.shots) {
    if (shot.durationSeconds > 15)
      report.violations.push(`${shot.id}: 镜头超过15秒，请拆分`);
    if (shot.dialogue.length / 4 + 1 > shot.durationSeconds)
      report.violations.push(`${shot.id}: 台词时长不足`);
    if (shot.dialogue && !script.includes(shot.dialogue.replace(/\s/g, "")))
      report.violations.push(`${shot.id}: 台词未逐字来自原文`);
  }
  return { ...report, compliant: !report.violations.length };
}

/** Repair one shot per task so every production text request remains within 4000 characters. */
export async function repairStoryboardShots(
  storyboard: Storyboard,
  ids: readonly string[],
  options: StoryboardReviewOptions,
) {
  const selected = new Set(ids);
  if (
    selected.size !== ids.length ||
    ids.some((id) => !storyboard.shots.some((s) => s.id === id))
  )
    throw new Error("重修镜号无效");
  const shots = [...storyboard.shots];
  const report = reviewStoryboard(storyboard, options);
  for (const id of ids) {
    options.signal.throwIfAborted();
    const index = shots.findIndex((s) => s.id === id);
    const prompt = [
      "仅重修此镜，保持 id、scene、dialogue、characters、props 和原事件不变，不修改其他镜头；只修视觉描述、景别、运镜、时长和合法资产引用。只返回 {title,shots:[修正镜头]} JSON。",
      `违规原因：${JSON.stringify(report.violations.filter((v) => v.startsWith(`${id}: `)))}`,
      `镜头：${JSON.stringify(shots[index])}`,
      `设定表：${JSON.stringify(options.constraints)}`,
      `可用资产：${JSON.stringify(options.assets)}`,
    ].join("\n");
    if (prompt.length > 3500)
      throw new Error(
        `镜头 ${id} 重修上下文超过4000字，请缩减原文或设定后重试`,
      );
    const repaired = StoryboardSchema.parse(
      readStoryboardJson(
        await options.generate(
          prompt +
            "\n原文摘录：" +
            repairSourceExcerpt(
              options.script,
              shots[index].dialogue,
              3980 - prompt.length,
            ),
          options.signal,
        ),
      ),
    );
    options.signal.throwIfAborted();
    if (repaired.shots.length !== 1 || repaired.shots[0].id !== id)
      throw new Error("模型改变了重修镜号或镜头数量，已有分镜保留");
    const original = shots[index],
      replacement = repaired.shots[0];
    if (
      ["scene", "dialogue", "characters", "props"].some(
        (key) =>
          JSON.stringify(original[key as keyof typeof original]) !==
          JSON.stringify(replacement[key as keyof typeof replacement]),
      )
    )
      throw new Error(
        "重修不得删除或改变原镜场景、台词、角色与道具，已有分镜保留",
      );
    shots[index] = repaired.shots[0];
  }
  return reviewStoryboard({ ...storyboard, shots }, options);
}

export async function autoRepairStoryboard(
  storyboard: Storyboard,
  options: StoryboardReviewOptions,
) {
  let report = reviewStoryboard(storyboard, options);
  for (let round = 0; !report.compliant && round < 2; round++) {
    const ids = report.storyboard.shots
      .filter((s) => report.violations.some((v) => v.startsWith(`${s.id}: `)))
      .map((s) => s.id);
    report = await repairStoryboardShots(report.storyboard, ids, options);
  }
  return report;
}

function repairSourceExcerpt(
  script: string,
  dialogue: string,
  capacity: number,
) {
  const at = dialogue ? Math.max(0, script.indexOf(dialogue)) : 0;
  const start = Math.max(0, at - Math.floor(capacity / 3));
  return script.slice(start, start + capacity);
}
