export const BROWSER_PROVIDER_IDS = [
  "internal",
  "edge",
  "chrome",
  "ego-lite",
] as const;

export type BrowserProviderId = (typeof BROWSER_PROVIDER_IDS)[number];
export type BrowserProviderKind = "internal" | "external";
export type BrowserAutomation = "native" | "manual-only" | "agent";
export type BrowserPhase =
  "idle" | "ready" | "opening" | "running" | "handoff" | "error";
export type BrowserHandoffKind =
  | "login"
  | "verification"
  | "captcha"
  | "permission"
  | "security-warning"
  | "sensitive-action";

export interface BrowserProvider {
  id: BrowserProviderId;
  label: string;
  kind: BrowserProviderKind;
  automation: BrowserAutomation;
  requiresAuthorization: boolean;
  description: string;
}

export interface BrowserInspection {
  provider: BrowserProviderId;
  available: boolean;
  version?: string;
  message: string;
}

export interface BrowserOpenResult {
  provider: BrowserProviderId;
  url: string;
  started: boolean;
  message: string;
  pid?: number;
  spaceName?: string;
}

export interface BrowserRuntime {
  inspect(provider: BrowserProviderId): Promise<BrowserInspection>;
  open(
    provider: BrowserProviderId,
    url: string,
    authorized: boolean,
  ): Promise<BrowserOpenResult>;
}

export interface BrowserApprovalRequest {
  requestId: string;
  method: "browser_handoff";
  reason: string;
  permissions: {
    provider: BrowserProviderId;
    handoffKind: BrowserHandoffKind;
  };
}

export interface BrowserHandoff {
  request: BrowserApprovalRequest;
  kind: BrowserHandoffKind;
  reason: string;
  confirmed: boolean;
}

export interface BrowserStatus {
  provider: BrowserProviderId;
  phase: BrowserPhase;
  automation: BrowserAutomation;
  available: boolean | null;
  authorized: boolean;
  message: string;
  url: string | null;
  handoff: BrowserHandoff | null;
}

export interface BrowserBackend {
  getState(): BrowserStatus;
  select(provider: BrowserProviderId): void;
  authorize(): void;
  open(url: string): Promise<BrowserStatus>;
  requestHandoff(
    kind: BrowserHandoffKind,
    reason: string,
  ): BrowserApprovalRequest;
  confirmHandoff(): void;
  declineHandoff(): void;
  resume(): void;
}
