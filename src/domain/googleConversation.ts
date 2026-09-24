import { z } from "zod";

const message = z.object({
  id: z.string().min(1).max(160),
  role: z.enum(["user", "assistant", "tool", "error"]),
  text: z.string().max(200000),
  imageIds: z.array(z.string().max(160)).max(8).optional(),
});
const schema = z.object({
  id: z.string().min(1).max(160),
  identity: z.string().max(250),
  previousInteractionId: z.string().max(4096).optional(),
  cliSessionId: z.string().max(4096).optional(),
  status: z.enum(["ready", "running", "unknown"]),
  messages: z.array(message).max(200),
  archivedImageIds: z.array(z.string().max(160)).max(5000),
});
export type GoogleConversation = z.infer<typeof schema>;

/** Validate the complete record before writing it; TypeScript types cannot bound remote replies. */
export function isPersistableGoogleConversation(
  value: unknown,
): value is GoogleConversation {
  return schema.safeParse(value).success;
}

/** Whitelist persisted fields; an interrupted request must not become retryable on reload. */
export function normalizeGoogleConversation(
  value: unknown,
): GoogleConversation | undefined {
  const parsed = schema.safeParse(value);
  if (!parsed.success) return undefined;
  return {
    ...parsed.data,
    status: parsed.data.status === "running" ? "unknown" : parsed.data.status,
  };
}
