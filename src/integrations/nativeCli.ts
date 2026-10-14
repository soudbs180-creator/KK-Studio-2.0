import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";

export const cliToolSchema = z.enum(["codex", "gemini", "codebuddy"]);
export type CliTool = z.infer<typeof cliToolSchema>;
export const cliOperationSchema = z.object({
  operationId: z.string().min(1).max(160),
  tool: cliToolSchema,
  action: z.enum(["install", "login"]),
  phase: z.enum([
    "running",
    "terminal-opened",
    "completed",
    "failed",
    "cancelled",
  ]),
  pid: z.number().int().positive().nullable().optional(),
  message: z.string().max(2000),
});
export type CliOperation = z.infer<typeof cliOperationSchema>;
const inspectionSchema = z.object({
  tool: cliToolSchema,
  installed: z.boolean(),
  complete: z.boolean(),
  version: z.string().max(160).nullable().optional(),
  nodeAvailable: z.boolean(),
  npmAvailable: z.boolean(),
  cliPath: z.string().max(4000).nullable().optional(),
  message: z.string().max(2000),
});
export type CliInspection = z.infer<typeof inspectionSchema>;
const bridgeSchema = z.object({
  owned: z.boolean(),
  running: z.boolean(),
  healthy: z.boolean(),
  endpoint: z.string().nullable().optional(),
  pid: z.number().int().positive().nullable().optional(),
  message: z.string().max(2000),
});
export type CliBridge = z.infer<typeof bridgeSchema>;
export const cliPending = (operation?: CliOperation) =>
  operation?.phase === "running" || operation?.phase === "terminal-opened";
export const inspectCli = async (tool: CliTool) =>
  inspectionSchema.parse(await invoke("cli_inspect", { tool }));
export const beginCli = async (tool: CliTool, action: "install" | "login") =>
  cliOperationSchema.parse(await invoke("cli_begin", { tool, action }));
export const readCliOperation = async (operationId: string) =>
  cliOperationSchema.parse(
    await invoke("cli_operation_state", { operationId }),
  );
export const cancelCli = async (operationId: string) =>
  cliOperationSchema.parse(await invoke("cli_cancel", { operationId }));
export const readCliBridge = async () =>
  bridgeSchema.parse(await invoke("cli_bridge_state"));
export const startCliBridge = async (port: number) =>
  bridgeSchema.parse(await invoke("cli_bridge_start", { port }));
export const stopCliBridge = async () =>
  bridgeSchema.parse(await invoke("cli_bridge_stop"));
