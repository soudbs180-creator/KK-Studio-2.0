import type { GenerationRepository } from "./repository.ts";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { PlatformError, rejectSecrets } from "./types.ts";
const id = z
  .string()
  .min(1)
  .max(240)
  .regex(/^[A-Za-z0-9:_-]+$/);
const eventSchema = z
  .object({
    eventId: id,
    jobId: id,
    outputIndex: z.number().int().min(0).max(99),
    generation: z.number().int().positive(),
    providerJobId: id,
    idempotencyKey: id,
    sequence: z.number().int().nonnegative(),
    status: z.enum(["queued", "running", "succeeded", "failed"]),
  })
  .strict();
export type WebhookEvent = z.infer<typeof eventSchema>;
export function receiveWebhook(
  r: GenerationRepository,
  connectionId: string,
  delivery: string,
  timestamp: string,
  signature: string,
  raw: Buffer,
  secret: string,
  now = Date.now(),
): string {
  if (
    !/^\d{1,12}$/.test(timestamp) ||
    Math.abs(now - Number(timestamp) * 1000) > 300000
  )
    throw new PlatformError("WEBHOOK_TIMESTAMP", 401);
  if (!secret || !/^[a-f0-9]{64}$/i.test(signature))
    throw new PlatformError("WEBHOOK_SIGNATURE", 401);
  const expected = createHmac("sha256", secret)
    .update(timestamp + ".")
    .update(raw)
    .digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, "hex")))
    throw new PlatformError("WEBHOOK_SIGNATURE", 401);
  if (raw.length > 16384) throw new PlatformError("WEBHOOK_TOO_LARGE", 413);
  id.parse(delivery);
  const event = eventSchema.parse(JSON.parse(raw.toString("utf8")));
  rejectSecrets(event);
  if (
    event.idempotencyKey !==
    `${event.jobId}:${event.outputIndex}:${event.generation}`
  )
    throw new PlatformError("WEBHOOK_IDEMPOTENCY", 409);
  return r.receiveEvent(
    connectionId,
    delivery,
    event,
    createHash("sha256").update(raw).digest("hex"),
    now,
  );
}
