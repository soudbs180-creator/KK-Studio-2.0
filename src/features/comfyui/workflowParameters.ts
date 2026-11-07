import type { ComfyWorkflow } from "../../domain/comfyWorkflow.ts";

export interface WorkflowParameter {
  nodeId: string;
  input: string;
  label: string;
  value: string | number;
  min?: number;
  max?: number;
  multiline?: boolean;
}
const fields: Record<string, { label: string; min?: number; max?: number }> = {
  seed: { label: "Seed", min: 0, max: Number.MAX_SAFE_INTEGER },
  noise_seed: { label: "Seed", min: 0, max: Number.MAX_SAFE_INTEGER },
  steps: { label: "步数", min: 1, max: 10000 },
  width: { label: "宽度", min: 1, max: 32768 },
  height: { label: "高度", min: 1, max: 32768 },
  sampler_name: { label: "采样器" },
  ckpt_name: { label: "Checkpoint 模型" },
};
function linkedId(value: unknown): string | undefined {
  return Array.isArray(value) &&
    value.length === 2 &&
    (typeof value[0] === "string" || typeof value[0] === "number") &&
    Number.isInteger(value[1])
    ? String(value[0])
    : undefined;
}
export function workflowParameters(
  workflow: ComfyWorkflow,
): WorkflowParameter[] {
  const roles = new Map<string, Set<string>>();
  function mark(value: unknown, role: string, seen = new Set<string>()) {
    const id = linkedId(value);
    if (!id || seen.has(id) || !workflow[id]) return;
    seen.add(id);
    const current = roles.get(id) ?? new Set<string>();
    current.add(role);
    roles.set(id, current);
    for (const input of Object.values(workflow[id].inputs ?? {}))
      mark(input, role, seen);
  }
  for (const node of Object.values(workflow)) {
    mark(node.inputs?.positive, "正向提示词");
    mark(node.inputs?.negative, "反向提示词");
  }
  return Object.entries(workflow).flatMap(([nodeId, node]) =>
    Object.entries(node.inputs ?? {}).flatMap(([input, value]) => {
      if (typeof value !== "string" && typeof value !== "number") return [];
      const prompt =
        ["text", "text_g", "text_l"].includes(input) &&
        /CLIPTextEncode/.test(node.class_type);
      const field = prompt
        ? {
            label: [...(roles.get(nodeId) ?? ["提示词"])].join(" / "),
            multiline: true,
          }
        : fields[input];
      return field ? [{ nodeId, input, value, ...field }] : [];
    }),
  );
}
export function updateWorkflowParameter(
  workflow: ComfyWorkflow,
  nodeId: string,
  input: string,
  value: string | number,
): ComfyWorkflow {
  const parameter = workflowParameters(workflow).find(
    (p) => p.nodeId === nodeId && p.input === input,
  );
  if (
    !parameter ||
    typeof value !== typeof parameter.value ||
    (typeof value === "number" &&
      (!Number.isSafeInteger(value) ||
        value < (parameter.min ?? 0) ||
        value > (parameter.max ?? Number.MAX_SAFE_INTEGER)))
  )
    throw new Error("参数无效，请保留输入类型并使用范围内的整数");
  const node = workflow[nodeId];
  return {
    ...workflow,
    [nodeId]: { ...node, inputs: { ...node.inputs, [input]: value } },
  };
}
