// Generated from src/domain/configTools.ts by scripts/agent/sync-canvas-schema.mjs.
import { z } from "zod";

export const configToolNames = [
  "kk_config_get",
  "kk_config_propose",
  "kk_config_apply",
  "kk_credential_request",
  "kk_connection_test",
  "kk_config_rollback",
  "kk_capability_status",
] as const;
export type ConfigToolName = (typeof configToolNames)[number];
const id = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[A-Za-z0-9_-]+$/);
const version = z.string().regex(/^[a-f0-9]{16}$/);
const connectionId = z.string().min(1).max(120);
const draft = z.record(z.string(), z.unknown());
export const configConnectionFields = [
  "id",
  "provider",
  "kind",
  "channel",
  "priority",
  "displayName",
  "baseUrl",
  "credentialRef",
  "model",
  "protocol",
  "authMode",
  "capabilities",
  "state",
  "concurrencyLimit",
  "activeJobs",
  "cooldownUntil",
  "quotaPolicyId",
  "lastHealthCheckAt",
  "healthRevision",
  "verificationStatus",
  "lastSuccessfulGenerationAt",
  "activeLeaseIds",
] as const;
const capabilityFields = [
  "modalities",
  "operations",
  "maxReferences",
  "maxOutputs",
  "maxResolution",
  "async",
  "estimatedLatencyClass",
];
const resultFields: Record<ConfigToolName, readonly string[]> = {
  kk_config_get: ["version", "connections", "capabilities", "health", "budget"],
  kk_config_propose: ["valid", "errors", "version", "diff", "permission"],
  kk_config_apply: [
    "status",
    "code",
    "version",
    "diff",
    "snapshotId",
    "permission",
    "message",
  ],
  kk_credential_request: ["status"],
  kk_connection_test: ["connectionId", "ok", "modelCount", "code"],
  kk_config_rollback: [
    "status",
    "code",
    "version",
    "diff",
    "snapshotId",
    "permission",
    "message",
  ],
  kk_capability_status: ["capabilities"],
};

function onlyFields(value: unknown, allowed: readonly string[]): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  if (Object.keys(value).some((key) => !allowed.includes(key)))
    throw new Error("CONFIG_INVALID_FIELDS");
}
export const configToolInputSchemas = {
  kk_config_get: z.object({}).strict(),
  kk_config_propose: z.object({ draft }).strict(),
  kk_config_apply: z.object({ draft, expectedVersion: version }).strict(),
  kk_credential_request: z.object({ connectionId }).strict(),
  kk_connection_test: z.object({ connectionId }).strict(),
  kk_config_rollback: z
    .object({ snapshotId: id, expectedVersion: version })
    .strict(),
  kk_capability_status: z.object({}).strict(),
};
export const configToolDescriptions: Record<ConfigToolName, string> = {
  kk_config_get:
    "L0：读取连接、能力和保存的健康状态，不读取或返回密钥。返回 version 用于防止覆盖并发修改。",
  kk_config_propose:
    "L0：校验不含密钥的 kk-provider-config v1 draft，返回 valid、差异和当前 version，不落盘。相同 id 替换，未提供的连接保留。新端点省略 credentialRef，由宿主生成新引用；不能重定向旧凭据。",
  kk_config_apply:
    "L1：用 propose/get 的 expectedVersion 应用 draft，写前自动保存无密钥快照，返回 snapshotId 和‘已修改，可撤销’。不能删除数据、切换主 Agent 或改变权限。",
  kk_credential_request:
    "请求宿主安全密钥输入；只传 connectionId，只返回 status=provided|cancelled。永远不要提供、读取或索要密钥值。",
  kk_connection_test:
    "L0：按已保存连接列模型做最小连通探测，不触发付费生成，不返回上游原始内容或密钥。",
  kk_config_rollback:
    "L1：用当前 expectedVersion 回滚至 snapshotId；回滚前也保存当前无密钥快照。",
  kk_capability_status:
    "L0：读取注册能力的配置适配器、候选和选择原因；未知的实际执行和健康状态明确标记 unknown，不触发生成。",
};

export function isConfigToolName(name: unknown): name is ConfigToolName {
  return (
    typeof name === "string" &&
    (configToolNames as readonly string[]).includes(name)
  );
}

/** Reject before logging/transport; errors never include rejected values. */
export function assertConfigPayloadSafe(value: unknown): void {
  const text = JSON.stringify(value);
  if (
    !text ||
    text.length > 512_000 ||
    /(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password)\s*[:=]|sk-[A-Za-z0-9_-]{12,}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]+|-----BEGIN [A-Z ]+ PRIVATE KEY-----|(?:Bearer|Basic)\s+[A-Za-z0-9+/._-]{16,}/i.test(
      text,
    )
  )
    throw new Error("CONFIG_SECRET_OR_INVALID");
  function visit(item: unknown): void {
    if (!item || typeof item !== "object") return;
    for (const [key, child] of Object.entries(item)) {
      if (
        /^(?:key|api[_-]?keys?|private[_-]?key|credentials?|secret|password|token|access[_-]?token|refresh[_-]?token|session[_-]?token|authorization|client[_-]?secret|__proto__|prototype|constructor)$/i.test(
          key,
        )
      )
        throw new Error("CONFIG_SECRET_OR_INVALID");
      if (typeof child === "string" && /^https?:\/\//i.test(child)) {
        const url = new URL(child);
        if (url.username || url.password || url.search || url.hash)
          throw new Error("CONFIG_SECRET_OR_INVALID");
      }
      visit(child);
    }
  }
  visit(value);
}

export function parseConfigToolInput(
  name: ConfigToolName,
  input: unknown,
): Record<string, unknown> {
  assertConfigPayloadSafe(input);
  const parsed = configToolInputSchemas[name].safeParse(input);
  if (!parsed.success) throw new Error("CONFIG_INVALID_INPUT");
  if (name === "kk_config_propose" || name === "kk_config_apply") {
    const draft = (parsed.data as { draft: Record<string, unknown> }).draft;
    onlyFields(draft, ["version", "exportedAt", "source", "connections"]);
    if (Array.isArray(draft.connections))
      for (const item of draft.connections) {
        onlyFields(item, configConnectionFields);
        if (item && typeof item === "object")
          onlyFields(item.capabilities, capabilityFields);
      }
  }
  return parsed.data;
}

export function safeConfigToolResult(
  name: ConfigToolName,
  value: unknown,
): Record<string, unknown> {
  assertConfigPayloadSafe(value);
  if (name === "kk_credential_request") {
    const parsed = z
      .object({ status: z.enum(["provided", "cancelled"]) })
      .strict()
      .safeParse(value);
    if (!parsed.success) throw new Error("CONFIG_INVALID_RESULT");
    return parsed.data;
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("CONFIG_INVALID_RESULT");
  onlyFields(value, resultFields[name]);
  return value as Record<string, unknown>;
}

export const DEFAULT_CONFIG_BUDGET = { limitUsd: 0, spentUsd: 0 } as const;
export function configPermission(
  action: string,
  budget: { limitUsd: number; spentUsd: number } = DEFAULT_CONFIG_BUDGET,
  estimatedUsd?: number,
): "L0" | "L1" | "L2" | "forbidden" {
  if (["read", "connection.test"].includes(action)) return "L0";
  if (
    [
      "config.write",
      "model.route",
      "canvas.edit",
      "prompt.edit",
      "image.reverse_prompt",
    ].includes(action)
  )
    return "L1";
  if (
    [
      "model.download",
      "data.delete",
      "project.delete",
      "external.send",
      "agent.switch",
    ].includes(action)
  )
    return "L2";
  if (action === "generation.paid") {
    const valid = [budget.limitUsd, budget.spentUsd, estimatedUsd].every(
      (value) =>
        typeof value === "number" && Number.isFinite(value) && value >= 0,
    );
    const tolerance =
      Number.EPSILON *
      Math.max(1, budget.limitUsd, budget.spentUsd, estimatedUsd ?? 0);
    return valid &&
      budget.spentUsd + estimatedUsd! <= budget.limitUsd + tolerance
      ? "L1"
      : "L2";
  }
  return "forbidden";
}
