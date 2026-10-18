import type {
  CreationTask,
  CreationDraft,
} from "@kk-studio/creation-contracts";
import type {
  MobileSnapshot,
  MobileConnectionMetadata,
} from "../core/mobileModel.ts";
import type { MobileRepository } from "../storage/repository.ts";
import type { CredentialVault } from "../storage/ports.ts";
import type { createIdentityClient } from "../services/identityClient.ts";
import type { createProviderClient } from "../services/providerClient.ts";
import type {
  createTwelveAiVideoClient,
  VideoReceipt,
} from "../services/twelveAiVideoClient.ts";
import type { createGatewayImageClient } from "../services/gatewayImageClient.ts";
import type { createComfyUiClient } from "../services/comfyClient.ts";
import type { AuthSession, MobileUser } from "../services/authTypes.ts";
import type {
  ImageReceipt,
  TextReceipt,
  ModelProbe,
  ProviderConnection,
} from "../services/providerTypes.ts";
import { userError } from "./errors.ts";

export type AuthState =
  | "starting"
  | "local"
  | "localStorageRecovery"
  | "signedOut"
  | "signingIn"
  | "ready"
  | "expired"
  | "storageRecovery";
export interface ApplicationState {
  auth: AuthState;
  deviceId?: string;
  user?: MobileUser;
  accountId?: string;
  legacyStorageGate?: boolean;
  snapshot: MobileSnapshot | null;
  error?: string;
  storageError?: string;
  busyTaskIds: string[];
  recoverableTaskIds: string[];
  streams: Record<string, string>;
  health: Record<string, ModelProbe>;
  unsavedDraftProjectIds: string[];
}
export interface ApplicationDependencies {
  /** Only the browser runtime enables local creation; native keeps account startup. */
  initialMode?: "local";
  identityDigest(value: string): Promise<string>;
  allowLoopbackHttp?: boolean;
  repository(accountId: string): Promise<MobileRepository>;
  vault(accountId: string): CredentialVault;
  identity(baseUrl: string): ReturnType<typeof createIdentityClient>;
  provider(vault: CredentialVault): ReturnType<typeof createProviderClient>;
  video?(vault: CredentialVault): ReturnType<typeof createTwelveAiVideoClient>;
  gateway?(vault: CredentialVault): ReturnType<typeof createGatewayImageClient>;
  comfy?(vault: CredentialVault): ReturnType<typeof createComfyUiClient>;
  id(): string;
  now(): number;
}
interface CreationContext {
  accountId: string;
  repo: MobileRepository;
  vault: CredentialVault;
  snapshot: MobileSnapshot;
  epoch: number;
  pending: Promise<unknown>;
}
export interface SignedInContext extends CreationContext {
  mode: "account";
  identityOrigin: string;
  session: AuthSession;
}
export interface LocalContext extends CreationContext {
  mode: "local";
  identityOrigin?: never;
  session?: never;
}
export type AccountContext = SignedInContext | LocalContext;
export function requireAccountContext(ctx: AccountContext): SignedInContext {
  if (ctx.mode !== "account")
    throw new Error("此功能需要真实账号登录；本地创作与原件保留。");
  return ctx;
}
export interface PendingArchive {
  accountId: string;
  projectId: string;
  task: CreationTask;
  receipt: TextReceipt | ImageReceipt | VideoReceipt;
  complete: boolean;
}
export interface PendingGateway {
  accountId: string;
  projectId: string;
  task: CreationTask;
  jobId: string;
}
export interface WorkflowHost {
  deps: ApplicationDependencies;
  active: Map<
    string,
    { context: AccountContext; projectId: string; controller: AbortController }
  >;
  recoveries: Map<string, PendingArchive>;
  pendingGateways: Map<string, PendingGateway>;
  submitting: Set<string>;
  context(): AccountContext;
  valid(context: AccountContext): boolean;
  ensureSession(): Promise<void>;
  mutate(
    context: AccountContext,
    operation: (
      repo: MobileRepository,
      snapshot: MobileSnapshot,
    ) => Promise<MobileSnapshot>,
  ): Promise<MobileSnapshot>;
  publish(): void;
  report(error: unknown): void;
  stream(context: AccountContext, taskId: string, text: string): void;
}
export interface ConnectionInput {
  id?: string;
  name: string;
  baseUrl: string;
  protocol: ProviderConnection["protocol"];
  capabilities: ProviderConnection["capabilities"];
}
export interface SubmissionOptions {
  /** Captured on the task at submit; unfinished drafts keep the legacy schema. */
  imageSize?: string;
}
export function providerConnection(
  metadata: MobileConnectionMetadata,
): ProviderConnection {
  if (metadata.protocol === "comfyui")
    throw new Error("请在 ComfyUI 工作流页面使用该连接。");
  if (!metadata.credentialRef)
    throw new Error("连接缺少凭据，请在模型连接中重新保存。");
  return {
    id: metadata.id,
    baseUrl: metadata.baseUrl,
    credentialRef: metadata.credentialRef,
    protocol: metadata.protocol ?? "openai-compatible",
    capabilities: metadata.capabilities ?? { text: false, image: false },
  };
}
export function projectRevision(
  snapshot: MobileSnapshot,
  projectId: string,
): number {
  const project = snapshot.projects.find((p) => p.id === projectId);
  if (!project) throw new Error("项目已不存在；输入保留，不能写入其他项目。");
  return project.revision;
}
export function errorMessage(error: unknown): string {
  return userError(error);
}
export function capturedDraft(task: CreationTask, now: number): CreationDraft {
  return {
    prompt: task.prompt,
    model: task.model,
    kind: task.kind,
    attachments: task.attachments,
    providerConnectionId: task.providerConnectionId,
    outputCount: task.requestedOutputs,
    approvalMode: "ask",
    privacyMode: task.privacyMode,
    updatedAt: now,
  };
}
