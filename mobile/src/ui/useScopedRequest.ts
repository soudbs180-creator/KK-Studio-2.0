import { useEffect, useRef, useState } from "react";
import { useApplication } from "../application/AppProvider.tsx";
/** Scope every result to its full captured session, including same-realm re-login. */
export function useScopedRequest() {
  const { app, state } = useApplication();
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      active.current?.abort();
      active.current = null;
    },
    [state.accountId],
  );
  async function run<T>(
    operation: (signal: AbortSignal) => Promise<T>,
    receive?: (value: T) => void,
  ) {
    if (active.current) return;
    let ctx: ReturnType<typeof app.context>;
    try {
      ctx = app.context();
    } catch (error) {
      app.report(error);
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    app.clearError();
    try {
      const value = await operation(controller.signal);
      if (app.valid(ctx) && !controller.signal.aborted) receive?.(value);
    } catch (error) {
      if (app.valid(ctx)) app.report(error);
    } finally {
      if (active.current === controller) {
        active.current = null;
        setBusy(false);
      }
    }
  }
  return { busy, run, stop: () => active.current?.abort() };
}
