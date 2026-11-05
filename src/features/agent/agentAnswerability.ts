import { OntologyGraph } from "../../domain/ontologyGraph.ts";
import { createAnswerabilityPreInvocationGuard } from "../../domain/answerabilityCheck.ts";
import type { CanvasAgentSnapshot } from "./agentTypes.ts";
import { SecurityHookEngine } from "./preInvocation.ts";

export function agentPromptNodeIds(prompt: string): string[] {
  return [...prompt.matchAll(/@\[node:([^\]\r\n]+)\]/g)].map(
    (match) => match[1],
  );
}

/** Rebuild from current state: an earlier valid reference cannot authorize a deleted node. */
export function agentAnswerabilityError(
  snapshot: CanvasAgentSnapshot | null | undefined,
  prompt: string,
  nodeIds: readonly (string | undefined)[] = [],
): string | undefined {
  const required = [
    ...new Set([
      ...agentPromptNodeIds(prompt),
      ...nodeIds.filter((id): id is string => Boolean(id)),
    ]),
  ];
  const graph = new OntologyGraph();
  for (const node of snapshot?.nodes ?? []) {
    graph.addEntity({
      id: node.id,
      name: node.title,
      type: node.type,
      properties: node.metadata,
    });
  }
  for (const connection of snapshot?.connections ?? []) {
    if (
      graph.hasEntity(connection.fromNodeId) &&
      graph.hasEntity(connection.toNodeId)
    ) {
      graph.addRelation({
        id: connection.id,
        sourceId: connection.fromNodeId,
        targetId: connection.toNodeId,
        predicate: "REFERENCES",
      });
    }
  }
  const security = new SecurityHookEngine();
  const guard = createAnswerabilityPreInvocationGuard(graph, {
    shouldValidate: () => true,
    extractEntities: () => required,
  });
  security.addHook((tool, args) => {
    const result = guard(tool, args);
    return result.allow
      ? result
      : {
          allow: false,
          reason: `引用的画布节点不存在或已删除：${result.report?.missingEntities.join("、")}。请重新选择参考素材。`,
        };
  });
  const decision = security.evaluate("reasoning_preflight", { prompt });
  return decision.allow ? undefined : decision.reason;
}
