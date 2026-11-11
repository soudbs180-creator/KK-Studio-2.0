import {
  ChannelRegistry,
  type ChannelRegistration,
} from "../../src/features/ai-gateway/channels/registry.ts";
import {
  normalizeUnknownFailure,
  type ChannelAdapter,
} from "../../src/features/ai-gateway/channels/adapter.ts";
import { Scheduler } from "../../src/features/ai-gateway/scheduler.ts";

export function createTestChannelRegistry(
  registrations: ChannelRegistration[],
) {
  const registry = new ChannelRegistry();
  for (const adapter of new Set(registrations.map((r) => r.adapter)))
    registry.registerAdapter(adapter);
  registry.replace({
    registrations,
    states: new Map(
      registrations.map((r) => [
        r.id,
        r.enabled ? ("active" as const) : ("disabled" as const),
      ]),
    ),
  });
  return registry;
}
export function gatewayFixture(
  options: { failPrimary?: boolean; asyncPrimary?: boolean } = {},
) {
  const submissions: string[] = [],
    polls: string[] = [];
  const adapter: ChannelAdapter = {
    provider: "fixture",
    kind: "openai_compatible",
    resolveModel: (context, model) => context.modelMapping[model],
    async submit(context) {
      submissions.push(context.channelId);
      if (options.failPrimary && context.channelId === "primary")
        throw Object.assign(new Error("limited"), {
          normalized: {
            errorClass: "RATE_LIMITED",
            httpStatus: 429,
            retryable: true,
            cooldownMs: 60000,
          },
        });
      return options.asyncPrimary
        ? { kind: "submitted", providerJobId: "accepted-job" }
        : { kind: "text", text: "actual adapter response" };
    },
    async poll(context) {
      polls.push(context.channelId);
      throw new Error("poll unavailable");
    },
    async probe() {
      return { ok: true };
    },
    normalizeError: normalizeUnknownFailure,
  };
  const registrations: ChannelRegistration[] = ["primary", "secondary"].map(
    (id, index) => ({
      id,
      adapter,
      kind: "openai_compatible",
      enabled: true,
      priority: 100 - index * 50,
      weight: 1,
      baseUrl: "https://fixture.invalid/v1",
      capabilities: { modalities: ["text"], operations: ["chat"], async: true },
      modelMapping: { model: "upstream" },
      timeoutMs: 1000,
    }),
  );
  return {
    scheduler: new Scheduler(createTestChannelRegistry(registrations), {
      random: () => 0,
      now: () => 1700000000000,
    }),
    submissions,
    polls,
    request: {
      model: "model",
      operation: "chat" as const,
      input: { model: "model", prompt: "test", attachments: [] },
      idempotencyKey: "fixture",
      resolveSecret: async () => undefined,
    },
  };
}
