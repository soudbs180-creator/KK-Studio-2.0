import { z } from "zod";

export const ContinuityConstraintSchema = z.object({
  characterName: z.string().trim().min(1).max(160),
  kind: z.enum(["character", "costume", "scene", "prop"]).default("character"),
  requiredAttributes: z.array(z.string().trim().min(1).max(500)).max(32),
});
export type ContinuityConstraint = z.input<typeof ContinuityConstraintSchema>;
export const StoryboardShotSchema = z
  .object({
    id: z.string().min(1).max(160),
    scene: z.string().trim().min(1).max(500),
    description: z.string().trim().min(1).max(4000),
    dialogue: z.string().max(4000),
    durationSeconds: z.number().finite().positive().max(60),
    shotSize: z.string().min(1).max(120),
    cameraMovement: z.string().min(1).max(120),
    characters: z.array(z.string().min(1).max(160)).max(32),
    props: z.array(z.string().min(1).max(160)).max(32),
    assetIds: z.array(z.string().min(1).max(160)).max(32),
  })
  .strict();
export const StoryboardSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    shots: z.array(StoryboardShotSchema).min(1).max(128),
  })
  .strict()
  .refine(
    (s) => new Set(s.shots.map((shot) => shot.id)).size === s.shots.length,
    "分镜 ID 重复",
  );
export type Storyboard = z.infer<typeof StoryboardSchema>;

export function auditStoryboardContinuity(
  description: string,
  constraints: readonly ContinuityConstraint[],
) {
  const violations: string[] = [];
  for (const raw of constraints) {
    const c = ContinuityConstraintSchema.parse(raw);
    if (description.includes(c.characterName))
      for (const attribute of c.requiredAttributes)
        if (!description.includes(attribute))
          violations.push(
            `${c.kind} ${c.characterName} missing required continuity attribute: ${attribute}`,
          );
  }
  return { compliant: !violations.length, violations };
}

/** Toonflow's script → shot table → review contract; never invent available asset IDs. */
export function validateStoryboard(
  input: unknown,
  constraints: readonly ContinuityConstraint[],
  availableAssetIds: readonly string[],
) {
  const storyboard = StoryboardSchema.parse(input);
  const violations = storyboard.shots.flatMap((shot) => {
    const report = auditStoryboardContinuity(
      [shot.scene, shot.description, ...shot.characters, ...shot.props].join(
        "\n",
      ),
      constraints,
    );
    return [
      ...report.violations,
      ...shot.assetIds
        .filter((id) => !availableAssetIds.includes(id))
        .map((id) => `未知资产 ${id}`),
    ].map((issue) => `${shot.id}: ${issue}`);
  });
  return { storyboard, compliant: !violations.length, violations };
}

export { extractContinuityBible } from "./storyboardBible.ts";
