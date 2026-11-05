import { z } from "zod";
export const tokenUsageSchema = z.object({
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
});
export type TokenUsage = z.infer<typeof tokenUsageSchema>;
const object = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};
export function readTokenUsage(
  input: unknown,
  previous?: TokenUsage,
): TokenUsage | undefined {
  const root = object(input),
    usage = object(
      root.usage ??
        object(root.response).usage ??
        object(root.message).usage ??
        input,
    );
  const prompt =
    usage.promptTokens ?? usage.prompt_tokens ?? usage.input_tokens;
  const completion =
    usage.completionTokens ?? usage.completion_tokens ?? usage.output_tokens;
  if (prompt === undefined && completion === undefined) return previous;
  return (
    tokenUsageSchema.safeParse({
      promptTokens: prompt ?? previous?.promptTokens ?? 0,
      completionTokens: completion ?? previous?.completionTokens ?? 0,
      totalTokens:
        usage.totalTokens ??
        usage.total_tokens ??
        Number(prompt ?? previous?.promptTokens ?? 0) +
          Number(completion ?? previous?.completionTokens ?? 0),
    }).data ?? previous
  );
}
export function sumTokenUsage(
  messages: ReadonlyArray<{ tokenUsage?: unknown }>,
): TokenUsage {
  return messages.reduce(
    (sum, m) => {
      const usage = tokenUsageSchema.safeParse(m.tokenUsage).data;
      return usage
        ? {
            promptTokens: sum.promptTokens + usage.promptTokens,
            completionTokens: sum.completionTokens + usage.completionTokens,
            totalTokens: sum.totalTokens + usage.totalTokens,
          }
        : sum;
    },
    { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  );
}
