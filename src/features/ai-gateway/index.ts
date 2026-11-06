// Public contract entry for feature: ai-gateway
export { CircuitBreaker, AccountPool } from "./accountPool.ts";
export type {
  AccountPoolEntry,
  CircuitBreakerState,
  CircuitBreakerOptions,
  AccountPoolOptions,
} from "./accountPool.ts";
export {
  chatRequestSchema,
  toOpenAiError,
  buildPrompt,
  buildInput,
  parseChatRequest,
  newCompletionId,
  runChatCompletion,
  extractNormalized,
  noChannelAvailable,
} from "./chat.ts";
export type { ChatRequest, ChatDeps } from "./chat.ts";
export {
  looksLikeSecret,
  assertCredentialRef,
  MemoryCredentialStore,
  ProtectedCredentialStore,
  LayeredCredentialStore,
} from "./credentials.ts";
export type {
  CredentialStore,
  SecretProtector,
  CiphertextStoragePort,
} from "./credentials.ts";
export {
  assertDpapiScope,
  createDpapiSecretProtector,
  createWindowsDpapiPort,
  windowsDpapiArgs,
  WINDOWS_DPAPI_COMMAND,
  WINDOWS_DPAPI_SCRIPT,
} from "./dpapiProtector.ts";
export type {
  DpapiBlobPort,
  DpapiProcessResult,
  DpapiProcessRunner,
  DpapiScope,
} from "./dpapiProtector.ts";
export {
  errorClassSchema,
  errorClasses,
  normalizedErrorSchema,
  gatewayAuthFailed,
  normalizeHttpFailure,
  normalizeTransportFailure,
} from "./errors.ts";
export type { ErrorClass, NormalizedError } from "./errors.ts";
export { ChannelHealthTracker, channelError, Scheduler } from "./scheduler.ts";
export { GatewayCooldownScheduler } from "./cooldownQueue.ts";
export { resetGatewayAffinity } from "./affinityReset.ts";
export {
  rankAccounts,
  routeIntent,
  orderByRouting,
  isRoutingMode,
} from "../../domain/routingGroups.ts";
export type {
  RoutingMode,
  RoutedAccount,
  RoutingRequest,
} from "../../domain/routingGroups.ts";
export { PrivacyMask } from "../../domain/privacyMask.ts";
export { toWireBody, fromWireEvent } from "../../domain/gatewayTranslate.ts";
export type {
  GatewayProtocol,
  CanonicalRequest,
  CanonicalDelta,
} from "../../domain/gatewayTranslate.ts";
export type {
  DispatchRequest,
  DispatchOutcome,
  SchedulerOptions,
} from "./scheduler.ts";

export { ChannelRegistry } from "./channels/registry.ts";

export { supportsOperation } from "./channels/registry.ts";

export type { ChannelIndexEntry } from "./channels/registry.ts";

export {
  bumpGatewayCursor,
  readGatewayPreferences,
  writeGatewayPreferences,
} from "./gatewayPreferences.ts";
export type { GatewayPreferences } from "./gatewayPreferences.ts";
export {
  accountsFromConnections,
  rankedConnectionIds,
  textRoutePlan,
} from "./liveAccounts.ts";
export type { TextRouteTarget } from "./liveAccounts.ts";
