import { BROWSER_STORAGE_KEYS } from "../../runtime/storage-contract.ts";
import { isRoutingMode, type RoutingMode } from "../../domain/routingGroups.ts";

export interface GatewayPreferences {
  mode: RoutingMode;
  maskOutbound: boolean;
  cursor: number;
}

const KEY = BROWSER_STORAGE_KEYS.gatewayRouting;

function browserStorage(): Storage | undefined {
  try {
    if (typeof localStorage === "undefined") return undefined;
    return localStorage;
  } catch {
    return undefined;
  }
}

export function readGatewayPreferences(): GatewayPreferences | undefined {
  const storage = browserStorage();
  if (!storage) return undefined;
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<GatewayPreferences>;
    if (!parsed.mode || !isRoutingMode(parsed.mode)) return undefined;
    return {
      mode: parsed.mode,
      maskOutbound: parsed.maskOutbound !== false,
      cursor: Number.isFinite(parsed.cursor) ? Number(parsed.cursor) : 0,
    };
  } catch {
    return undefined;
  }
}

export function writeGatewayPreferences(next: GatewayPreferences): void {
  const storage = browserStorage();
  if (!storage) return;
  try {
    storage.setItem(KEY, JSON.stringify(next));
  } catch (error) {
    void error;
    return;
  }
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("kk:gateway-preferences"));
}

export function bumpGatewayCursor(): void {
  const current = readGatewayPreferences();
  if (!current) return;
  writeGatewayPreferences({ ...current, cursor: current.cursor + 1 });
}
