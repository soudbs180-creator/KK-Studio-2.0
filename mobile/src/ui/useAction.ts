import { useRef, useState } from "react";
import { useApplication } from "../application/AppProvider.tsx";
export function useAction() {
  const { app } = useApplication();
  const [busy, setBusy] = useState(false),
    running = useRef(false);
  async function run(action: () => Promise<unknown>) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    app.clearError();
    try {
      await action();
    } catch (error) {
      app.report(error);
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return { busy, run };
}
