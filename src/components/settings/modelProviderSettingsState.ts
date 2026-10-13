import {
  DEFAULT_MODEL_PROVIDER,
  MODEL_PROVIDER_STORAGE_KEY,
  parseModelProvider,
  type ModelProviderProfile,
} from "../../domain/modelProvider";

export type ConnectionState =
  | { kind: "idle"; message: string }
  | { kind: "loading"; message: string }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | { kind: "cancelled"; message: string }
  | { kind: "offline"; message: string };

export function readModelProviderProfile(): ModelProviderProfile {
  try {
    return parseModelProvider(
      window.localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY),
    ).profile;
  } catch {
    return { ...DEFAULT_MODEL_PROVIDER };
  }
}
