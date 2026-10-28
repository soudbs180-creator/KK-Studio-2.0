import type {
  TaskPort,
  AssetPort,
  ProviderPort,
  CreationTask,
  CapabilityManifest,
  BusinessCapabilityManifest,
  CapabilityProviderRequest,
  CapabilityPermission,
} from "../../packages/creation-contracts/index.ts";

declare const task: CreationTask;
declare const tasks: TaskPort;
declare const assets: AssetPort;
declare const providers: ProviderPort;
declare const manifest: BusinessCapabilityManifest;

const legacy: CapabilityManifest = {
  modalities: ["image"],
  operations: ["inpaint"],
  async: true,
};
void legacy;
void manifest.platforms;
tasks.submit("project", task).then((result) => {
  const unchanged: CreationTask = result;
  return unchanged;
});
const unsubscribe: () => void = tasks.subscribe("task", (next) => {
  const status: CreationTask["status"] = next.status;
  void status;
});
unsubscribe();
void tasks.cancel("task");
void tasks.retry("project", "task", 0);
void tasks.recover("project");
void assets.read("asset");
void assets.write({
  source: "data:image/png;base64,fixture",
  parentId: "parent",
  sourceJobId: "task",
  model: "image-model",
  promptHash: "hash",
});
const request: CapabilityProviderRequest = {
  prompt: "inpaint",
  model: "image-model",
  attachments: [],
  requestedOutputs: 1,
  idempotencyKey: "original-key",
};
void providers
  .resolve({
    capabilityId: "image.inpaint",
    modelTraits: ["image-edit-mask"],
    resources: [],
    protocolFamily: "chat-completions",
  })
  .then(async (resolved) => {
    if (!resolved) return;
    const job = await providers.submit(resolved, request);
    await providers.getStatus(resolved, job.providerJobId);
    await providers.listResults(resolved, job.providerJobId);
    await providers.cancel(resolved, job.providerJobId);
  });

// @ts-expect-error Nine existing task states must not accept a new terminal label.
const newState: CreationTask["status"] = "completed";
void newState;
// @ts-expect-error Tasks must retain their durable identity, outputs and submission fields.
void tasks.submit("project", { status: "running" });
// @ts-expect-error Original bytes use the current source string, not a DOM Blob.
void assets.write({ source: new Uint8Array([1]) });
// @ts-expect-error Provider submission cannot lose the captured idempotency identity.
void providers.submit({}, { prompt: "missing identity" });
// @ts-expect-error ProviderPort requires real resolution, submission, query and cancellation surfaces.
const incomplete: ProviderPort = {};
void incomplete;
// @ts-expect-error The pure fixture has no DOM ambient signal type.
type HostSignal = AbortSignal;

export type { HostSignal };

// @ts-expect-error Undeclared filesystem powers must also be rejected by the public type.
const invalidPermission: CapabilityPermission = "filesystem:write";
void invalidPermission;
