// Public contract entry for feature: creation
export {
  CanvasImageCommandContext,
  CanvasImageNodeContext,
  useCanvasImageGeneration,
} from "./CanvasImageCommand.tsx";
export type { CanvasImageRequest } from "./CanvasImageCommand.tsx";
export { loadAssetPreview, clearAssetPreviews } from "./assetPreview.ts";
export {
  assetProvenanceSchema,
  authenticatedAssetRoute,
  loadStoredAsset,
  hashPrompt,
  storeGeneratedAsset,
  listStoredAssets,
} from "./assetRepository.ts";
export type {
  AssetProvenance,
  StoredGeneratedAsset,
  StoredAssetMetadata,
} from "./assetRepository.ts";
export {
  audioVoiceOptions,
  audioFormatOptions,
  normalizeAudioVoiceValue,
  normalizeAudioFormatValue,
  normalizeAudioSpeedValue,
  audioVoiceLabel,
  audioFormatLabel,
  audioSpeedLabel,
  audioMimeType,
  requestAudioGeneration,
} from "./audioGeneration.ts";
export type {
  AudioGenerationConfig,
  AudioGenerationOptions,
} from "./audioGeneration.ts";
export {
  rejectSecretsInSnapshot,
  sha256Hex,
  sameJson,
  resolveActiveChatId,
  migrateSnapshotV2ToV3,
  migrateSnapshotToV3,
} from "./chatMigration.ts";
export type {
  ChatItem,
  ChatItemDraft,
  ChatItemMessage,
  CreationProjectV3,
  CreationSnapshotV3,
  LegacyV2Project,
  LegacyV2Snapshot,
} from "./chatMigration.ts";
export {
  canStartQueueItem,
  selectConnection,
  retryDelayMs,
  nextBatchStatus,
  mapWithConcurrency,
} from "./generationQueue.ts";
export type {
  QueueStatus,
  GenerationQueueItem,
  QueueConnectionHealth,
} from "./generationQueue.ts";
export {
  getSessionApiKey,
  setSessionApiKey,
  GenerationProviderError,
  readProvider,
  providerError,
  generateImages,
  generateImage,
  providerModelsEndpoint,
} from "./imageGeneration.ts";
export type {
  ProviderFailureClass,
  GeneratedImages,
} from "./imageGeneration.ts";
export {
  ImageTaskCommandError,
  assertLiveTextTask,
  validateImageTaskInput,
  prepareImageTask,
  appendImageTask,
  appendImageTaskResults,
  canvasImageAttachments,
} from "./imageTaskCommand.ts";
export { commitIndexedChatMigration } from "./indexedChatMigration.ts";
export type { IndexedSnapshotRecords } from "./indexedChatMigration.ts";
export {
  resolveTargetImageMime,
  calculateAdaptiveResize,
  detectAlphaTransparency,
} from "./mediaAlphaPreservation.ts";
export type { AdaptiveDimensions } from "./mediaAlphaPreservation.ts";
export {
  dimensionsFromImageSize,
  readImageDimensions,
} from "./mediaDimensions.ts";
export type { MediaDimensions } from "./mediaDimensions.ts";
export {
  projectHasUnsettledTasks,
  activeChat,
  projectChatView,
  updateActiveChat,
  hasLegacyChatAuthority,
  hasProjectChatAuthorityConflict,
  serializeCreationSnapshot,
  projectChatExecutionBlockReason,
  snapshotWriteBlockReason,
  CREATION_STORAGE_KEY,
  modelSupportsKind,
  emptyDraft,
  createDefaultChat,
  emptySnapshot,
  readCreationSnapshot,
  normalizeCreationSnapshot,
  isCreationProviderRoutingValid,
  normalizeChat,
  persistCreationSnapshot,
  createProject,
  createTask,
} from "./model.ts";
export type {
  CreationTaskStatus,
  CreationSubmissionState,
  CreationOutputStatus,
  CreationTaskOutput,
  CreationAttachment,
  CreationMessage,
  CreationTask,
  CreationProject,
  SidebarSortMode,
  SidebarPreferences,
  CreationSnapshotV2,
  CreationProjectGroup,
  CreationSnapshot,
  ReasoningEffort,
  CreationDraft,
  CreateProjectInput,
} from "./model.ts";
export {
  usesNativeAssets,
  storeNativeAsset,
  readNativeAsset,
  listNativeAssets,
} from "./nativeAssetAdapter.ts";
export {
  flushCreationBeforeClose,
  createNativeCloseHandler,
} from "./nativeClose.ts";
export {
  executeNativeFlow,
  publishNativeRecordState,
  resolveNativeStatus,
  resolveNativeErrorMessage,
  processSingleNativeOutput,
} from "./nativeTaskExecution.ts";
export type { NativeFlowOptions } from "./nativeTaskExecution.ts";
export {
  usesNativeTaskHost,
  nativeTaskHostUnavailableError,
  validateNativeTaskRecord,
  submitNativeTask,
  getNativeTask,
  listNativeTasks,
  cancelNativeTask,
  reconcileNativeTasks,
} from "./nativeTaskHost.ts";
export type {
  NativeTaskHostRequest,
  NativeTaskStatus,
  NativeTaskOutputStatus,
  NativeTaskHostOutput,
  NativeTaskHostRecord,
} from "./nativeTaskHost.ts";
export { compileDesignPrompt } from "./promptCompiler.ts";
export type { PromptCompileOptions } from "./promptCompiler.ts";
export {
  PROVIDER_SAVE_LOCK,
  withProviderStoreLock,
} from "./providerCoordination.ts";
export {
  credentialId,
  loadApiKey,
  hasApiKey,
  saveApiKey,
  deleteApiKey,
} from "./providerCredentials.ts";
export {
  PROVIDER_CONNECTIONS_STORAGE_KEY,
  normalizeProviderConnection,
  isDesktopProviderDurable,
  loadProviderConnectionsDurable,
  loadProviderConnectionsDurableSnapshot,
  persistProviderConnectionsDurable,
  readProviderConnections,
  writeProviderConnections,
  addProviderConnection,
  mergeProviderConnection,
  removeProviderConnection,
  updateProviderConnection,
  releaseProviderLease,
  markProviderConnectionHealthy,
  markProviderConnectionUnverified,
  markProviderConnectionFailure,
  managedConnections,
  findModelProfileConnection,
  newModelProfileConnection,
  connectionFromModelProfile,
} from "./providerRegistry.ts";
export {
  ProviderSaveError,
  providerSaveErrorMessage,
  restoreProviderConnection,
  saveProviderConnection,
  clearProviderConnectionKey,
} from "./providerSaveRecovery.ts";
export {
  ProviderSubmissionError,
  assertSynchronousProviderSubmission,
  taskProviderOptions,
  taskSubmissionBinding,
  assertSubmissionConnection,
  selectSubmissionConnection,
  reserveProviderSubmission,
  reserveProviderSubmissionAsync,
} from "./providerSubmission.ts";
export type {
  SubmissionBinding,
  ProviderSubmissionReservation,
} from "./providerSubmission.ts";
export {
  resolveImageAttachments,
  prepareAttachmentUpload,
} from "./resolveAttachments.ts";
export {
  isAssetReference,
  encodeSnapshotAssets,
  hydrateSnapshotAssets,
} from "./snapshotAssets.ts";
export {
  chatItemSchema,
  SnapshotStorageError,
  storageError,
  rejectSecrets,
  validateSnapshotV3,
  decodeSnapshot,
  parseSnapshot,
} from "./snapshotCodec.ts";
export {
  NonDowngradableWriteBarrier,
  loadCreationSnapshot,
  pendingRecoveryDraft,
  persistCreationSnapshotSync,
  sanitizeSnapshotForPersistence,
  persistCreationSnapshotAsync,
} from "./storage.ts";
export type { SnapshotLoad } from "./storage.ts";
export {
  abortedAfterProviderSubmission,
  submissionMayHaveBeenAccepted,
  canRetryTask,
  retryableOutputIndices,
  preserveAcceptedOutputsOnDeliveryFailure,
  markArchiveFailuresUnknown,
  retryBlockedOutputIndices,
  mergeRetryTaskState,
  reconcileRetryTaskParents,
  recoverInterruptedTasks,
} from "./taskRecovery.ts";
export {
  taskOutputsForDisplay,
  taskRetryAvailability,
} from "./taskRetryAvailability.ts";
export {
  normalizeTaskCostReceipt,
  applyTaskCostReceipt,
  unifiedTaskStatuses,
  taskStateRank,
  retryFailedOutputIndices,
  estimateTaskCostUsd,
  formatCostUsd,
} from "./taskState.ts";
export type {
  TaskCostReceiptKind,
  TaskCostReceiptSource,
  TaskCostReceipt,
  TaskCostReceiptApplyResult,
} from "./taskState.ts";
export { readTextStream, generateText } from "./textGeneration.ts";
export { consumeTextEvent } from "./textProtocolEvent.ts";
export type { TextProtocolState } from "./textProtocolEvent.ts";
export { textTaskResult } from "./textTaskResult.ts";
export { summarizeUsage } from "./usageSummary.ts";
export type { UsageSummary } from "./usageSummary.ts";
export { useAssetArchive } from "./useAssetArchive.ts";
export type { AssetArchiveState } from "./useAssetArchive.ts";
export { useCreationStorage } from "./useCreationStorage.ts";
export type { SaveState } from "./useCreationStorage.ts";
export {
  canvasSignature,
  createSubmissionLogic,
  useImageCommandSubmission,
  validatePreflightGuards,
  checkSubmissionUiReadiness,
} from "./useImageCommandSubmission.ts";
export type {
  ImageCommandRequest,
  UseImageCommandSubmissionOptions,
  UseImageCommandSubmissionReturn,
} from "./useImageCommandSubmission.ts";
export {
  useNativeTaskRecovery,
  useNativeTextRecovery,
} from "./useNativeTextRecovery.ts";
export { useSpeechInput } from "./useSpeechInput.ts";
export type { SpeechInputState } from "./useSpeechInput.ts";
export {
  outputsForTask,
  rootItemId,
  capacitySwitchHint,
  hasArchivedOutputEvidence,
  useTaskExecution,
  publishTaskOutputState,
} from "./useTaskExecution.ts";
export type {
  UseTaskExecutionOptions,
  UseTaskExecutionReturn,
} from "./useTaskExecution.ts";
