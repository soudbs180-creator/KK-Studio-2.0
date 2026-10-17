import type { ProviderConnection } from "../../domain/providerConnections.ts";
import { GeminiApiAdapter } from "./geminiApiAdapter.ts";
import { LocalComfyUiAdapter } from "./localComfyUiAdapter.ts";
import { OpenAiImageAdapter } from "./openAiImageAdapter.ts";
import {
  TwelveAiTaskAdapter,
  type TwelveAiSubmissionPersistence,
  type TwelveAiSubmissionReceipt,
  type TwelveAiTaskAdapterOptions,
} from "./twelveAiTaskAdapter.ts";
import { twelveAiApiBase } from "./twelveAiTaskProtocol.ts";
import type { GenerationProviderAdapter } from "./providerAdapter.ts";

/**
 * In-memory persistence journal for 12AI submission receipts per connection.
 * Guarantees atomic insertion and durable receipt recall across submit calls.
 */
const defaultTwelveAiReceiptStores = new Map<
  string,
  Map<string, TwelveAiSubmissionReceipt>
>();

export function createDefaultTwelveAiPersistence(
  connectionId: string,
): TwelveAiSubmissionPersistence {
  let store = defaultTwelveAiReceiptStores.get(connectionId);
  if (!store) {
    store = new Map<string, TwelveAiSubmissionReceipt>();
    defaultTwelveAiReceiptStores.set(connectionId, store);
  }
  return {
    connectionId,
    async claimSubmission(receipt: TwelveAiSubmissionReceipt) {
      const existing = store.get(receipt.idempotencyKey);
      if (existing) {
        return { created: false, receipt: { ...existing } };
      }
      store.set(receipt.idempotencyKey, { ...receipt });
      return { created: true };
    },
    async persistSubmissionReceipt(receipt: TwelveAiSubmissionReceipt) {
      store.set(receipt.idempotencyKey, { ...receipt });
    },
  };
}

/**
 * Keeps provider selection out of canvas components. Unknown or experimental
 * connections stay disabled until a reviewed adapter is added.
 */
export function createGenerationAdapter(
  connection: ProviderConnection,
  options?: TwelveAiTaskAdapterOptions,
): GenerationProviderAdapter | null {
  if (connection.state === "disabled" || connection.state === "quarantined")
    return null;
  if (connection.kind === "local_comfyui")
    return new LocalComfyUiAdapter(connection);
  if (twelveAiApiBase(connection.baseUrl)) {
    try {
      const submissionPersistence =
        options?.submissionPersistence ??
        createDefaultTwelveAiPersistence(connection.id);
      return new TwelveAiTaskAdapter(connection, {
        ...options,
        submissionPersistence,
      });
    } catch {
      return null;
    }
  }
  const provider =
    `${connection.provider} ${connection.baseUrl ?? ""}`.toLowerCase();
  if (provider.includes("gemini") || provider.includes("generativelanguage"))
    return new GeminiApiAdapter(connection);
  if (connection.capabilities.modalities.includes("image"))
    return new OpenAiImageAdapter(connection);
  return null;
}
