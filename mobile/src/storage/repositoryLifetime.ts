/** Owns one repository's queue and optional private connection. */
export class RepositoryLifetime {
  private pending: Promise<unknown> = Promise.resolve();
  private disposal?: Promise<void>;
  private closed = false;
  private readonly close?: () => Promise<void>;
  constructor(close?: () => Promise<void>) {
    this.close = close;
  }

  assertOpen(): void {
    if (this.closed) throw new Error("Repository disposed; open a new owner.");
  }
  run<T>(work: () => Promise<T>): Promise<T> {
    if (this.disposal)
      return Promise.reject(
        new Error("Repository disposed; open a new owner."),
      );
    const operation = this.pending.then(work);
    this.pending = operation.catch(() => undefined);
    return operation;
  }
  dispose(): Promise<void> {
    return (this.disposal ??= this.pending.then(async () => {
      this.closed = true;
      await this.close?.();
    }));
  }
}

/** Failure cleanup must not replace the schema/constructor error that caused it. */
export async function closeAfterFailure<T>(
  close: () => Promise<void>,
  work: () => Promise<T>,
): Promise<T> {
  try {
    return await work();
  } catch (error) {
    try {
      await close();
    } catch {
      /* Cleanup cannot replace the schema or constructor failure. */
    }
    throw error;
  }
}
