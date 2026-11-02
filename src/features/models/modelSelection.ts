import type { ModelSelection } from "../../domain/modelSelection.ts";
import {
  modelChannels,
  type PickerChannel,
} from "../../domain/modelChannels.ts";
import type { ModelKind } from "../../domain/modelSelection.ts";
export type { ModelSelection } from "../../domain/modelSelection.ts";
export function modelSelectionId(selection: ModelSelection): string {
  return JSON.stringify([
    selection.source,
    selection.connectionId ?? "",
    selection.model,
  ]);
}
export interface PickerMemory {
  capability?: "chat" | "image";
  page: string;
  all: boolean;
  pins: Record<string, string[]>;
  channel?: PickerChannel;
  filter?: ModelKind | "all";
}
export function readPickerMemory(scope: string): PickerMemory {
  try {
    const own = localStorage.getItem("kk:model-picker:" + scope);
    const data = JSON.parse(
      own ??
        (scope === "home"
          ? localStorage.getItem("kk:model-picker:canvas-image")
          : null) ??
        "{}",
    );
    return {
      ...(data.capability === "chat" || data.capability === "image"
        ? { capability: data.capability }
        : {}),
      page: typeof data.page === "string" ? data.page : "root",
      all: data.all === true,
      pins: data.pins && typeof data.pins === "object" ? data.pins : {},
      ...(modelChannels.some((channel) => channel.id === data.channel)
        ? { channel: data.channel as PickerChannel }
        : {}),
      ...(["all", "text", "image", "video", "audio", "unknown"].includes(
        data.filter,
      )
        ? { filter: data.filter as ModelKind | "all" }
        : {}),
    };
  } catch {
    return { page: "root", all: false, pins: {} };
  }
}
export function writePickerMemory(scope: string, state: PickerMemory): void {
  try {
    localStorage.setItem("kk:model-picker:" + scope, JSON.stringify(state));
  } catch {
    /* Selection still works when persistence is unavailable. */
  }
}

/** Older family pins expand to exact rows without changing model routing. */
export function resolvePickerPins(
  entries: readonly {
    id: string;
    legacyPinId?: string;
    selection?: ModelSelection;
  }[],
  pins: readonly string[],
): string[] {
  const expanded = entries
    .map((item) => ({
      item,
      aliases: [
        item.legacyPinId,
        item.selection?.source === "api"
          ? `api:${item.selection.connectionId}:${item.selection.model}`
          : undefined,
      ],
    }))
    .filter(({ aliases }) => aliases.some((id) => id && pins.includes(id)));
  return [
    ...new Set([
      ...pins.filter(
        (id) => !expanded.some(({ aliases }) => aliases.includes(id)),
      ),
      ...expanded.map(({ item }) => item.id),
    ]),
  ];
}
