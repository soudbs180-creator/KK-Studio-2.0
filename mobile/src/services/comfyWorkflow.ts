import { record, nonempty, ServiceError } from "./httpClient.ts";
import type {
  ComfyWorkflow,
  ComfyValue,
  ComfyNodeCatalog,
  ComfyInputDefinition,
} from "./comfyTypes.ts";
const safeKey = (key: string) =>
  key.length > 0 &&
  key.length <= 128 &&
  !["__proto__", "constructor", "prototype"].includes(key) &&
  !/[\x00-\x1f]/.test(key);
const credentialKey =
  /^(?:api[_-]?key|token|secret|authorization|password|access[_-]?token|refresh[_-]?token|credential)$/i;
function fault(code: string): never {
  throw new ServiceError(`COMFY_WORKFLOW_${code}`);
}
export function captureComfyWorkflow(value: unknown): ComfyWorkflow {
  if (
    !record(value) ||
    !Object.keys(value).length ||
    Object.keys(value).length > 200
  )
    fault("INVALID");
  const result: ComfyWorkflow = {};
  for (const [id, raw] of Object.entries(value)) {
    if (
      !/^[A-Za-z0-9_-]{1,64}$/.test(id) ||
      !safeKey(id) ||
      !record(raw) ||
      Object.keys(raw).some(
        (key) => !["class_type", "inputs", "_meta"].includes(key),
      ) ||
      !nonempty(raw.class_type) ||
      raw.class_type.length > 128 ||
      !safeKey(raw.class_type) ||
      !record(raw.inputs) ||
      Object.keys(raw.inputs).length > 100
    )
      fault("INVALID_NODE");
    const inputs: Record<string, ComfyValue> = {};
    for (const [key, input] of Object.entries(raw.inputs)) {
      if (!safeKey(key) || credentialKey.test(key))
        fault("SECRET_INPUT_FORBIDDEN");
      if (typeof input === "string") {
        if (
          input.length > 16_000 ||
          /\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|password)\s*[:=]|Bearer\s+[A-Za-z0-9]/i.test(
            input,
          )
        )
          fault("SECRET_OR_OVERSIZED_INPUT");
        inputs[key] = input;
      } else if (
        (typeof input === "number" && Number.isFinite(input)) ||
        typeof input === "boolean" ||
        input === null
      )
        inputs[key] = input;
      else if (
        Array.isArray(input) &&
        input.length === 2 &&
        typeof input[0] === "string" &&
        /^[A-Za-z0-9_-]{1,64}$/.test(input[0]) &&
        typeof input[1] === "number" &&
        Number.isInteger(input[1]) &&
        input[1] >= 0 &&
        input[1] < 100
      ) {
        const link: [string, number] = [input[0], input[1]];
        Object.freeze(link);
        inputs[key] = link;
      } else fault("INVALID_INPUT");
    }
    let meta: { title: string } | undefined;
    if (raw._meta !== undefined) {
      if (
        !record(raw._meta) ||
        Object.keys(raw._meta).some((key) => key !== "title") ||
        typeof raw._meta.title !== "string" ||
        raw._meta.title.length > 240
      )
        fault("INVALID_METADATA");
      meta = Object.freeze({ title: raw._meta.title });
    }
    Object.freeze(inputs);
    result[id] = Object.freeze({
      class_type: raw.class_type,
      inputs,
      ...(meta ? { _meta: meta } : {}),
    });
  }
  if (JSON.stringify(result).length > 512 * 1024) fault("TOO_LARGE");
  return Object.freeze(result);
}
function definitions(
  value: unknown,
  required: boolean,
): Record<string, ComfyInputDefinition> {
  if (value === undefined) return {};
  if (!record(value) || Object.keys(value).length > 100)
    fault("INVALID_NODE_CATALOG");
  const result: Record<string, ComfyInputDefinition> = {};
  for (const [name, schema] of Object.entries(value)) {
    if (
      !safeKey(name) ||
      !Array.isArray(schema) ||
      schema.length < 1 ||
      schema.length > 2
    )
      fault("INVALID_NODE_CATALOG");
    const type: unknown = schema[0];
    if (!(
      nonempty(type) ||
      (Array.isArray(type) &&
        type.length <= 10_000 &&
        type.every(
          (item) =>
            (typeof item === "string" && item.length <= 1024) ||
            (typeof item === "number" && Number.isFinite(item)) ||
            typeof item === "boolean",
        ))
    ))
      fault("INVALID_NODE_CATALOG");
    const bounds: unknown = schema[1];
    if (bounds !== undefined && !record(bounds)) fault("INVALID_NODE_CATALOG");
    const minimum =
      record(bounds) &&
      typeof bounds.min === "number" &&
      Number.isFinite(bounds.min)
        ? bounds.min
        : undefined;
    const maximum =
      record(bounds) &&
      typeof bounds.max === "number" &&
      Number.isFinite(bounds.max)
        ? bounds.max
        : undefined;
    result[name] = {
      required,
      type:
        typeof type === "string"
          ? type
          : ([...type] as (string | number | boolean)[]),
      ...(minimum !== undefined ? { minimum } : {}),
      ...(maximum !== undefined ? { maximum } : {}),
    };
  }
  return result;
}
export function parseComfyNodeCatalog(value: unknown): ComfyNodeCatalog {
  if (
    !record(value) ||
    !Object.keys(value).length ||
    Object.keys(value).length > 10_000
  )
    fault("INVALID_NODE_CATALOG");
  const result: ComfyNodeCatalog = {};
  for (const [classType, raw] of Object.entries(value)) {
    if (
      !safeKey(classType) ||
      !record(raw) ||
      !record(raw.input) ||
      !Array.isArray(raw.output) ||
      raw.output.length > 100 ||
      !raw.output.every(nonempty) ||
      (raw.output_node !== undefined && typeof raw.output_node !== "boolean")
    )
      fault("INVALID_NODE_CATALOG");
    result[classType] = {
      classType,
      inputs: {
        ...definitions(raw.input.required, true),
        ...definitions(raw.input.optional, false),
      },
      outputTypes: [...raw.output],
      outputNode: raw.output_node === true,
    };
  }
  return result;
}
export function validateComfyWorkflow(
  workflow: ComfyWorkflow,
  catalog: ComfyNodeCatalog,
): void {
  let outputs = 0;
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) fault("CYCLE");
    if (visited.has(id)) return;
    const node = workflow[id];
    const definition = catalog[node.class_type];
    if (!definition) fault("NODE_UNAVAILABLE");
    visiting.add(id);
    if (definition.outputNode) outputs++;
    for (const [key, declared] of Object.entries(definition.inputs))
      if (declared.required && !(key in node.inputs))
        fault("REQUIRED_INPUT_MISSING");
    for (const [key, input] of Object.entries(node.inputs)) {
      const declared = definition.inputs[key];
      if (!declared) fault("INPUT_UNAVAILABLE");
      if (Array.isArray(input)) {
        const source = workflow[input[0]];
        if (!source || !catalog[source.class_type]) fault("LINK_UNAVAILABLE");
        const type = catalog[source.class_type].outputTypes[input[1]];
        if (
          !type ||
          Array.isArray(declared.type) ||
          (declared.type !== "*" && type !== "*" && type !== declared.type)
        )
          fault("LINK_TYPE_MISMATCH");
        visit(input[0]);
      } else if (Array.isArray(declared.type)) {
        if (!declared.type.includes(input === null ? "" : input))
          fault("VALUE_UNAVAILABLE");
      } else {
        if (!(
          (declared.type === "STRING" && typeof input === "string") ||
          (declared.type === "BOOLEAN" && typeof input === "boolean") ||
          (declared.type === "FLOAT" && typeof input === "number") ||
          (declared.type === "INT" &&
            typeof input === "number" &&
            Number.isInteger(input))
        ))
          fault("INPUT_TYPE_UNAVAILABLE");
        if (
          typeof input === "number" &&
          ((declared.minimum !== undefined && input < declared.minimum) ||
            (declared.maximum !== undefined && input > declared.maximum))
        )
          fault("VALUE_OUT_OF_RANGE");
      }
    }
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of Object.keys(workflow)) visit(id);
  if (!outputs) fault("OUTPUT_NODE_REQUIRED");
}
