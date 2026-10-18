import type { MobileSnapshot } from "../core/mobileModel.ts";

/** Internal bound bridge; all publications use the repository's single private CAS. */
export interface LocalRepositoryBridge {
  mutate(
    work: (snapshot: MobileSnapshot) => void | Promise<void>,
  ): Promise<MobileSnapshot>;
  snapshot(): MobileSnapshot;
  check(snapshot: MobileSnapshot): void;
  readOriginal(assetId: string): Promise<Uint8Array>;
  fork(projectId: string, revision: number): Promise<MobileSnapshot>;
  id(): string;
  now(): number;
}
