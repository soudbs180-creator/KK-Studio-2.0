import type { AgentModel } from "./agentTypes.ts";

/**
 * Resolve a model selector against the models reported by the Codex Agent.
 *
 * The stored selector may predate the current ChatGPT account, and a caller
 * can also pass a project generation model (for example an image model). Both
 * cases must be filtered through the Agent model list before reaching Codex.
 */
export function resolveCodexModel(
  models: readonly AgentModel[],
  requested?: string | null,
): string | undefined {
  const usable = models
    .map((item) => {
      const model = item.model.trim();
      const id = item.id.trim();
      const canonical = model || id;
      return canonical ? { item, canonical, model, id } : undefined;
    })
    .filter(
      (
        value,
      ): value is {
        item: AgentModel;
        canonical: string;
        model: string;
        id: string;
      } => Boolean(value),
    );
  const selected = requested?.trim();
  if (selected) {
    const exact = usable.find(
      ({ canonical, model, id }) =>
        selected === canonical || selected === model || selected === id,
    );
    if (exact) return exact.canonical;
  }
  return (
    usable.find(({ item }) => item.isDefault)?.canonical ?? usable[0]?.canonical
  );
}
