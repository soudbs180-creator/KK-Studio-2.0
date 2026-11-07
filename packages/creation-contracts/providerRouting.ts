export const PROVIDER_PROTOCOLS = [
  "openai-chat",
  "openai-responses",
  "anthropic",
  "azure-openai",
  "ollama",
] as const;
export const PROVIDER_AUTH_MODES = ["api-key", "none"] as const;
export type ProviderProtocol = (typeof PROVIDER_PROTOCOLS)[number];
export type ProviderAuthMode = (typeof PROVIDER_AUTH_MODES)[number];
