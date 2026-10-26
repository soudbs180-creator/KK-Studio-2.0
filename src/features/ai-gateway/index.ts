// Public contract entry for feature: ai-gateway
export { CircuitBreaker, AccountPool } from "./accountPool.ts";
export type { AccountPoolEntry, CircuitBreakerState, CircuitBreakerOptions, AccountPoolOptions } from "./accountPool.ts";
export { chatRequestSchema, toOpenAiError, buildPrompt, buildInput, parseChatRequest, newCompletionId, runChatCompletion, extractNormalized, noChannelAvailable } from "./chat.ts";
export type { ChatRequest, ChatDeps } from "./chat.ts";
export { looksLikeSecret, assertCredentialRef, MemoryCredentialStore, ProtectedCredentialStore, LayeredCredentialStore } from "./credentials.ts";
export type { CredentialStore, SecretProtector, CiphertextStoragePort } from "./credentials.ts";
export { errorClassSchema, errorClasses, normalizedErrorSchema, gatewayAuthFailed, normalizeHttpFailure, normalizeTransportFailure } from "./errors.ts";
export type { ErrorClass, NormalizedError } from "./errors.ts";
export { ChannelHealthTracker, channelError, Scheduler } from "./scheduler.ts";
export type { DispatchRequest, DispatchOutcome, SchedulerOptions } from "./scheduler.ts";
