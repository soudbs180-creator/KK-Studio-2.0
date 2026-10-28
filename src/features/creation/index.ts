// Public contract entry for feature: creation
export { clearAssetPreviews, loadAssetPreview } from "./assetPreview.ts";
export {
  assetProvenanceSchema,
  authenticatedAssetRoute,
  hashPrompt,
  listStoredAssets,
  loadStoredAsset,
  storeGeneratedAsset,
} from "./assetRepository.ts";
export type {
  AssetProvenance,
  StoredAssetMetadata,
  StoredGeneratedAsset,
} from "./assetRepository.ts";
export {
  audioFormatLabel,
  audioFormatOptions,
  audioMimeType,
  audioSpeedLabel,
  audioVoiceLabel,
  audioVoiceOptions,
  normalizeAudioFormatValue,
  normalizeAudioSpeedValue,
  normalizeAudioVoiceValue,
  requestAudioGeneration,
} from "./audioGeneration.ts";
export type {
  AudioGenerationConfig,
  AudioGenerationOptions,
} from "./audioGeneration.ts";
export {
  CanvasImageCommandContext,
  CanvasImageNodeContext,
  useCanvasImageGeneration,
} from "./CanvasImageCommand.tsx";
export type { CanvasImageRequest } from "./CanvasImageCommand.tsx";
export {
  migrateSnapshotToV3,
  migrateSnapshotV2ToV3,
  rejectSecretsInSnapshot,
  resolveActiveChatId,
  sameJson,
  sha256Hex,
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
  PROVIDER_SAVE_LOCK,
  withProviderStoreLock,
} from "./providerCoordination.ts";
export {
  ProviderSaveError,
  clearProviderConnectionKey,
  providerSaveErrorMessage,
  restoreProviderConnection,
  saveProviderConnection,
} from "./providerSaveRecovery.ts";
export {
  credentialId,
  deleteApiKey,
  hasApiKey,
  loadApiKey,
  saveApiKey,
} from "./providerCredentials.ts";
export {
  canStartQueueItem,
  mapWithConcurrency,
  nextBatchStatus,
  retryDelayMs,
  selectConnection,
} from "./generationQueue.ts";
export type {
  GenerationQueueItem,
  QueueConnectionHealth,
  QueueStatus,
} from "./generationQueue.ts";
export {
  GenerationProviderError,
  generateImage,
  generateImages,
  getSessionApiKey,
  providerError,
  providerModelsEndpoint,
  readProvider,
  setSessionApiKey,
} from "./imageGeneration.ts";
export type {
  GeneratedImages,
  ProviderFailureClass,
} from "./imageGeneration.ts";
export {
  ImageTaskCommandError,
  appendImageTask,
  appendImageTaskResults,
  assertLiveTextTask,
  canvasImageAttachments,
  prepareImageTask,
  validateImageTaskInput,
} from "./imageTaskCommand.ts";
export { commitIndexedChatMigration } from "./indexedChatMigration.ts";
export type { IndexedSnapshotRecords } from "./indexedChatMigration.ts";
export {
  calculateAdaptiveResize,
  detectAlphaTransparency,
  resolveTargetImageMime,
} from "./mediaAlphaPreservation.ts";
export type { AdaptiveDimensions } from "./mediaAlphaPreservation.ts";
export {
  dimensionsFromImageSize,
  readImageDimensions,
} from "./mediaDimensions.ts";
export type { MediaDimensions } from "./mediaDimensions.ts";
export {
  CREATION_STORAGE_KEY,
  activeChat,
  createDefaultChat,
  createProject,
  createTask,
  emptyDraft,
  emptySnapshot,
  hasLegacyChatAuthority,
  hasProjectChatAuthorityConflict,
  isCreationProviderRoutingValid,
  modelSupportsKind,
  normalizeChat,
  normalizeCreationSnapshot,
  persistCreationSnapshot,
  projectChatExecutionBlockReason,
  projectChatView,
  projectHasUnsettledTasks,
  readCreationSnapshot,
  serializeCreationSnapshot,
  snapshotWriteBlockReason,
  updateActiveChat,
} from "./model.ts";
export type {
  CreateProjectInput,
  CreationAttachment,
  CreationDraft,
  CreationMessage,
  CreationOutputStatus,
  CreationProject,
  CreationProjectGroup,
  CreationSnapshot,
  CreationSnapshotV2,
  CreationSubmissionState,
  CreationTask,
  CreationTaskOutput,
  CreationTaskStatus,
  ReasoningEffort,
  SidebarPreferences,
  SidebarSortMode,
} from "./model.ts";
export {
  listNativeAssets,
  readNativeAsset,
  storeNativeAsset,
  usesNativeAssets,
} from "./nativeAssetAdapter.ts";
export {
  createNativeCloseHandler,
  flushCreationBeforeClose,
} from "./nativeClose.ts";
export {
  executeNativeFlow,
  processSingleNativeOutput,
  publishNativeRecordState,
  resolveNativeErrorMessage,
  resolveNativeStatus,
} from "./nativeTaskExecution.ts";
export type { NativeFlowOptions } from "./nativeTaskExecution.ts";
export {
  cancelNativeTask,
  getNativeTask,
  listNativeTasks,
  nativeTaskHostUnavailableError,
  reconcileNativeTasks,
  submitNativeTask,
  usesNativeTaskHost,
  validateNativeTaskRecord,
} from "./nativeTaskHost.ts";
export type {
  NativeTaskHostOutput,
  NativeTaskHostRecord,
  NativeTaskHostRequest,
  NativeTaskOutputStatus,
  NativeTaskStatus,
} from "./nativeTaskHost.ts";
export { compileDesignPrompt } from "./promptCompiler.ts";
export type { PromptCompileOptions } from "./promptCompiler.ts";
export {
  PROVIDER_CONNECTIONS_STORAGE_KEY,
  addProviderConnection,
  connectionFromModelProfile,
  findModelProfileConnection,
  isDesktopProviderDurable,
  loadProviderConnectionsDurable,
  loadProviderConnectionsDurableSnapshot,
  managedConnections,
  markProviderConnectionFailure,
  markProviderConnectionHealthy,
  markProviderConnectionUnverified,
  mergeProviderConnection,
  newModelProfileConnection,
  normalizeProviderConnection,
  persistProviderConnectionsDurable,
  readProviderConnections,
  releaseProviderLease,
  removeProviderConnection,
  updateProviderConnection,
  writeProviderConnections,
} from "./providerRegistry.ts";
export {
  ProviderSubmissionError,
  assertSubmissionConnection,
  assertSynchronousProviderSubmission,
  reserveProviderSubmission,
  reserveProviderSubmissionAsync,
  selectSubmissionConnection,
  taskProviderOptions,
  taskSubmissionBinding,
} from "./providerSubmission.ts";
export type {
  ProviderSubmissionReservation,
  SubmissionBinding,
} from "./providerSubmission.ts";
export {
  prepareAttachmentUpload,
  resolveImageAttachments,
} from "./resolveAttachments.ts";
export {
  encodeSnapshotAssets,
  hydrateSnapshotAssets,
  isAssetReference,
} from "./snapshotAssets.ts";
export {
  SnapshotStorageError,
  chatItemSchema,
  decodeSnapshot,
  parseSnapshot,
  rejectSecrets,
  storageError,
  validateSnapshotV3,
} from "./snapshotCodec.ts";
export {
  NonDowngradableWriteBarrier,
  loadCreationSnapshot,
  pendingRecoveryDraft,
  persistCreationSnapshotAsync,
  persistCreationSnapshotSync,
  sanitizeSnapshotForPersistence,
} from "./storage.ts";
export type { SnapshotLoad } from "./storage.ts";
export {
  abortedAfterProviderSubmission,
  canRetryTask,
  markArchiveFailuresUnknown,
  mergeRetryTaskState,
  preserveAcceptedOutputsOnDeliveryFailure,
  reconcileRetryTaskParents,
  recoverInterruptedTasks,
  retryBlockedOutputIndices,
  retryableOutputIndices,
  submissionMayHaveBeenAccepted,
} from "./taskRecovery.ts";
export {
  taskOutputsForDisplay,
  taskRetryAvailability,
} from "./taskRetryAvailability.ts";
export {
  applyTaskCostReceipt,
  estimateTaskCostUsd,
  formatCostUsd,
  normalizeTaskCostReceipt,
  retryFailedOutputIndices,
  taskStateRank,
  unifiedTaskStatuses,
} from "./taskState.ts";
export type {
  TaskCostReceipt,
  TaskCostReceiptApplyResult,
  TaskCostReceiptKind,
  TaskCostReceiptSource,
} from "./taskState.ts";
export { generateText, readTextStream } from "./textGeneration.ts";
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
  checkSubmissionUiReadiness,
  createSubmissionLogic,
  useImageCommandSubmission,
  validatePreflightGuards,
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
  capacitySwitchHint,
  hasArchivedOutputEvidence,
  outputsForTask,
  publishTaskOutputState,
  rootItemId,
  useTaskExecution,
} from "./useTaskExecution.ts";
export type {
  UseTaskExecutionOptions,
  UseTaskExecutionReturn,
} from "./useTaskExecution.ts";
