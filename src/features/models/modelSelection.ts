import type { ModelSelection } from "../../domain/modelSelection.ts";
export type { ModelSelection } from "../../domain/modelSelection.ts";
export function modelSelectionId(selection: ModelSelection): string {
  return JSON.stringify([
    selection.source,
    selection.connectionId ?? "",
    selection.model,
  ]);
}
export interface PickerMemory {
  page: string;
  all: boolean;
  pins: Record<string, string[]>;
}
export function readPickerMemory(scope: string): PickerMemory {
  try {
    const data = JSON.parse(
      localStorage.getItem("kk:model-picker:" + scope) ?? "{}",
    );
    return {
      page: typeof data.page === "string" ? data.page : "root",
      all: data.all === true,
      pins: data.pins && typeof data.pins === "object" ? data.pins : {},
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
