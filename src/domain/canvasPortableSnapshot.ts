import { z } from "zod";
import { createProject } from "./creationModel.ts";
import { decodeSnapshot, rejectSecrets } from "./creationSnapshotCodec.ts";
import { readProjectCanvas } from "./projectCanvas.ts";
import type { CanvasCollectionItem } from "./canvasItems.ts";

const safeId = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .refine((id) => !["__proto__", "prototype", "constructor"].includes(id));

const snapshot = z
  .object({
    version: z.literal(1),
    items: z.array(z.record(z.string(), z.json())).max(500),
    positions: z.record(
      safeId,
      z
        .object({
          x: z.number().finite().min(-1e7).max(1e7),
          y: z.number().finite().min(-1e7).max(1e7),
        })
        .strict(),
    ),
    edges: z
      .array(
        z
          .object({
            id: safeId,
            source: safeId,
            target: safeId,
            kind: z.enum(["reference", "result"]).optional(),
          })
          .strict(),
      )
      .max(2000),
    groups: z.array(z.json()).max(100).default([]),
  })
  .strict();

/** Reuse the storage decoder and reject any supplied value it cannot retain. */
export function readPortableCanvas(input: unknown) {
  rejectSecrets(input);
  const data = snapshot.parse(input);
  const seed = createProject({
    prompt: "",
    kind: "text",
    model: "",
    attachments: [],
  });
  const decoded = decodeSnapshot({
    version: 2,
    revision: 0,
    activeProjectId: seed.id,
    homeDraft: {},
    projects: [
      {
        ...seed,
        items: data.items,
        canvas: {
          version: 1,
          positions: data.positions,
          edges: data.edges,
          groups: data.groups,
          viewport: { x: 0, y: 0, scale: 1 },
        },
      },
    ],
  });
  const items = decoded.projects[0].items;
  const identities = [
    ...items.map((item) => item.id),
    ...decoded.projects[0].canvas.groups!.map((group) => group.id),
    ...data.edges.map((edge) => edge.id),
  ];
  identities.forEach((id) => safeId.parse(id));
  if (new Set(identities).size !== identities.length)
    throw new Error("蓝图卡片、分组和连线 ID 重复");
  if (!retainsValues(data.items, items))
    throw new Error("蓝图包含无法无损恢复的卡片字段，原件保留");
  const canvas = readProjectCanvas(
    {
      version: 1,
      positions: data.positions,
      edges: data.edges,
      groups: data.groups,
      viewport: { x: 0, y: 0, scale: 1 },
    },
    items,
  );
  if (!retainsValues(data.groups, canvas.groups))
    throw new Error("蓝图分组不能完整恢复");
  return {
    items: structuredClone(data.items) as unknown as CanvasCollectionItem[],
    canvas,
  };
}

export function restorePortableImport(
  input: unknown,
  document: { positions: unknown; edges: unknown },
) {
  const restored = readPortableCanvas(input);
  const expected = {
    version: 1,
    cards: restored.items,
    positions: restored.canvas.positions,
    edges: restored.canvas.edges,
  };
  if (
    !retainsValues(document, expected) ||
    !retainsValues(expected.positions, document.positions) ||
    !retainsValues(expected.edges, document.edges)
  )
    throw new Error("蓝图概要与无损快照不一致，拒绝隐藏写入");
  return restored;
}

function retainsValues(original: unknown, normalized: unknown): boolean {
  if (Array.isArray(original))
    return (
      Array.isArray(normalized) &&
      original.length === normalized.length &&
      original.every((v, i) => retainsValues(v, normalized[i]))
    );
  if (original && typeof original === "object")
    return Boolean(
      normalized &&
      typeof normalized === "object" &&
      Object.entries(original).every(
        ([key, value]) =>
          Object.hasOwn(normalized, key) &&
          retainsValues(value, (normalized as Record<string, unknown>)[key]),
      ),
    );
  return Object.is(original, normalized);
}
