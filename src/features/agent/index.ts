// Public contract entry for feature: agent
export {
  AgentApiError,
  AgentHistoryError,
  agentEndpoint,
  createAgentApi,
} from "./agentApi.ts";
export type { AgentApiClientOptions, AgentApi } from "./agentApi.ts";
export {
  MAX_AGENT_ATTACHMENTS,
  MAX_AGENT_IMAGE_BYTES,
  MAX_AGENT_ATTACHMENT_PAYLOAD,
  prepareAgentAttachments,
} from "./agentAttachments.ts";
export type {
  AgentDraftAttachment,
  AgentImageAttachment,
} from "./agentAttachments.ts";
export {
  agentNodeTypeToKind,
  itemKindToAgentNodeType,
  resolveNodePosition,
  resolveNodeSize,
  buildAgentSnapshot,
  applyAgentOpsToItems,
  summarizeAgentOps,
  CanvasDeliveryContractError,
  assertCanvasDelivery,
  assertCanvasDeliveries,
  collectRecentOutputs,
  summarizeRecentOutputs,
} from "./agentCanvas.ts";
export type { AgentOpTranslation } from "./agentCanvas.ts";
export type { AgentCanvasView } from "./agentCanvasView.ts";
export {
  safeStorage,
  subscribeAgentPreferences,
  readPermissionMode,
  writePermissionMode,
  readAgentModel,
  writeAgentModel,
  readAgentEffort,
  writeAgentEffort,
  createAgentConnection,
  agentConnection,
} from "./agentConnection.ts";
export type {
  EventSourceLike,
  AgentActionState,
  TurnFreezingController,
  AgentOpResult,
  AgentBridge,
  AgentConnectionStatus,
  AgentConnectionState,
  AgentConnectionOptions,
  AgentStorage,
  AgentConnection,
} from "./agentConnection.ts";
export {
  AGENT_DRAFT_APPEND_EVENT,
  appendToActiveAgentDraft,
} from "./agentDraftActions.ts";
export type {
  AgentDraftAppendResult,
  AgentDraftAppendRequest,
} from "./agentDraftActions.ts";
export { createAgentEventStream } from "./agentEventStream.ts";
export {
  isActivityItemType,
  parseAgentSseEvent,
  parseAgentSsePayload,
  mergeAgentChatItem,
  isAgentActivitySettled,
  agentActivityState,
  agentActivityMessage,
  formatAgentActivity,
} from "./agentEvents.ts";
export type { AgentSseEvent, AgentPendingApproval } from "./agentEvents.ts";
export { createAgentHost } from "./agentHost.ts";
export type { AgentHostOptions } from "./agentHost.ts";
export {
  canvasGenerationMetadata,
  generatedImageSource,
  generatedImageItems,
  reportedImageModel,
  generatedImageModel,
  generatedImageId,
} from "./agentImages.ts";
export { resolveCodexModel } from "./agentModelSelection.ts";
export { createTurnFreezingController } from "./agentTurnFreezing.ts";
export type {
  TurnFreezingSnapshot,
  TurnFreezingOptions,
} from "./agentTurnFreezing.ts";
export {
  AGENT_PROTOCOL_VERSION,
  AGENT_DEFAULT_URL,
  AGENT_CONNECT_TIMEOUT_MS,
} from "./agentTypes.ts";
export type {
  CanvasNodeData,
  CanvasConnectionData,
  CanvasViewportData,
  CanvasAgentOp,
  CanvasAgentSnapshot,
  ChatScope,
  AgentExecutionScope,
  AgentPermissionMode,
  AgentReasoningEffort,
  AgentApprovalDecision,
  AgentApprovalRequest,
  AgentChatRole,
  AgentCanvasReference,
  AgentChatItem,
  AgentActivityDetail,
  AgentActivityItem,
  AgentConversationState,
  AgentTurnResponse,
  AgentConfigResponse,
  AgentModel,
  AgentThreadResponse,
  AgentToolCallInput,
  AgentTurnInput,
  AgentEvent,
} from "./agentTypes.ts";
export { parseAgentUsage, isAgentQuotaExhausted } from "./agentUsage.ts";
export type { AgentUsageWindow } from "./agentUsage.ts";
export {
  updateProjectChatView,
  appendChatTaskReply,
} from "./chatProjectUpdate.ts";
export {
  codexHomeValidation,
  codexGenerationPrompt,
  codexReasoningModel,
} from "./codexGeneration.ts";
export { restoreConversationSelection } from "./conversationSelection.ts";
export {
  createDesktopAgentLifecycle,
  desktopAgentLifecycle,
} from "./desktopAgentLifecycle.ts";
export type { DesktopAgentRuntimeStatus } from "./desktopAgentLifecycle.ts";
export {
  GEMINI_BRIDGE_DEVELOPMENT_COMMAND,
  packagedGeminiBridgePowerShellCommand,
} from "./geminiBridgeCommand.ts";
export {
  GEMINI_BRIDGE_DEFAULT_URL,
  GEMINI_CLI_MODELS,
  resolveGeminiCliLoginStatus,
  geminiCliStatusMessage,
  GeminiCliError,
  normalizeGeminiBridgeUrl,
  geminiCliStatus,
  geminiCliChat,
} from "./geminiCliAdapter.ts";
export type {
  GeminiCliStatus,
  GeminiCliChatInput,
  GeminiCliChatResult,
  GeminiCliErrorCode,
} from "./geminiCliAdapter.ts";
export {
  GOOGLE_CONNECTION_ID,
  GOOGLE_CREDENTIAL_REF,
  GOOGLE_LOGIN_MODE_KEY,
  GOOGLE_BRIDGE_URL_KEY,
  readGoogleCliPreference,
  writeGoogleCliPreference,
  saveGoogleApiKeyConnection,
  getGoogleCredential,
} from "./googleAgentConfig.ts";
export {
  createGoogleAgentConnection,
  googleAgentConnection,
} from "./googleAgentConnection.ts";
export type {
  GoogleLoginMode,
  GoogleAgentSettings,
  GoogleAgentState,
} from "./googleAgentConnection.ts";
export { GOOGLE_CANVAS_TOOLS, executeGoogleTool } from "./googleAgentTools.ts";
export {
  GOOGLE_API_BASE,
  GOOGLE_TEXT_MODEL,
  GOOGLE_IMAGE_MODEL,
  GoogleApiError,
  createGoogleInteractions,
  googleImageId,
} from "./googleInteractions.ts";
export type {
  GoogleCall,
  GoogleResult,
  GoogleRequest,
} from "./googleInteractions.ts";
export {
  configureAgentProxy,
  sendProjectAgentMessage,
  clearSentPendingDraft,
} from "./homeAgentRecovery.ts";
export { createStageOrchestrator } from "./orchestrator.ts";
export type {
  StageOrchestratorOptions,
  StageDecisionInput,
  StageWorkItemUpdateInput,
  PlanToolName,
  PlanTool,
  StageOrchestrator,
} from "./orchestrator.ts";
export { default as UseAgentComposerDraft } from "./useAgentComposerDraft.ts";
export { useAgentDraftState } from "./useAgentComposerDraft.ts";
export type { AgentDraftState } from "./useAgentComposerDraft.ts";
