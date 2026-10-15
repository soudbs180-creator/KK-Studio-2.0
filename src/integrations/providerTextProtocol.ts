import {
  buildTextRequestParts,
  providerHeaders,
  type ProviderProtocolOptions,
  type ProviderProtocol,
  type ProviderTextMessage,
} from "../domain/providerProtocol.ts";
export type { ProviderTextMessage } from "../domain/providerProtocol.ts";
export function providerRequestHeaders(
  baseUrl: string,
  apiKey: string,
  options: Omit<ProviderProtocolOptions, "baseUrl"> = {},
) {
  return providerHeaders({ baseUrl, ...options }, apiKey);
}
export function buildProviderTextRequest(input: {
  baseUrl: string;
  model: string;
  prompt: string;
  messages?: readonly ProviderTextMessage[];
  protocol?: ProviderProtocol;
}) {
  const request = buildTextRequestParts(input);
  return { url: new URL(request.url), body: request.body };
}
