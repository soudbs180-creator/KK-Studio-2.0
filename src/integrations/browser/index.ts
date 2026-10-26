import { createBrowserBackend } from "../../features/browser/browserBackend.ts";
import type {
  BrowserBackend,
  BrowserProviderId,
} from "../../features/browser/browserTypes.ts";

export { nativeBrowserRuntime } from "./browserRuntime.ts";
export { inspectEgoLite, openEgoLite } from "./egoLiteRuntime.ts";

import { nativeBrowserRuntime } from "./browserRuntime.ts";

export function createNativeBrowserBackend(options?: {
  provider?: BrowserProviderId;
}): BrowserBackend {
  return createBrowserBackend(nativeBrowserRuntime, options);
}
