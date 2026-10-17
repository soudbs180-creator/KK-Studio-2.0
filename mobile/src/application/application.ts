import type {
  CreationDraft,
  CreationTask,
} from "@kk-studio/creation-contracts";
import type { MobileSnapshot } from "../core/mobileModel.ts";
import {
  errorMessage,
  projectRevision,
  requireAccountContext,
  type AccountContext,
  type ApplicationDependencies,
  type ApplicationState,
  type ConnectionInput,
  type PendingArchive,
  type PendingGateway,
  type SignedInContext,
} from "./types.ts";
import type { AuthSession } from "../services/authTypes.ts";
import { submit, recoverTask } from "./workflow.ts";
import {
  reconcileTask,
  requestGatewayCancel,
  reconcileOutstanding,
} from "./gatewayWorkflow.ts";
import { updateLinkOwnership } from "./nativeLinks.ts";
import { refreshIdentity } from "./sessionRefresh.ts";
import { DraftMemory } from "./draftMemory.ts";
import { LocalWorkflows } from "./localWorkflows.ts";
import { ProjectWorkflows } from "./projectWorkflows.ts";
import { MaterialWorkflows } from "./materialWorkflows.ts";
import {
  saveConnection,
  removeConnection,
  probeConnection,
} from "./connections.ts";
import { canonicalIdentityOrigin, identityScope } from "./identityScope.ts";
import { RepositoryOwners, ActivationSuperseded } from "./repositoryOwners.ts";
import { finishStorageLogout } from "./logoutStorage.ts";

export function createMobileApplication(deps: ApplicationDependencies) {
  return new MobileApplication(deps);
}
export class MobileApplication {
  readonly deps: ApplicationDependencies;
  readonly local: LocalWorkflows;
  readonly projects: ProjectWorkflows;
  readonly materials: MaterialWorkflows;
  private readonly repositoryOwners = new RepositoryOwners();
  readonly active = this.repositoryOwners.active;
  readonly recoveries = new Map<string, PendingArchive>();
  readonly pendingGateways = new Map<string, PendingGateway>();
  readonly submitting = new Set<string>();
  private current?: AccountContext;
  private epoch = 0;
  private storageRecovery?: {
    session: AuthSession;
    epoch: number;
    identityOrigin: string;
    accountId: string;
    legacyGate: boolean;
  };
  private origin = "https://kkai.plus";
  private listeners = new Set<() => void>();
  private refreshPending?: Promise<void>;
  private refreshOwner?: SignedInContext;
  private startPending?: Promise<void>;
  private identityPending: Promise<unknown> = Promise.resolve();
  private drafts = new DraftMemory();
  private state: ApplicationState = {
    auth: "starting",
    snapshot: null,
    busyTaskIds: [],
    recoverableTaskIds: [],
    streams: {},
    health: {},
    unsavedDraftProjectIds: [],
  };
  constructor(deps: ApplicationDependencies) {
    this.deps = deps;
    this.local = new LocalWorkflows(this);
    this.projects = new ProjectWorkflows(this);
    this.materials = new MaterialWorkflows(this);
  }
  getState = (): ApplicationState => this.state;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private set(patch: Partial<ApplicationState>): void {
    this.state = { ...this.state, ...patch };
    if (patch.auth !== undefined || patch.snapshot !== undefined)
      updateLinkOwnership(
        this.state.auth === "ready" || this.state.auth === "local"
          ? this.state.snapshot
          : undefined,
      );
    for (const l of this.listeners) l();
  }
  context(): AccountContext {
    if (
      this.state.auth === "storageRecovery" ||
      this.state.auth === "localStorageRecovery"
    )
      throw new Error("设备存储尚未恢复；请先重新读取或确认隔离存储。");
    if (
      !this.current ||
      (this.state.auth !== "ready" && this.state.auth !== "local")
    )
      throw new Error("需要有效登录会话。设备草稿与原件保留。");
    return this.current;
  }
  valid(ctx: AccountContext): boolean {
    return (
      ctx === this.current &&
      ctx.epoch === this.epoch &&
      (this.state.auth === "ready" || this.state.auth === "local")
    );
  }
  requireAccountContext(): SignedInContext {
    return requireAccountContext(this.context());
  }
  publish(): void {
    this.set({
      unsavedDraftProjectIds: this.current
        ? this.drafts.unresolved(this.current.accountId)
        : [],
      snapshot: this.current?.snapshot ?? this.state.snapshot,
      busyTaskIds: [...this.active]
        .filter(([, a]) => this.valid(a.context))
        .map(([id]) => id),
      recoverableTaskIds: [
        ...new Set(
          [...this.recoveries, ...this.pendingGateways]
            .filter(([, a]) => a.accountId === this.current?.accountId)
            .map(([id]) => id),
        ),
      ],
    });
  }
  report(error: unknown): void {
    this.set({ error: errorMessage(error) });
  }
  clearError(): void {
    this.set({ error: undefined });
  }
  stream(ctx: AccountContext, id: string, text: string): void {
    if (this.valid(ctx))
      this.set({ streams: { ...this.state.streams, [id]: text } });
  }
  async mutate(
    ctx: AccountContext,
    operation: (
      repo: AccountContext["repo"],
      snapshot: MobileSnapshot,
    ) => Promise<MobileSnapshot>,
  ): Promise<MobileSnapshot> {
    const pending = ctx.pending.then(async () => {
      try {
        ctx.snapshot = await operation(ctx.repo, ctx.snapshot);
        if (this.valid(ctx))
          this.set({ snapshot: ctx.snapshot, storageError: undefined });
        return ctx.snapshot;
      } catch (error) {
        if (ctx === this.current)
          this.set({ storageError: errorMessage(error) });
        throw error;
      }
    });
    ctx.pending = pending.catch(() => undefined);
    return pending;
  }
  start(): Promise<void> {
    return (this.startPending ??= this.bootstrap());
  }
  private async identityWrite(operation: () => Promise<void>): Promise<void> {
    const pending = this.identityPending.then(operation);
    this.identityPending = pending.catch(() => undefined);
    return pending;
  }
  private assertEpoch(epoch: number): void {
    if (epoch !== this.epoch) throw new Error("会话已被新的操作替代。");
  }
  private async deviceIdentity(epoch: number): Promise<string> {
    const vault = this.deps.vault("_identity");
    let deviceId = await vault.get("device-id");
    this.assertEpoch(epoch);
    if (!deviceId) {
      deviceId = this.deps.id();
      const captured = deviceId;
      await this.identityWrite(async () => {
        this.assertEpoch(epoch);
        await vault.set("device-id", captured);
        this.assertEpoch(epoch);
      });
    }
    this.assertEpoch(epoch);
    this.set({ deviceId });
    return deviceId;
  }
  private async bootstrap(): Promise<void> {
    if (this.deps.initialMode === "local") {
      await this.activateLocal(this.epoch);
      return;
    }
    const epoch = this.epoch,
      initialOrigin = this.origin;
    try {
      const vault = this.deps.vault("_identity"),
        deviceId = await this.deviceIdentity(epoch);
      this.assertEpoch(epoch);
      const saved = await vault.get("session");
      this.assertEpoch(epoch);
      const storedOrigin = await vault.get("identity-origin");
      this.assertEpoch(epoch);
      const origin = canonicalIdentityOrigin(
        storedOrigin ?? initialOrigin,
        this.deps.allowLoopbackHttp,
      );
      if (!saved) {
        this.origin = origin;
        this.set({ auth: "signedOut" });
        return;
      }
      const version = await vault.get("namespace-version");
      this.assertEpoch(epoch);
      const parsed = JSON.parse(saved) as AuthSession;
      if (
        !parsed?.user?.id ||
        parsed.deviceId !== deviceId ||
        !parsed.refreshToken ||
        !Number.isFinite(parsed.refreshExpiresAt) ||
        parsed.refreshExpiresAt <= this.deps.now()
      )
        throw new Error("会话已过期，请重新登录。");
      const identity = this.deps.identity(origin);
      const session = await identity.refresh({
        refreshToken: parsed.refreshToken,
        deviceId,
      });
      this.assertEpoch(epoch);
      if (session.user.id !== parsed.user.id || session.deviceId !== deviceId)
        throw new Error("会话账号发生变化，请重新登录。");
      const me = await identity.me(session.accessToken, deviceId);
      this.assertEpoch(epoch);
      if (me.user.id !== session.user.id || me.deviceId !== deviceId)
        throw new Error("会话身份验证失败。");
      await this.activate(session, epoch, origin, version !== "realm-v1");
    } catch (error) {
      if (
        epoch !== this.epoch ||
        this.state.auth === "storageRecovery" ||
        error instanceof ActivationSuperseded
      )
        return;
      this.current = undefined;
      this.set({ auth: "expired", snapshot: null, error: errorMessage(error) });
    }
  }
  private async activate(
    session: AuthSession,
    epoch: number,
    origin: string,
    legacyGate = false,
  ): Promise<void> {
    const activation = this.repositoryOwners.activation(() =>
      this.assertEpoch(epoch),
    );
    activation.assert();
    const accountId = await identityScope(
      origin,
      session.user.id,
      this.deps.identityDigest,
    );
    activation.assert();
    if (session.deviceId !== this.state.deviceId)
      throw new Error("会话设备验证失败。");
    this.origin = origin;
    const recovery = {
      session,
      epoch,
      identityOrigin: origin,
      accountId,
      legacyGate,
    };
    this.storageRecovery = recovery;
    await this.identityWrite(async () => {
      const vault = this.deps.vault("_identity");
      activation.assert();
      await vault.set("session", JSON.stringify(session));
      activation.assert();
      await vault.set("identity-origin", origin);
      activation.assert();
      if (!legacyGate) await vault.set("namespace-version", "realm-v1");
      activation.assert();
    });
    activation.assert();
    this.set({
      user: session.user,
      accountId,
      snapshot: null,
      legacyStorageGate: legacyGate,
    });
    if (legacyGate) {
      this.set({
        auth: "storageRecovery",
        storageError:
          "旧版数据没有绑定身份服务，无法安全自动归属或迁移。原用户编号存储和凭据保留；请明确启用新的隔离存储。",
      });
      return;
    }
    let repo: AccountContext["repo"] | undefined;
    try {
      repo = await this.deps.repository(accountId);
      activation.assert();
      const snapshot = await repo.initialize();
      activation.assert();
      const previous = this.current;
      this.current = {
        mode: "account",
        accountId,
        identityOrigin: origin,
        session,
        repo,
        snapshot,
        vault: this.deps.vault(accountId),
        epoch,
        pending: Promise.resolve(),
      };
      this.storageRecovery = undefined;
      repo = undefined;
      this.set({
        auth: "ready",
        user: session.user,
        accountId,
        snapshot,
        error: undefined,
        storageError: undefined,
        legacyStorageGate: false,
        health: {},
        streams: {},
      });
      this.publish();
      if (previous)
        await this.repositoryOwners
          .retire(previous, (error) => this.report(error))
          .catch((error) => this.report(error));
      void this.reconcileOutstanding(true);
    } catch (error) {
      if (repo) await repo.dispose().catch(() => undefined);
      if (epoch !== this.epoch || !activation.current()) throw error;
      const discarded = this.current;
      this.current = undefined;
      if (discarded)
        await this.repositoryOwners
          .retire(discarded, (failure) => this.report(failure))
          .catch(() => undefined);
      this.set({
        auth: "storageRecovery",
        snapshot: null,
        storageError: errorMessage(error),
        error: undefined,
      });
      throw error;
    }
  }
  async login(
    email: string,
    password: string,
    requestedOrigin = this.origin,
  ): Promise<void> {
    if (this.state.auth === "signingIn") throw new Error("正在登录。");
    const origin = canonicalIdentityOrigin(
        requestedOrigin,
        this.deps.allowLoopbackHttp,
      ),
      epoch = ++this.epoch;
    const previous = this.current;
    for (const a of this.active.values()) a.controller.abort();
    this.current = undefined;
    this.storageRecovery = undefined;
    this.set({
      auth: "signingIn",
      snapshot: null,
      user: undefined,
      accountId: undefined,
      storageError: undefined,
      error: undefined,
      legacyStorageGate: false,
    });
    if (previous)
      await this.repositoryOwners
        .retire(previous, (error) => this.report(error))
        .catch((error) => this.report(error));
    try {
      const deviceId = await this.deviceIdentity(epoch),
        vault = this.deps.vault("_identity");
      this.assertEpoch(epoch);
      const saved = await vault.get("session");
      this.assertEpoch(epoch);
      const version = await vault.get("namespace-version");
      this.assertEpoch(epoch);
      const identity = this.deps.identity(origin);
      const session = await identity.login({
        email: email.trim(),
        password,
        deviceId,
      });
      this.assertEpoch(epoch);
      await this.activate(
        session,
        epoch,
        origin,
        Boolean(saved) && version !== "realm-v1",
      );
    } catch (error) {
      if (
        epoch === this.epoch &&
        this.state.auth !== "storageRecovery" &&
        !(error instanceof ActivationSuperseded)
      )
        this.set({ auth: "signedOut", error: errorMessage(error) });
      throw error;
    }
  }
  async refreshSession(): Promise<void> {
    const ctx = this.requireAccountContext();
    if (this.refreshPending && this.refreshOwner === ctx)
      return this.refreshPending;
    const pending = refreshIdentity(this, ctx, (next) =>
      this.identityWrite(async () => {
        if (!this.valid(ctx)) throw new Error("会话已变化。");
        await this.deps.vault("_identity").set("session", JSON.stringify(next));
        if (!this.valid(ctx)) throw new Error("会话已变化。");
      }),
    )
      .catch((error) => {
        if (ctx === this.current) {
          ++this.epoch;
          this.set({ auth: "expired", error: errorMessage(error) });
          for (const a of this.active.values())
            if (a.context === ctx) a.controller.abort();
        }
        throw error;
      })
      .finally(() => {
        if (this.refreshPending === pending) this.refreshPending = undefined;
      });
    this.refreshPending = pending;
    this.refreshOwner = ctx;
    return pending;
  }
  async ensureSession(): Promise<void> {
    const ctx = this.context();
    if (
      ctx.mode === "account" &&
      ctx.session.accessExpiresAt <= this.deps.now() + 30_000
    )
      await this.refreshSession();
  }
  async enterAccountMode(): Promise<void> {
    if (this.deps.initialMode !== "local" || this.current?.mode === "account")
      return;
    ++this.epoch;
    const previous = this.current;
    for (const active of this.active.values()) active.controller.abort();
    this.current = undefined;
    this.set({
      auth: "signedOut",
      snapshot: null,
      user: undefined,
      accountId: undefined,
      storageError: undefined,
      error: undefined,
      health: {},
      streams: {},
      busyTaskIds: [],
      recoverableTaskIds: [],
      unsavedDraftProjectIds: [],
    });
    if (previous)
      await this.repositoryOwners.retire(previous, (error) =>
        this.report(error),
      );
  }
  async enterLocalMode(): Promise<void> {
    if (this.deps.initialMode !== "local")
      throw new Error("只有浏览器支持独立本地模式。");
    if (this.current?.mode === "local") return;
    if (this.current?.mode === "account" || this.storageRecovery) {
      await this.logout();
      return;
    }
    const epoch = ++this.epoch,
      previous = this.current;
    for (const active of this.active.values()) active.controller.abort();
    this.current = undefined;
    this.set({ auth: "starting", snapshot: null, user: undefined });
    if (previous)
      await this.repositoryOwners.retire(previous, (error) =>
        this.report(error),
      );
    await this.identityWrite(async () => {
      this.assertEpoch(epoch);
      await this.deps.vault("_identity").remove("session");
    });
    if (epoch === this.epoch) await this.activateLocal(epoch);
  }
  private async activateLocal(epoch: number): Promise<void> {
    const activation = this.repositoryOwners.activation(() =>
      this.assertEpoch(epoch),
    );
    let repo: AccountContext["repo"] | undefined;
    try {
      // This namespace cannot collide with an identityScope realm-v1 hash.
      const accountId = "local-browser-v1";
      activation.assert();
      repo = await this.deps.repository(accountId);
      activation.assert();
      const snapshot = await repo.initialize();
      activation.assert();
      this.current = {
        mode: "local",
        accountId,
        repo,
        snapshot,
        vault: this.deps.vault(accountId),
        epoch,
        pending: Promise.resolve(),
      };
      repo = undefined;
      this.set({
        auth: "local",
        accountId,
        snapshot,
        user: undefined,
        deviceId: undefined,
        error: undefined,
        storageError: undefined,
        legacyStorageGate: false,
        health: {},
        streams: {},
      });
      this.publish();
    } catch (error) {
      if (repo) await repo.dispose().catch(() => undefined);
      if (epoch !== this.epoch || !activation.current()) return;
      this.current = undefined;
      this.set({
        auth: "localStorageRecovery",
        snapshot: null,
        user: undefined,
        storageError: errorMessage(error),
        error: undefined,
      });
    }
  }
  async logout(): Promise<void> {
    if (this.current?.mode === "local") return;
    const ctx = this.current,
      recovery = this.storageRecovery,
      origin = ctx?.identityOrigin ?? recovery?.identityOrigin ?? this.origin;
    const epoch = ++this.epoch;
    for (const a of this.active.values())
      if (a.context === ctx) a.controller.abort();
    this.current = undefined;
    this.storageRecovery = undefined;
    this.set({
      accountId: undefined,
      legacyStorageGate: false,
      storageError: undefined,
      auth: "signedOut",
      snapshot: null,
      user: undefined,
      streams: {},
      health: {},
      busyTaskIds: [],
      recoverableTaskIds: [],
      unsavedDraftProjectIds: [],
      error: undefined,
    });
    await finishStorageLogout(
      this,
      ctx,
      recovery?.session,
      origin,
      (owner) =>
        this.repositoryOwners.retire(owner, (error) => this.report(error)),
      () =>
        this.identityWrite(() =>
          this.deps.vault("_identity").remove("session"),
        ),
    );
    if (this.deps.initialMode === "local" && epoch === this.epoch)
      await this.activateLocal(epoch);
  }
  async reloadStorage(): Promise<void> {
    if (this.state.auth === "localStorageRecovery") {
      await this.enterLocalMode();
      return;
    }
    if (this.storageRecovery) {
      const r = this.storageRecovery;
      if (r.legacyGate)
        throw new Error("请先明确启用新的隔离存储；旧版内容不会自动迁移。");
      await this.activate(r.session, r.epoch, r.identityOrigin);
      return;
    }
    const ctx = this.context();
    await this.mutate(ctx, (repo) => repo.load());
    this.publish();
  }
  async enableIsolatedStorage(): Promise<void> {
    const r = this.storageRecovery;
    if (!r?.legacyGate) throw new Error("没有待确认的旧版存储隔离。");
    await this.activate(r.session, r.epoch, r.identityOrigin);
  }
  async createProject(name: string): Promise<void> {
    const ctx = this.context();
    await this.mutate(ctx, (repo) => repo.create(name));
  }
  async openProject(id: string): Promise<void> {
    const ctx = this.context();
    await this.mutate(ctx, (repo) => repo.open(id));
  }
  async renameProject(id: string, name: string): Promise<void> {
    const ctx = this.context();
    await this.mutate(ctx, (r, s) =>
      r.rename(id, name, projectRevision(s, id)),
    );
  }
  async deleteProject(id: string): Promise<void> {
    const ctx = this.context();
    if (this.drafts.unresolved(ctx.accountId).includes(id))
      throw new Error("项目有尚未保存的保留草稿，请先核对并保存。");
    await this.mutate(ctx, (r, s) => r.delete(id, projectRevision(s, id)));
  }
  saveDraft(
    id: string,
    draft: CreationDraft,
    resolveConflict = false,
    expectedAccountId?: string,
    editorEdit = false,
  ): Promise<void> {
    return this.drafts.save(
      this,
      id,
      draft,
      resolveConflict,
      expectedAccountId,
      editorEdit,
    );
  }
  attachMaterialToDraft(
    assetId: string,
    expectedAccountId?: string,
  ): Promise<void> {
    return this.drafts.attach(this, assetId, expectedAccountId);
  }
  getDraft(id: string): CreationDraft {
    return this.drafts.get(this, id);
  }
  async saveTheme(
    theme: MobileSnapshot["preferences"]["theme"],
  ): Promise<void> {
    const ctx = this.context();
    await this.mutate(ctx, (repo) => repo.savePreferences({ theme }));
  }
  updateHealth(health: ApplicationState["health"]): void {
    this.set({ health });
  }
  saveConnection(input: ConnectionInput, secret: string): Promise<string> {
    return saveConnection(this, input, secret);
  }
  removeConnection(id: string): Promise<void> {
    return removeConnection(this, id);
  }
  probeConnection(id: string): Promise<void> {
    return probeConnection(this, id);
  }
  submit(): Promise<void> {
    return this.ownedWorkflow(() => submit(this));
  }
  retryTask(id: string): Promise<void> {
    return this.ownedWorkflow(() => submit(this, id));
  }
  recoverTask(id: string): Promise<void> {
    return this.ownedWorkflow(() => recoverTask(this, id));
  }
  reconcileTask(id: string): Promise<void> {
    return this.ownedWorkflow(() => reconcileTask(this, id));
  }
  requestGatewayCancel(id: string): Promise<void> {
    return this.ownedWorkflow(() => requestGatewayCancel(this, id));
  }
  reconcileOutstanding(includeUnknown = false): Promise<void> {
    return this.state.auth === "ready"
      ? this.ownedWorkflow(() => reconcileOutstanding(this, includeUnknown))
      : Promise.resolve();
  }
  private async ownedWorkflow<T>(work: () => Promise<T>): Promise<T> {
    return this.repositoryOwners.run(this.context(), work);
  }
  cancelTask(id: string): void {
    const active = this.active.get(id);
    if (!active || !this.valid(active.context))
      throw new Error("任务没有正在运行的本次请求。");
    active.controller.abort();
    this.set({ error: "已请求停止连接；供应商是否取消仍须核对。" });
  }
  allTasks(): { projectId: string; task: CreationTask }[] {
    return (
      this.state.snapshot?.projects.flatMap((p) =>
        p.tasks.map((task) => ({ projectId: p.id, task })),
      ) ?? []
    );
  }
}
