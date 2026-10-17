import type { AccountContext } from "./types.ts";

type ActiveJob = {
  context: AccountContext;
  projectId: string;
  controller: AbortController;
};
export class ActivationSuperseded extends Error {
  constructor() {
    super("存储初始化已被新的读取替代。");
  }
}

class ContextJobs extends Map<string, ActiveJob> {
  private readonly changed: (ctx: AccountContext) => void;
  private readonly accept: (ctx: AccountContext) => void;
  constructor(
    changed: (ctx: AccountContext) => void,
    accept: (ctx: AccountContext) => void,
  ) {
    super();
    this.changed = changed;
    this.accept = accept;
  }
  override set(key: string, value: ActiveJob): this {
    this.accept(value.context);
    const previous = this.get(key);
    super.set(key, value);
    if (previous) this.changed(previous.context);
    this.changed(value.context);
    return this;
  }
  override delete(key: string): boolean {
    const previous = this.get(key),
      removed = super.delete(key);
    if (previous) this.changed(previous.context);
    return removed;
  }
  override clear(): void {
    const contexts = new Set([...this.values()].map((job) => job.context));
    super.clear();
    contexts.forEach(this.changed);
  }
}

/** Closing an old realm waits its admitted workflows and SQL without blocking logout on a provider. */
export class RepositoryOwners {
  readonly active: Map<string, ActiveJob>;
  private readonly leases = new WeakMap<AccountContext, number>();
  private readonly retiring = new WeakMap<AccountContext, Promise<void>>();
  private readonly waiters = new WeakMap<AccountContext, Set<() => void>>();
  private generation = 0;
  constructor() {
    this.active = new ContextJobs(
      (ctx) => this.progress(ctx),
      (ctx) => {
        if (this.retiring.has(ctx))
          throw new Error("会话存储已释放，不能启动新任务。");
      },
    );
  }
  activation(checkIdentity: () => void) {
    const generation = ++this.generation;
    return {
      current: () => generation === this.generation,
      assert: () => {
        checkIdentity();
        if (generation !== this.generation) throw new ActivationSuperseded();
      },
    };
  }
  private busy(ctx: AccountContext): boolean {
    return (
      (this.leases.get(ctx) ?? 0) > 0 ||
      [...this.active.values()].some((job) => job.context === ctx)
    );
  }
  private progress(ctx: AccountContext): void {
    if (this.busy(ctx)) return;
    this.waiters.get(ctx)?.forEach((resolve) => resolve());
    this.waiters.delete(ctx);
  }
  async run<T>(ctx: AccountContext, work: () => Promise<T>): Promise<T> {
    if (this.retiring.has(ctx))
      throw new Error("会话存储已释放，不能启动新任务。");
    this.leases.set(ctx, (this.leases.get(ctx) ?? 0) + 1);
    try {
      return await work();
    } finally {
      this.leases.set(ctx, this.leases.get(ctx)! - 1);
      this.progress(ctx);
    }
  }
  private idle(ctx: AccountContext): Promise<void> {
    if (!this.busy(ctx)) return Promise.resolve();
    return new Promise((resolve) => {
      const waiting = this.waiters.get(ctx) ?? new Set();
      waiting.add(resolve);
      this.waiters.set(ctx, waiting);
    });
  }
  retire(ctx: AccountContext, report: (error: unknown) => void): Promise<void> {
    const busy = this.busy(ctx);
    let closing = this.retiring.get(ctx);
    if (!closing) {
      closing = (async () => {
        await this.idle(ctx);
        let pending: Promise<unknown>;
        do {
          pending = ctx.pending;
          await pending;
        } while (ctx.pending !== pending);
        await ctx.repo.dispose();
      })();
      this.retiring.set(ctx, closing);
    }
    if (!busy) return closing;
    void closing.catch(report);
    return Promise.resolve();
  }
}
