import { createBrowserBackend } from "../../domain/browserSession.ts";
import type {
  BrowserBackend,
  BrowserProviderId,
} from "../../domain/browserContracts.ts";

export { nativeBrowserRuntime } from "./browserRuntime.ts";
export { inspectEgoLite, openEgoLite } from "./egoLiteRuntime.ts";

import { nativeBrowserRuntime } from "./browserRuntime.ts";

export function createNativeBrowserBackend(options?: {
  provider?: BrowserProviderId;
}): BrowserBackend {
  return createBrowserBackend(nativeBrowserRuntime, options);
}
