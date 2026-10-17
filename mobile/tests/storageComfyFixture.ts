import { DatabaseSync } from "node:sqlite";
import { createHash, randomUUID } from "node:crypto";
import type { CreationTask } from "@kk-studio/creation-contracts";
import type { MobileExecutionReceipt } from "../src/core/mobileModel.ts";
import { MobileRepository } from "../src/storage/repository.ts";
import { SqliteSnapshotBackend } from "../src/storage/sqliteBackend.ts";

export const submissionId = "11111111-1111-4111-8111-111111111111";
export const actualPromptId = "22222222-2222-4222-8222-222222222222";
export function comfyFixture(
  options: {
    baseUrl?: string;
    allowLoopbackHttp?: boolean;
    databasePath?: string;
  } = {},
) {
  const baseUrl = options.baseUrl ?? "https://comfy.example";
  const db = new DatabaseSync(options.databasePath ?? ":memory:");
  db.exec(
    "CREATE TABLE IF NOT EXISTS mobile_snapshots(account TEXT PRIMARY KEY NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL)",
  );
  const backend = new SqliteSnapshotBackend(
    {
      async execAsync(sql) {
        db.exec(sql);
      },
      async getFirstAsync<T>(sql: string, ...parameters: (string | number)[]) {
        return (db.prepare(sql).get(...parameters) ?? null) as T | null;
      },
      async runAsync(sql, ...parameters) {
        return { changes: Number(db.prepare(sql).run(...parameters).changes) };
      },
    },
    { allowLoopbackHttp: options.allowLoopbackHttp },
  );
  const create = (allowLoopbackHttp = options.allowLoopbackHttp) =>
    new MobileRepository({
      accountId: "alice",
      allowLoopbackHttp,
      backend,
      originalStore: {
        async read() {
          throw new Error("No original expected");
        },
        async write() {
          throw new Error("Unexpected original write");
        },
        async remove() {
          throw new Error("Unexpected original deletion");
        },
      },
      hash: async (bytes) => createHash("sha256").update(bytes).digest("hex"),
      id: randomUUID,
      now: () => 100,
    });
  const task = (): CreationTask => ({
    id: submissionId,
    idempotencyKey: submissionId,
    kind: "image",
    prompt: "Captured API workflow",
    model: "Comfy workflow",
    status: "queued",
    submissionState: "intent",
    createdAt: 100,
    updatedAt: 100,
    attachments: [],
    attempt: 1,
    requestedOutputs: 1,
    completedOutputs: 0,
    providerConnectionId: "comfy",
    providerCredentialRef: "vault-only",
    providerBaseUrl: baseUrl,
    privacyMode: "byok_local",
    outputs: [
      { index: 0, status: "waiting", model: "Comfy workflow", createdAt: 100 },
    ],
  });
  const receipt = (projectId: string) => ({
    taskId: submissionId,
    connectionId: "comfy",
    protocol: "comfyui",
    comfy: {
      identity: {
        submissionId,
        projectId,
        connectionId: "comfy",
        baseUrl,
        workflowRevision: 7,
        workflow: {
          "1": {
            class_type: "SaveImage",
            inputs: { filename_prefix: "Captured" },
            _meta: { title: "Output" },
          },
        },
        capturedAt: 100,
      },
      requestedOutputs: 1,
      promptId: submissionId,
      promptIdConfirmed: false,
    },
  });
  async function ready() {
    const repo = create();
    await repo.initialize();
    await repo.saveConnections([
      {
        id: "comfy",
        name: "Comfy",
        provider: "ComfyUI",
        protocol: "comfyui",
        baseUrl,
        credentialRef: "vault-only",
        capabilities: { text: false, image: true, maxOutputs: 1 },
      } as Parameters<MobileRepository["saveConnections"]>[0][number],
    ]);
    const state = await repo.create("Workflow");
    const project = state.projects[0];
    await repo.appendTask(project.id, task(), project.revision);
    return { repo, projectId: project.id };
  }
  return {
    db,
    create,
    task,
    receipt,
    ready,
    raw: () =>
      (
        db
          .prepare("SELECT payload FROM mobile_snapshots WHERE account=?")
          .get("alice") as { payload: string }
      ).payload,
    close: () => db.close(),
  };
}
export function asReceipt(
  value: ReturnType<ReturnType<typeof comfyFixture>["receipt"]>,
): MobileExecutionReceipt {
  return value as unknown as MobileExecutionReceipt;
}
