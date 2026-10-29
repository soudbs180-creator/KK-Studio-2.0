import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";
import {
  type BrowserInspection,
  type BrowserOpenResult,
  type BrowserProviderId,
  type BrowserRuntime,
} from "../../domain/browserContracts.ts";
import { inspectEgoLite, openEgoLite } from "./egoLiteRuntime.ts";

const externalInspectionSchema = z.object({
  provider: z.enum(["edge", "chrome"]),
  available: z.boolean(),
  executable: z.string().nullable().optional(),
  message: z.string(),
});

const externalOpenSchema = z.object({
  provider: z.enum(["edge", "chrome"]),
  url: z.string(),
  started: z.boolean(),
  pid: z.number().int().positive().nullable().optional(),
  message: z.string(),
});

async function inspectExternal(
  provider: "edge" | "chrome",
): Promise<BrowserInspection> {
  const result = externalInspectionSchema.parse(
    await invoke("browser_external_status", { provider }),
  );
  return {
    provider,
    available: result.available,
    message: result.message,
  };
}

async function openExternal(
  provider: "edge" | "chrome",
  url: string,
  authorized: boolean,
): Promise<BrowserOpenResult> {
  const result = externalOpenSchema.parse(
    await invoke("browser_external_open", {
      request: { provider, url, authorized },
    }),
  );
  return {
    provider,
    url: result.url,
    started: result.started,
    pid: result.pid ?? undefined,
    message: result.message,
  };
}

export const nativeBrowserRuntime: BrowserRuntime = {
  inspect(provider: BrowserProviderId) {
    if (provider === "internal") {
      return Promise.resolve({
        provider,
        available: true,
        message: "KK Studio 内置浏览器由当前窗口管理。",
      });
    }
    if (provider === "ego-lite") return inspectEgoLite();
    return inspectExternal(provider);
  },
  open(provider: BrowserProviderId, url: string, authorized: boolean) {
    if (provider === "internal") {
      return Promise.resolve({
        provider,
        url,
        started: true,
        message: "已交给 KK Studio 内置浏览器；当前窗口仍由 KK Studio 管理。",
      });
    }
    if (provider === "ego-lite") return openEgoLite(url, authorized);
    return openExternal(provider, url, authorized);
  },
};
