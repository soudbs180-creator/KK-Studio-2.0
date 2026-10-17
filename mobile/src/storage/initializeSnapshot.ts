import {
  emptyMobileSnapshot,
  type MobileSnapshot,
} from "../core/mobileModel.ts";
import type { RepositoryOptions } from "./ports.ts";

/** First use may insert an absent row; an existing or unreadable row is never replaced. */
export async function initializeSnapshot(
  options: Pick<RepositoryOptions, "backend" | "accountId">,
  serialize: (snapshot: MobileSnapshot) => string,
): Promise<void> {
  const payload = await options.backend.read(options.accountId);
  if (payload === null)
    await options.backend.compareAndSwap(
      options.accountId,
      null,
      serialize(emptyMobileSnapshot()),
    );
}
