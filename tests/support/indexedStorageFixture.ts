/** In-memory IndexedDB transport with transactional staging and fault injection. */
export function createIndexedStorageFixture(
  initial: Record<string, unknown>,
  failKey?: string,
) {
  const records = new Map(Object.entries(structuredClone(initial)));
  const writes: string[] = [];
  const local = new Map<string, string>();
  const session = new Map<string, string>();
  let beforeWrite: (() => void) | undefined;
  const storage = (values: Map<string, string>) => ({
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  const factory = {
    open: () => {
      const open = {
        onsuccess: undefined as (() => void) | undefined,
        result: {
          close: () => {},
          transaction: (_name: string, mode: string) => {
            if (mode === "readwrite") {
              beforeWrite?.();
              beforeWrite = undefined;
            }
            const staged = new Map(records);
            let pending = 0,
              aborted = false,
              scheduled = false;
            const transaction = {
              oncomplete: undefined as (() => void) | undefined,
              onabort: undefined as (() => void) | undefined,
              onerror: undefined as (() => void) | undefined,
              error: null,
              abort: () => {
                aborted = true;
                queueMicrotask(() => transaction.onabort?.());
              },
              objectStore: () => ({
                get: (key: string) => {
                  pending++;
                  const request = {
                    result: undefined as unknown,
                    onsuccess: undefined as (() => void) | undefined,
                  };
                  queueMicrotask(() => {
                    request.result = structuredClone(staged.get(key));
                    request.onsuccess?.();
                    if (!--pending && !scheduled && mode === "readwrite") {
                      scheduled = true;
                      queueMicrotask(() => {
                        if (aborted) return;
                        records.clear();
                        for (const [key, value] of staged)
                          records.set(key, value);
                        transaction.oncomplete?.();
                      });
                    }
                  });
                  return request;
                },
                put: (value: unknown, key: string) => {
                  if (key === failKey)
                    throw new Error(`simulated write failure: ${key}`);
                  writes.push(key);
                  staged.set(key, structuredClone(value));
                },
                add: (value: unknown, key: string) => {
                  if (key === failKey || staged.has(key))
                    throw new Error(`immutable archive collision: ${key}`);
                  writes.push(key);
                  staged.set(key, structuredClone(value));
                },
              }),
            };
            return transaction;
          },
        },
      };
      queueMicrotask(() => open.onsuccess?.());
      return open;
    },
  } as unknown as IDBFactory;
  return {
    records,
    writes,
    local,
    session,
    factory,
    window: {
      localStorage: storage(local),
      sessionStorage: storage(session),
    } as unknown as Window & typeof globalThis,
    race: (action: () => void) => {
      beforeWrite = action;
    },
  };
}
