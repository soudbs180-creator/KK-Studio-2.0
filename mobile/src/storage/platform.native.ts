import * as SQLite from "expo-sqlite";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { File, Directory, Paths } from "expo-file-system";
import { MobileRepository } from "./repository.ts";
import { SqliteSnapshotBackend } from "./sqliteBackend.ts";
import type { OriginalStore, CredentialVault } from "./ports.ts";
import { invariant } from "./validation.ts";
import { closeAfterFailure } from "./repositoryLifetime.ts";

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await Crypto.digest(
    Crypto.CryptoDigestAlgorithm.SHA256,
    new Uint8Array(bytes),
  );
  return Array.from(new Uint8Array(digest), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("");
}
class NativeOriginalStore implements OriginalStore {
  private async file(accountId: string, assetId: string): Promise<File> {
    invariant(/^asset-[a-f0-9]{24}$/.test(assetId), "Invalid original path");
    const scope = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      accountId,
    );
    const directory = new Directory(
      Paths.document,
      "kk-mobile-originals-v1",
      scope,
    );
    directory.create({ idempotent: true, intermediates: true });
    return new File(directory, assetId);
  }
  async read(accountId: string, assetId: string): Promise<Uint8Array> {
    const file = await this.file(accountId, assetId);
    invariant(file.exists, "Original missing; content not replaced");
    return file.bytes();
  }
  async write(
    accountId: string,
    assetId: string,
    bytes: Uint8Array,
  ): Promise<void> {
    const file = await this.file(accountId, assetId);
    invariant(!file.exists, "Immutable original exists");
    const temp = new File(`${file.uri}.${Crypto.randomUUID()}.pending`);
    temp.create();
    temp.write(bytes);
    invariant(!file.exists, "Immutable original exists");
    await temp.move(file, { overwrite: false });
  }
  async remove(accountId: string, assetId: string): Promise<void> {
    const file = await this.file(accountId, assetId);
    if (file.exists) file.delete();
  }
}
export async function createMobileRepository(
  accountId: string,
): Promise<MobileRepository> {
  const db = await SQLite.openDatabaseAsync("kk-mobile-creation-v1.db", {
    useNewConnection: true,
  });
  const allowLoopbackHttp = typeof __DEV__ !== "undefined" && __DEV__;
  return closeAfterFailure(
    () => db.closeAsync(),
    async () => {
      const backend = new SqliteSnapshotBackend(db, { allowLoopbackHttp });
      await backend.initialize();
      return new MobileRepository({
        accountId,
        allowLoopbackHttp,
        backend,
        originalStore: new NativeOriginalStore(),
        hash: sha256,
        id: Crypto.randomUUID,
        now: Date.now,
        close: () => db.closeAsync(),
      });
    },
  );
}
export function createCredentialVault(accountId: string): CredentialVault {
  const key = async (ref: string) =>
    `kk-mobile.${await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, JSON.stringify([accountId, ref]))}`;
  const options = {
    keychainService: "com.kkstudio.mobile.credentials",
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  };
  return {
    async get(ref) {
      return SecureStore.getItemAsync(await key(ref), options);
    },
    async set(ref, value) {
      invariant(
        accountId.length > 0 && ref.length > 0 && value.length > 0,
        "Credential account/reference/value required",
      );
      await SecureStore.setItemAsync(await key(ref), value, options);
    },
    async remove(ref) {
      await SecureStore.deleteItemAsync(await key(ref), options);
    },
  };
}
