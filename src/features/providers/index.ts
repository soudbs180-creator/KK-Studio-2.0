// Public contract entry for feature: providers
export { createConfigToolHost, diffConfig } from "./configAgent.ts";
export type { ConfigToolPorts, ConfigState, ConfigSnapshot } from "./configAgent.ts";
export { createBrowserConfigToolHost, requestConfigCredential, CONFIG_CREDENTIAL_EVENT, CONFIG_CHANGED_EVENT, CONFIG_SNAPSHOTS_KEY } from "./configAgentRuntime.ts";
export type { ConfigCredentialRequest } from "./configAgentRuntime.ts";
export {
  providerConfigSchema,
  exportProviderConfig,
  parseProviderConfig,
  mergeProviderConnections,
  buildSeedConnection,
  parseCcSwitchDeeplink,
  buildDeeplinkConnection,
  parseSeedProfiles,
  importSeedConnections,
} from "./providerConfigIO.ts";
export type {
  ProviderConfigFile,
  ImportMode,
  SeedProfile,
  DeeplinkImportPayload,
} from "./providerConfigIO.ts";
export {
  assertNoSecrets,
  connectionFingerprint,
  providerKey,
  envKeyFor,
  wireApiSchema,
  codexProviderBlockSchema,
  claudeEnvBlockSchema,
  openAiEnvBlockSchema,
  renderCodexTarget,
  renderClaudeTarget,
  renderOpenAiEnvTarget,
  renderAllTargets,
  serializeCodexToml,
  serializeClaudeSettings,
  serializeOpenAiEnv,
} from "./providerTargetRenderers.ts";
export type {
  WireApi,
  CodexProviderBlock,
  ClaudeEnvBlock,
  OpenAiEnvBlock,
  TargetRender,
} from "./providerTargetRenderers.ts";
