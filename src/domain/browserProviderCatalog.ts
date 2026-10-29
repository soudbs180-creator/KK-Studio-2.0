import {
  BROWSER_PROVIDER_IDS,
  type BrowserProvider,
} from "./browserContracts.ts";

const PROVIDERS: readonly BrowserProvider[] = [
  {
    id: "internal",
    label: "KK Studio 内置浏览器",
    kind: "internal",
    automation: "native",
    requiresAuthorization: false,
    description: "继续使用当前 KK Studio 窗口内的 WebView2 浏览器。",
  },
  {
    id: "edge",
    label: "Microsoft Edge",
    kind: "external",
    automation: "manual-only",
    requiresAuthorization: true,
    description: "在系统 Edge 中打开；未连接自动化桥接时由用户手动操作。",
  },
  {
    id: "chrome",
    label: "Google Chrome",
    kind: "external",
    automation: "manual-only",
    requiresAuthorization: true,
    description: "在系统 Chrome 中打开；未连接自动化桥接时由用户手动操作。",
  },
  {
    id: "ego-lite",
    label: "ego lite",
    kind: "external",
    automation: "agent",
    requiresAuthorization: true,
    description: "通过本地 ego-browser Agent Space 自动化，并保留用户接管。",
  },
] as const;

export { BROWSER_PROVIDER_IDS };

export function listBrowserProviders(): readonly BrowserProvider[] {
  return PROVIDERS;
}

export function getBrowserProvider(id: (typeof BROWSER_PROVIDER_IDS)[number]) {
  return PROVIDERS.find((provider) => provider.id === id)!;
}
