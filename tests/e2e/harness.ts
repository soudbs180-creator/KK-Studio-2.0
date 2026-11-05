/** Production entry points only. Transport and asset fixtures live in tests/support. */
export { GatewayCooldownScheduler } from "../../src/features/ai-gateway/index.ts";
export type {
  WaitingCandidate,
  RoutePlan,
} from "../../src/domain/gatewayCooldown.ts";
export {
  CACHE_STICKY_TTL,
  FALLBACK_STICKY_TTL,
  StandardDualStickinessManager as DualStickinessManager,
} from "../../src/domain/gatewayStickiness.ts";
export { ExtensionRuntimeBridgeImpl as ExtensionRuntimeBridge } from "../../src/features/extensions/index.ts";
export type { ExtensionManifest } from "../../src/features/extensions/index.ts";

export {
  RouterWorkerEngine,
  MandateLifecycleManager,
  SecurityHookEngine,
  formatStatuslineIPC,
} from "../../src/features/agent/index.ts";
export type { AgentTask } from "../../src/features/agent/index.ts";
export type {
  Mandate,
  Ticket,
  PreInvocationHook,
} from "../../src/domain/agentWorkflow.ts";
export { OntologyGraph } from "../../src/domain/ontologyGraph.ts";
export type { OntologyEntity } from "../../src/domain/ontologyGraph.ts";
export { validateAnswerability } from "../../src/domain/answerabilityCheck.ts";

export {
  AutonomousCanvasController,
  CanvasMcpServer,
  CANVAS_34_OPS,
  CanvasOpSchema,
} from "../../src/domain/canvasOperations.ts";
export type { CanvasViewport } from "../../src/domain/canvasOperations.ts";
export { FloorplanCanvasAdapter } from "../../src/features/canvas/index.ts";
export type { FloorplanNode } from "../../src/features/canvas/index.ts";
export { detectVideoShots } from "../../src/domain/videoShotBreakdown.ts";
export type { ShotBoundary } from "../../src/domain/videoShotBreakdown.ts";
export { auditStoryboardContinuity } from "../../src/domain/storyboardPipeline.ts";
export type { ContinuityConstraint } from "../../src/domain/storyboardPipeline.ts";
export { parsePromptMentions } from "../../src/domain/promptMentions.ts";
export { compileOpticsPrompt } from "../../src/domain/cameraOptics.ts";
export type { CameraOptics } from "../../src/domain/cameraOptics.ts";

export { waitForCreationTask } from "../../src/features/creation/index.ts";
export {
  createWorkspaceEscapeGuard,
  createSecretLeakGuard,
  createDestructiveCommandGuard,
} from "../../src/features/agent/index.ts";
