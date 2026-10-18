/**
 * Deterministic legacy v2 -> v3 chat migration algorithm per ADR-022.
 * Guarantees zero message loss, zero attachment loss, and non-downgradable write barrier.
 */

import type {
  ChatItem,
  ChatItemDraft,
  ChatItemMessage,
  CreationProjectV3,
  CreationSnapshotV3,
  CreationAttachment,
} from "./model.ts";

export type {
  ChatItem,
  ChatItemDraft,
  ChatItemMessage,
  CreationProjectV3,
  CreationSnapshotV3,
};

export interface LegacyV2Project {
  id: string;
  name?: string;
  messages?: Array<{
    id: string;
    role: "user" | "assistant" | "system" | "tool" | "error";
    content: string;
    createdAt?: number;
    taskId?: string;
    [k: string]: unknown;
  }>;
  composerDraft?: {
    text?: string;
    prompt?: string;
    attachments?: CreationAttachment[];
    pendingAgent?: boolean | string;
    conversationChannel?: "codex" | "direct" | "google";
    model?: string;
    [k: string]: unknown;
  };
  agentThreadId?: string;
  googleConversation?: unknown;
  canvas?: Record<string, unknown>;
  items?: Array<Record<string, unknown>>;
  tasks?: Array<{ id: string; originChatId?: string; [k: string]: unknown }>;
  attachments?: CreationAttachment[];
  [key: string]: unknown;
}

export interface LegacyV2Snapshot {
  version: 2;
  revision: number;
  activeProjectId: string | null;
  projects: LegacyV2Project[];
  homeDraft: Record<string, unknown>;
  apiKey?: string;
  [key: string]: unknown;
}

/** Reject secrets per ADR-022 and snapshotCodec standards */
export function rejectSecretsInSnapshot(
  snapshot: Record<string, unknown>,
): void {
  const inspect = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (
        /^(api_?key|access_?token|oauth_?token|refresh_?token|client_?secret|bearer_?token|authorization|secret|secret_?key)$/i.test(
          key,
        )
      )
        throw new Error("项目不能包含密钥或访问令牌。");
      inspect(child);
    }
  };
  inspect(snapshot);
}

// Pure JavaScript SHA-256 implementation fallback
const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function pureJsSha256(content: string | Uint8Array): string {
  const utf8 = Array.from(
    typeof content === "string" ? new TextEncoder().encode(content) : content,
  );

  const bitLen = utf8.length * 8;
  utf8.push(0x80);
  while (utf8.length % 64 !== 56) utf8.push(0);
  utf8.push(
    0,
    0,
    0,
    0,
    (bitLen >>> 24) & 0xff,
    (bitLen >>> 16) & 0xff,
    (bitLen >>> 8) & 0xff,
    bitLen & 0xff,
  );

  let h0 = 0x6a09e667,
    h1 = 0xbb67ae85,
    h2 = 0x3c6ef372,
    h3 = 0xa54ff53a,
    h4 = 0x510e527f,
    h5 = 0x9b05688c,
    h6 = 0x1f83d9ab,
    h7 = 0x5be0cd19;

  const w = new Uint32Array(64);
  for (let i = 0; i < utf8.length; i += 64) {
    for (let j = 0; j < 16; j++) {
      w[j] =
        (utf8[i + j * 4] << 24) |
        (utf8[i + j * 4 + 1] << 16) |
        (utf8[i + j * 4 + 2] << 8) |
        utf8[i + j * 4 + 3];
    }
    for (let j = 16; j < 64; j++) {
      const s0 =
        ((w[j - 15] >>> 7) | (w[j - 15] << 25)) ^
        ((w[j - 15] >>> 18) | (w[j - 15] << 14)) ^
        (w[j - 15] >>> 3);
      const s1 =
        ((w[j - 2] >>> 17) | (w[j - 2] << 15)) ^
        ((w[j - 2] >>> 19) | (w[j - 2] << 13)) ^
        (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0;
    }

    let a = h0,
      b = h1,
      c = h2,
      d = h3,
      e = h4,
      f = h5,
      g = h6,
      h = h7;

    for (let j = 0; j < 64; j++) {
      const S1 =
        ((e >>> 6) | (e << 26)) ^
        ((e >>> 11) | (e << 21)) ^
        ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[j] + w[j]) >>> 0;
      const S0 =
        ((a >>> 2) | (a << 30)) ^
        ((a >>> 13) | (a << 19)) ^
        ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((v) => v.toString(16).padStart(8, "0"))
    .join("");
}

export function sha256Hex(content: string | Uint8Array): string {
  return pureJsSha256(content);
}

type RawRecord = Record<string, unknown>;
const record = (value: unknown): RawRecord =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as RawRecord)
    : {};

export function sameJson(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (Array.isArray(left) || Array.isArray(right))
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => sameJson(value, right[index]))
    );
  if (!left || !right || typeof left !== "object" || typeof right !== "object")
    return false;
  const a = record(left),
    b = record(right);
  return (
    Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every(
      (key) => Object.hasOwn(b, key) && sameJson(a[key], b[key]),
    )
  );
}

function legacyProviderBinding(source: RawRecord): RawRecord | undefined {
  const connectionId = source.providerConnectionId;
  const exactConnection =
    typeof connectionId === "string" && connectionId.length > 0;
  const exactCredential =
    typeof source.providerBaseUrl === "string" &&
    source.providerBaseUrl.length > 0 &&
    typeof source.providerCredentialRef === "string" &&
    source.providerCredentialRef.length > 0;
  if (!exactConnection && !exactCredential) return;
  return Object.fromEntries(
    [
      "providerConnectionId",
      "providerBaseUrl",
      "providerCredentialRef",
      "providerProtocol",
      "providerAuthMode",
    ]
      .filter((key) => typeof source[key] === "string")
      .map((key) => [key, source[key]]),
  );
}

function meaningfulDraft(draft: RawRecord): boolean {
  return Boolean(
    draft.text ||
    draft.prompt ||
    (Array.isArray(draft.attachments) && draft.attachments.length) ||
    draft.pendingAgent,
  );
}

/** Source evidence chooses a context; current UI preferences never assign old messages. */
function migrateProjectV2(proj: LegacyV2Project): CreationProjectV3 {
  const result = structuredClone(proj) as RawRecord;
  const thread = (value: unknown) =>
    typeof value === "string" && /^[A-Za-z0-9_-]{1,160}$/.test(value);
  if (Object.hasOwn(proj, "agentThreadId") && !thread(proj.agentThreadId))
    throw new Error("corrupt: 旧 Agent 线程身份无效。");
  if (Object.hasOwn(proj, "chats")) {
    if (
      !proj.chats ||
      typeof proj.chats !== "object" ||
      Array.isArray(proj.chats) ||
      !Object.keys(proj.chats).length ||
      typeof proj.activeChatId !== "string" ||
      !Object.hasOwn(proj.chats, proj.activeChatId)
    )
      throw new Error("corrupt: 旧聊天身份不完整，原件未迁移。");
    for (const [id, value] of Object.entries(proj.chats)) {
      const chat = record(value);
      if (
        chat.id !== id ||
        (Object.hasOwn(chat, "agentThreadId") && !thread(chat.agentThreadId))
      )
        throw new Error("corrupt: 旧聊天身份无效，原件未迁移。");
    }
  } else if (Object.hasOwn(proj, "activeChatId")) {
    throw new Error("corrupt: 旧聊天身份不完整，原件未迁移。");
  }
  for (const key of ["composerDraft", "googleConversation"]) {
    if (
      Object.hasOwn(proj, key) &&
      (!proj[key] || typeof proj[key] !== "object" || Array.isArray(proj[key]))
    )
      throw new Error(`corrupt: 旧 ${key} 无法完整迁移。`);
  }
  if (Object.hasOwn(proj, "messages") && !Array.isArray(proj.messages))
    throw new Error("corrupt: 旧消息无法完整迁移。");
  const chats = structuredClone(record(proj.chats)) as Record<string, ChatItem>;
  const createdAt =
    Number.isSafeInteger(proj.createdAt) && Number(proj.createdAt) >= 0
      ? Number(proj.createdAt)
      : 0;
  const updatedAt =
    Number.isSafeInteger(proj.updatedAt) && Number(proj.updatedAt) >= 0
      ? Number(proj.updatedAt)
      : createdAt;
  const ids: Partial<
    Record<"codex" | "direct" | "google" | "unknown", string>
  > = {};
  function ensure(source: "codex" | "direct" | "google" | "unknown"): ChatItem {
    if (ids[source]) return chats[ids[source]!];
    const base = source === "unknown" ? "legacy-history" : `legacy-${source}`;
    let id = base,
      suffix = 2;
    while (Object.hasOwn(chats, id)) id = `${base}-${suffix++}`;
    const names = {
      codex: "Codex 历史对话",
      direct: "对话记录",
      google: "Google 对话",
      unknown: "旧消息，来源待核对",
    };
    const chat: ChatItem = {
      id,
      name: names[source],
      createdAt,
      updatedAt,
      draft: {},
      messages: [],
      mainAgent: source === "unknown" ? "direct" : source,
      modelAllowlist: [],
      legacySource: source,
      ...(source === "unknown" ? { requiresReview: true } : {}),
    };
    ids[source] = id;
    chats[id] = chat;
    return chat;
  }
  if (proj.agentThreadId) ensure("codex").agentThreadId = proj.agentThreadId;
  const google = record(proj.googleConversation);
  if (Object.keys(google).length) {
    const context = structuredClone(google);
    const messages = context.messages;
    if (Object.hasOwn(context, "messages") && !Array.isArray(messages))
      throw new Error("corrupt: Google 历史消息无法完整迁移。");
    delete context.messages;
    const chat = ensure("google");
    chat.googleConversation = context;
    if (Array.isArray(messages))
      chat.messages = messages.map((value) => {
        const message = structuredClone(record(value));
        if (
          typeof message.id !== "string" ||
          !["user", "assistant", "system", "tool", "error"].includes(
            String(message.role),
          ) ||
          (typeof message.text !== "string" &&
            typeof message.content !== "string")
        )
          throw new Error("corrupt: Google 历史消息无法完整迁移。");
        return {
          ...message,
          content:
            typeof message.content === "string"
              ? message.content
              : message.text,
        } as ChatItemMessage;
      });
  }
  const draft = record(proj.composerDraft);
  let draftSource: "codex" | "direct" | "google" | "unknown" | undefined;
  if (meaningfulDraft(draft)) {
    draftSource = draft.pendingAgent
      ? "codex"
      : ["codex", "direct", "google"].includes(
            String(draft.conversationChannel),
          )
        ? (draft.conversationChannel as "codex" | "direct" | "google")
        : record(draft.modelSelection).source === "api"
          ? "direct"
          : "unknown";
    const sourceChat = ensure(draftSource);
    sourceChat.draft = structuredClone(draft);
    if (
      typeof draft.prompt === "string" &&
      draft.prompt &&
      typeof draft.text === "string" &&
      draft.text &&
      draft.prompt !== draft.text
    ) {
      const base = "legacy-draft-recovery";
      let id = base,
        suffix = 2;
      while (Object.hasOwn(chats, id)) id = `${base}-${suffix++}`;
      chats[id] = {
        id,
        name: "恢复草稿",
        createdAt,
        updatedAt,
        draft: {
          ...structuredClone(draft),
          prompt: draft.text,
          text: draft.text,
        },
        messages: [],
        mainAgent: "direct",
        modelAllowlist: [],
        legacySource: "unknown",
        requiresReview: true,
        originChatId: sourceChat.id,
      };
    }
  } else if (Object.keys(draft).length) {
    if (
      Object.hasOwn(result, "legacyComposerPreferences") &&
      !sameJson(result.legacyComposerPreferences, draft)
    )
      throw new Error("corrupt: 旧输入偏好保全字段冲突。");
    result.legacyComposerPreferences = structuredClone(draft);
  }
  const directDraftBinding =
    draftSource === "direct"
      ? legacyProviderBinding({
          ...proj,
          providerConnectionId:
            draft.providerConnectionId ??
            record(draft.modelSelection).connectionId,
        })
      : undefined;
  if (directDraftBinding)
    ensure("direct").legacyProviderBinding = directDraftBinding;
  for (const message of proj.messages ?? []) {
    const task = (proj.tasks ?? []).find(
      (task) =>
        message.content === task.prompt &&
        (message.taskId === task.id ||
          message.id === `${proj.id}-message-${task.id}`),
    );
    const rootCard = (proj.items ?? []).some(
      (item) =>
        item.id === `${proj.id}-prompt` &&
        item.generationSource === "codex" &&
        item.prompt === message.content,
    );
    const initialCodex =
      message.id === `${proj.id}-message` &&
      message.content === proj.prompt &&
      (rootCard ||
        Boolean(
          draft.pendingAgent &&
          ["codex", "default"].includes(
            String(record(draft.modelSelection).source),
          ),
        ));
    const destination = ensure(
      task ? "direct" : initialCodex ? "codex" : "unknown",
    );
    destination.messages.push(structuredClone(message));
    if (task && !directDraftBinding) {
      const binding = legacyProviderBinding(record(task));
      if (binding) destination.legacyProviderBinding = binding;
    }
  }
  if (!Object.keys(chats).length)
    chats["chat-default"] = {
      id: "chat-default",
      name: "默认对话",
      createdAt,
      updatedAt,
      draft: {},
      messages: [],
      mainAgent: "codex",
      modelAllowlist: [],
    };
  const threads = Object.values(chats)
    .map((chat) => chat.agentThreadId)
    .filter((thread) => thread !== undefined);
  if (new Set(threads).size !== threads.length)
    throw new Error("corrupt: Agent 线程归属重复，原件未迁移。");
  const previousActive =
    typeof proj.activeChatId === "string" &&
    Object.hasOwn(chats, proj.activeChatId)
      ? proj.activeChatId
      : undefined;
  result.chats = chats;
  result.activeChatId =
    previousActive ??
    (draftSource && ids[draftSource]) ??
    ids.codex ??
    ids.direct ??
    ids.google ??
    ids.unknown ??
    Object.keys(chats).sort()[0];
  for (const key of [
    "messages",
    "composerDraft",
    "agentThreadId",
    "googleConversation",
  ])
    delete result[key];
  return result as unknown as CreationProjectV3;
}

export function resolveActiveChatId(chats: Record<string, ChatItem>): string {
  return (
    [
      "legacy-codex",
      "legacy-direct",
      "legacy-google",
      "legacy-history",
      "chat-default",
    ].find((id) => Object.hasOwn(chats, id)) ?? Object.keys(chats).sort()[0]
  );
}

/** Raw records are copied before changing authority; the same input produces the same candidate. */
export function migrateSnapshotV2ToV3(
  v2: LegacyV2Snapshot,
): CreationSnapshotV3 {
  rejectSecretsInSnapshot(v2 as unknown as Record<string, unknown>);
  if (
    v2.version !== 2 ||
    !Number.isSafeInteger(v2.revision) ||
    v2.revision < 0 ||
    v2.revision >= Number.MAX_SAFE_INTEGER ||
    !Array.isArray(v2.projects)
  )
    throw new Error("corrupt: 无效旧快照，原件未迁移。");
  return {
    ...structuredClone(v2),
    version: 3,
    revision: v2.revision + 1,
    projects: v2.projects.map(migrateProjectV2),
  } as unknown as CreationSnapshotV3;
}

/** Only raw durable input belongs here; component views carry derived root fields. */
export function migrateSnapshotToV3(
  raw: LegacyV2Snapshot | CreationSnapshotV3,
): CreationSnapshotV3 {
  if (raw.version !== 2 && raw.version !== 3)
    throw new Error("unsupported: 项目格式不受支持。");
  rejectSecretsInSnapshot(raw as unknown as Record<string, unknown>);
  if (raw.version === 2) return migrateSnapshotV2ToV3(raw);
  const legacy = raw.projects.some((project) =>
    ["messages", "composerDraft", "agentThreadId", "googleConversation"].some(
      (key) => Object.hasOwn(project, key),
    ),
  );
  if (!legacy) return structuredClone(raw);
  return migrateSnapshotV2ToV3({
    ...raw,
    version: 2,
  } as unknown as LegacyV2Snapshot);
}
