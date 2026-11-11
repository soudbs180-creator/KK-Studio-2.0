import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";
import type {
  BrowserInspection,
  BrowserOpenResult,
} from "../../domain/browserContracts.ts";

const statusSchema = z.object({
  available: z.boolean(),
  command: z.string().nullable().optional(),
  version: z.string().nullable().optional(),
  message: z.string(),
});

const openSchema = z.object({
  provider: z.literal("ego-lite"),
  url: z.string(),
  started: z.boolean(),
  pid: z.number().int().positive().nullable().optional(),
  spaceName: z.string(),
  message: z.string(),
});

export async function inspectEgoLite(): Promise<BrowserInspection> {
  const result = statusSchema.parse(await invoke("ego_browser_status"));
  return {
    provider: "ego-lite",
    available: result.available,
    version: result.version ?? undefined,
    message: result.message,
  };
}

export async function openEgoLite(
  url: string,
  authorized: boolean,
): Promise<BrowserOpenResult> {
  const result = openSchema.parse(
    await invoke("ego_browser_open", {
      request: {
        url,
        authorized,
        spaceName: "KK Studio browser task",
      },
    }),
  );
  return {
    provider: result.provider,
    url: result.url,
    started: result.started,
    pid: result.pid ?? undefined,
    message: result.message,
    spaceName: result.spaceName,
  };
}
