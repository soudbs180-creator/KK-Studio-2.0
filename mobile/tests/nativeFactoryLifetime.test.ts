import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { MobileRepository } from "../src/storage/repository.ts";

test("actual native factory closes failed schema/constructor connections and transfers successful private ownership", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "kk-native-factory-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const key = `native-factory-${Date.now()}-${Math.random()}`;
  const failure = new Error("Schema initialization failure");
  const probe = {
    records: [] as { name: string; options: unknown; closes: number }[],
    fail: false,
    failClose: false,
    failure,
  };
  Reflect.set(globalThis, key, probe);
  t.after(() => Reflect.deleteProperty(globalThis, key));
  const stubs: Record<string, string> = {
    "expo-sqlite": `export async function openDatabaseAsync(name,options){const p=Reflect.get(globalThis,${JSON.stringify(key)});const r={name,options,closes:0};p.records.push(r);return{async execAsync(){if(p.fail)throw p.failure},async getFirstAsync(){return null},async runAsync(){return{changes:1}},closeAsync(){r.closes++;if(p.failClose)throw new Error('close failure');return Promise.resolve()}}}`,
    "expo-crypto": `export const randomUUID=()=>"id";export const CryptoDigestAlgorithm={SHA256:"SHA256"};export const digest=async()=>new Uint8Array(32);export const digestStringAsync=async()=>"hash";`,
    "expo-secure-store": `export const WHEN_UNLOCKED_THIS_DEVICE_ONLY=1;export async function getItemAsync(){return null}export async function setItemAsync(){}export async function deleteItemAsync(){}`,
    "expo-file-system": `export const Paths={document:"file:///document"};export class File{}export class Directory{}`,
  };
  const output = join(directory, "factory.mjs");
  await build({
    entryPoints: [
      fileURLToPath(
        new URL("../src/storage/platform.native.ts", import.meta.url),
      ),
    ],
    outfile: output,
    bundle: true,
    format: "esm",
    platform: "node",
    plugins: [
      {
        name: "native-port-fixture",
        setup(builder) {
          builder.onResolve({ filter: /^expo-/ }, (args) => ({
            path: args.path,
            namespace: "native-fixture",
          }));
          builder.onLoad(
            { filter: /.*/, namespace: "native-fixture" },
            (args) => ({ contents: stubs[args.path], loader: "js" }),
          );
        },
      },
    ],
  });
  const factory = (await import(pathToFileURL(output).href))
    .createMobileRepository as (account: string) => Promise<MobileRepository>;
  probe.fail = true;
  probe.failClose = true;
  await assert.rejects(factory("owner-a"), (error) => error === failure);
  assert.equal(probe.records[0].closes, 1);
  probe.fail = false;
  probe.failClose = false;
  await assert.rejects(factory(""), /Account identity required/);
  assert.equal(probe.records[1].closes, 1);
  const a = await factory("owner-a"),
    b = await factory("owner-b");
  assert.deepEqual(
    probe.records.map((r) => r.options),
    Array(4).fill({ useNewConnection: true }),
  );
  assert.equal(
    probe.records.every((r) => r.name === "kk-mobile-creation-v1.db"),
    true,
  );
  await a.dispose();
  await a.dispose();
  assert.equal(probe.records[2].closes, 1);
  assert.equal(probe.records[3].closes, 0);
  await b.dispose();
  assert.equal(probe.records[3].closes, 1);
});
