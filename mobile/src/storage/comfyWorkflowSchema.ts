import type { ComfyWorkflow } from "../core/comfyModel.ts";
import { utf8ByteLength } from "../core/resultLimits.ts";
import { invariant, keys, object, integer, text } from "./schemaPrimitives.ts";

const credentialKey =
  /^(?:api[_-]?key|token|secret|authorization|password|access[_-]?token|refresh[_-]?token|cookie|proxy[_-]?credentials|credentials?|(?:provider)?credentialRef)$/i;
const credentialValue =
  /\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|password|cookie)\s*[:=]|Bearer\s+[A-Za-z0-9]|\bsk-[A-Za-z0-9_-]{20,}/i;
function safeKey(value: string): void {
  invariant(
    value.length > 0 &&
      value.length <= 128 &&
      !["__proto__", "constructor", "prototype"].includes(value) &&
      !/[\x00-\x1f]/.test(value),
    "Corrupt Comfy workflow key",
  );
  invariant(!credentialKey.test(value), "Comfy workflow credentials forbidden");
}
function safeText(value: unknown, maximum: number): asserts value is string {
  text(value, maximum);
  invariant(
    !credentialValue.test(value),
    "Comfy workflow credential value forbidden",
  );
  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value);
    invariant(
      !url.username && !url.password,
      "Comfy workflow URL credentials forbidden",
    );
  }
}
/** Structural boundedness only: link existence and node semantics require a live catalog. */
export function validateStoredComfyWorkflow(
  value: unknown,
): asserts value is ComfyWorkflow {
  object(value);
  const entries = Object.entries(value);
  invariant(
    entries.length > 0 && entries.length <= 200,
    "Corrupt Comfy workflow node count",
  );
  invariant(
    utf8ByteLength(JSON.stringify(value)) <= 512 * 1024,
    "Comfy workflow exceeds byte limit",
  );
  for (const [nodeId, node] of entries) {
    safeKey(nodeId);
    invariant(
      /^[A-Za-z0-9_-]{1,64}$/.test(nodeId),
      "Corrupt Comfy workflow node identity",
    );
    object(node);
    keys(node, ["class_type", "inputs", "_meta"]);
    safeText(node.class_type, 128);
    safeKey(node.class_type);
    object(node.inputs);
    invariant(
      Object.keys(node.inputs).length <= 100,
      "Corrupt Comfy workflow input count",
    );
    for (const [key, input] of Object.entries(node.inputs)) {
      safeKey(key);
      if (typeof input === "string") safeText(input, 16000);
      else if (input === null || typeof input === "boolean") continue;
      else if (typeof input === "number")
        invariant(Number.isFinite(input), "Corrupt Comfy workflow number");
      else {
        invariant(
          Array.isArray(input) &&
            input.length === 2 &&
            typeof input[0] === "string" &&
            /^[A-Za-z0-9_-]{1,64}$/.test(input[0]),
          "Corrupt Comfy workflow link",
        );
        safeKey(input[0]);
        integer(input[1]);
        invariant(input[1] < 100, "Corrupt Comfy workflow link slot");
      }
    }
    if (node._meta !== undefined) {
      object(node._meta);
      keys(node._meta, ["title"]);
      safeText(node._meta.title, 240);
    }
  }
}
