/** Non-secret, account-scoped discovery. A model list is not generation verification. */
import type { ModelKind } from "../../domain/modelSelection.ts";
export type { ModelKind } from "../../domain/modelSelection.ts";
export interface CatalogModel {
  id: string;
  kind: ModelKind;
  sizes?: string[];
  source?: "reported" | "manual";
  /** Display grouping is never a substitute for the exact provider route ID. */
  family?: string;
  variant?: string;
  aliases?: string[];
}
export interface ModelCatalog {
  id: string;
  baseUrl?: string;
  credentialRef?: string;
  fetchedAt: number;
  models: CatalogModel[];
}
type Connection = {
  id: string;
  baseUrl?: string;
  credentialRef?: string;
  model?: string;
  capabilities?: { modalities: string[] };
};
const KEY = "kk-studio:model-catalog:v1";
const sizePattern = /^(?:[1-9]\d{1,4})x(?:[1-9]\d{1,4})$/;
const kinds = ["text", "image", "video", "audio"];
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};
function displayMetadata(value: Record<string, unknown>) {
  const text = (key: string) =>
    typeof value[key] === "string"
      ? value[key].trim().slice(0, 120) || undefined
      : undefined;
  return {
    family: text("family"),
    variant: text("variant"),
    aliases: Array.isArray(value.aliases)
      ? value.aliases
          .filter((v): v is string => typeof v === "string")
          .slice(0, 20)
          .map((v) => v.slice(0, 120))
      : undefined,
  };
}
export function parseCatalogModels(value: unknown): CatalogModel[] {
  const data = record(value).data;
  if (!Array.isArray(data))
    throw new Error(
      "响应不符合 OpenAI 兼容模型列表格式，请检查 API 地址和接口协议。",
    );
  const seen = new Set<string>();
  return data.slice(0, 5000).flatMap((entry) => {
    const model = record(entry),
      cap = record(model.capabilities);
    if (
      typeof model.id !== "string" ||
      !model.id.trim() ||
      model.id.length > 120 ||
      seen.has(model.id)
    )
      return [];
    seen.add(model.id);
    const reported = Array.isArray(cap.modalities)
      ? cap.modalities.find((kind) => kinds.includes(String(kind)))
      : undefined;
    const kind = reported ? (reported as ModelKind) : "unknown";
    const sizes = Array.isArray(cap.sizes)
      ? [
          ...new Set(
            cap.sizes.filter(
              (size): size is string =>
                typeof size === "string" && sizePattern.test(size),
            ),
          ),
        ].slice(0, 100)
      : undefined;
    return [
      {
        id: model.id,
        kind,
        sizes,
        source: "reported" as const,
        ...displayMetadata(record(model.display)),
      },
    ];
  });
}
export function readModelCatalogs(): ModelCatalog[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 200).flatMap((value) => {
      const item = record(value);
      if (typeof item.id !== "string" || !Array.isArray(item.models)) return [];
      const models = item.models.flatMap((value) => {
        const model = record(value);
        if (typeof model.id !== "string" || model.id.length > 120) return [];
        return [
          {
            id: model.id,
            ...displayMetadata(model),
            kind: kinds.includes(String(model.kind))
              ? (model.kind as ModelKind)
              : "unknown",
            sizes: Array.isArray(model.sizes)
              ? model.sizes
                  .filter(
                    (size): size is string =>
                      typeof size === "string" && sizePattern.test(size),
                  )
                  .slice(0, 100)
              : undefined,
            source:
              model.source === "manual"
                ? ("manual" as const)
                : ("reported" as const),
          },
        ];
      });
      return [
        {
          id: item.id,
          baseUrl: typeof item.baseUrl === "string" ? item.baseUrl : undefined,
          credentialRef:
            typeof item.credentialRef === "string"
              ? item.credentialRef
              : undefined,
          fetchedAt: typeof item.fetchedAt === "number" ? item.fetchedAt : 0,
          models,
        },
      ];
    });
  } catch {
    return [];
  }
}
function matches(connection: Connection, catalog: ModelCatalog) {
  return (
    connection.id === catalog.id &&
    connection.baseUrl === catalog.baseUrl &&
    connection.credentialRef === catalog.credentialRef
  );
}
export function catalogForConnection(
  connection: Connection,
  catalogs = readModelCatalogs(),
): CatalogModel[] {
  const catalog = catalogs.find((item) => matches(connection, item));
  const models = (catalog?.models ?? []).map((model) =>
    model.id === connection.model &&
    model.kind === "unknown" &&
    connection.capabilities?.modalities[0]
      ? { ...model, kind: connection.capabilities.modalities[0] as ModelKind }
      : model,
  );
  if (connection.model && !models.some((item) => item.id === connection.model))
    models.unshift({
      id: connection.model,
      kind: (connection.capabilities?.modalities[0] as ModelKind) ?? "unknown",
    });
  return models;
}
export function saveModelCatalog(
  connection: Connection,
  models: CatalogModel[],
  manual = false,
): void {
  const current = readModelCatalogs();
  const previous = current.find((item) => matches(connection, item));
  const next = manual
    ? models
    : models.map(
        (model) =>
          previous?.models.find(
            (old) => old.id === model.id && old.source === "manual",
          ) ?? model,
      );
  localStorage.setItem(
    KEY,
    JSON.stringify([
      ...current.filter((item) => item.id !== connection.id),
      {
        id: connection.id,
        baseUrl: connection.baseUrl,
        credentialRef: connection.credentialRef,
        fetchedAt: Date.now(),
        models: next,
      },
    ]),
  );
  window.dispatchEvent(new Event("kk:model-provider-changed"));
}
export function imageSizeOptions(
  model?: CatalogModel,
): Array<{ size: string; ratio: string }> {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  return (model?.sizes ?? []).map((size) => {
    const [w, h] = size.split("x").map(Number);
    const factor = gcd(w, h);
    return { size, ratio: `${w / factor}:${h / factor}` };
  });
}
