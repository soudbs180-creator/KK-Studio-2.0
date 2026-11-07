import type { DualStickinessManager } from "../../domain/gatewayStickiness.ts";
const managers = new Set<WeakRef<DualStickinessManager>>();
export function registerGatewayAffinity(manager: DualStickinessManager): void {
  managers.add(new WeakRef(manager));
}
export function resetGatewayAffinity(sessionId: string): void {
  for (const ref of managers) {
    const manager = ref.deref();
    if (manager) manager.forget(sessionId);
    else managers.delete(ref);
  }
}
