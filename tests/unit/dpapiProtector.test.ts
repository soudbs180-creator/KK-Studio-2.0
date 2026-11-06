import assert from "node:assert/strict";
import test from "node:test";
import {
  ProtectedCredentialStore,
  type CiphertextStoragePort,
} from "../../src/features/ai-gateway/credentials.ts";
import {
  assertDpapiScope,
  createDpapiSecretProtector,
  createWindowsDpapiPort,
  windowsDpapiArgs,
  WINDOWS_DPAPI_COMMAND,
  WINDOWS_DPAPI_SCRIPT,
  type DpapiBlobPort,
  type DpapiProcessRunner,
} from "../../src/features/ai-gateway/dpapiProtector.ts";

const SECRET = "super-secret-value";

function memoryBlobs(): CiphertextStoragePort & {
  blobs: Map<string, Uint8Array>;
} {
  const blobs = new Map<string, Uint8Array>();
  return {
    blobs,
    async read(ref) {
      return blobs.get(ref);
    },
    async write(ref, ciphertext) {
      blobs.set(ref, new Uint8Array(ciphertext));
    },
    async delete(ref) {
      return blobs.delete(ref);
    },
    async list() {
      return [...blobs.keys()];
    },
  };
}

function framingPort(): {
  port: DpapiBlobPort;
  held: { current: Uint8Array | undefined };
} {
  const held: { current: Uint8Array | undefined } = { current: undefined };
  return {
    held,
    port: {
      async protect(bytes, scope) {
        assert.equal(scope, "CurrentUser");
        const framed = new Uint8Array(bytes.length + 1);
        framed[0] = 0x01;
        for (let index = 0; index < bytes.length; index += 1) {
          framed[index + 1] = (bytes[index] ?? 0) ^ 0xa5;
        }
        held.current = framed;
        return framed;
      },
      async unprotect(bytes, scope) {
        assert.equal(scope, "CurrentUser");
        if (bytes[0] !== 0x01) throw new Error(SECRET);
        const plain = new Uint8Array(bytes.length - 1);
        for (let index = 0; index < plain.length; index += 1) {
          plain[index] = (bytes[index + 1] ?? 0) ^ 0xa5;
        }
        return plain;
      },
    },
  };
}

test("DPAPI scope stays CurrentUser", () => {
  assert.equal(assertDpapiScope("CurrentUser"), "CurrentUser");
  assert.throws(() => assertDpapiScope("LocalMachine"), /DPAPI_SCOPE_UNSUPPORTED/);
  assert.equal(WINDOWS_DPAPI_SCRIPT.includes("CurrentUser"), true);
  assert.equal(WINDOWS_DPAPI_SCRIPT.includes("LocalMachine"), false);
});

test("Windows command keeps the payload off the argument list", () => {
  const args = windowsDpapiArgs();
  assert.deepEqual(args.slice(0, 3), [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
  ]);
  assert.equal(args.some((arg) => arg.includes(SECRET)), false);
});

test("injected runner round-trips without putting the secret on argv", async () => {
  const calls: Array<{ command: string; args: readonly string[]; stdin: string }> =
    [];
  const runner: DpapiProcessRunner = {
    async run(command, args, stdin) {
      calls.push({ command, args, stdin });
      const [op, payload = ""] = stdin.split("\n");
      const bytes = Uint8Array.from(atob(payload), (char) => char.charCodeAt(0));
      const out =
        op === "protect"
          ? Uint8Array.from([0x01, ...bytes], (byte, index) =>
              index === 0 ? byte : byte ^ 0xa5,
            )
          : Uint8Array.from(bytes.slice(1), (byte) => byte ^ 0xa5);
      return {
        code: 0,
        stdout: btoa(String.fromCharCode(...out)),
        stderr: "",
      };
    },
  };
  const port = createWindowsDpapiPort(runner, "win32");
  const protector = createDpapiSecretProtector(port);
  const blob = await protector.protect(SECRET);
  const text = await protector.unprotect(blob);
  assert.equal(text, SECRET);
  assert.equal(calls.length, 2);
  assert.equal(calls[0]?.command, WINDOWS_DPAPI_COMMAND);
  assert.equal(
    calls.every(
      (call) =>
        call.args.every((arg) => !arg.includes(SECRET)) &&
        !call.args.join(" ").includes(btoa(SECRET)),
    ),
    true,
  );
  assert.match(calls[0]?.stdin ?? "", /^protect\n/);
  assert.match(calls[1]?.stdin ?? "", /^unprotect\n/);
});

test("non-windows and failed runners do not echo the secret", async () => {
  const idle: DpapiProcessRunner = {
    async run() {
      throw new Error(SECRET);
    },
  };
  await assert.rejects(
    createWindowsDpapiPort(idle, "linux").protect(
      new TextEncoder().encode(SECRET),
      "CurrentUser",
    ),
    (error: unknown) => {
      assert.equal(error instanceof Error, true);
      assert.equal((error as Error).message, "DPAPI_UNSUPPORTED");
      assert.equal((error as Error).message.includes(SECRET), false);
      return true;
    },
  );
  await assert.rejects(
    createWindowsDpapiPort(idle, "win32").protect(
      new TextEncoder().encode(SECRET),
      "CurrentUser",
    ),
    (error: unknown) => {
      assert.equal((error as Error).message, "DPAPI_PORT_FAILED");
      assert.equal((error as Error).message.includes(SECRET), false);
      return true;
    },
  );
});

test("protector stores ciphertext and drops secret-bearing failures", async () => {
  const storage = memoryBlobs();
  const framed = framingPort();
  const store = new ProtectedCredentialStore(
    createDpapiSecretProtector(framed.port),
    storage,
  );
  await store.write("conn.primary", SECRET);
  const blob = storage.blobs.get("conn.primary");
  assert.ok(blob);
  assert.equal(Buffer.from(blob).toString("utf8").includes(SECRET), false);
  const held = framed.held.current;
  assert.ok(held);
  held[0] = 0x00;
  assert.equal(await store.read("conn.primary"), SECRET);

  const leaking: DpapiBlobPort = {
    async protect() {
      throw new Error(SECRET);
    },
    async unprotect() {
      throw new Error(SECRET);
    },
  };
  await assert.rejects(createDpapiSecretProtector(leaking).protect(SECRET), (error: unknown) => {
    assert.equal((error as Error).message, "DPAPI_PROTECT_FAILED");
    assert.equal((error as Error).message.includes(SECRET), false);
    return true;
  });
});

test("echoed plaintext and empty values are refused", async () => {
  const echo: DpapiBlobPort = {
    async protect(bytes) {
      return bytes;
    },
    async unprotect(bytes) {
      return bytes;
    },
  };
  await assert.rejects(
    createDpapiSecretProtector(echo).protect(SECRET),
    /DPAPI_PROTECT_ECHO/,
  );
  await assert.rejects(
    createDpapiSecretProtector(echo).protect(""),
    /DPAPI_PLAINTEXT_REQUIRED/,
  );
  await assert.rejects(
    createDpapiSecretProtector(echo).unprotect(new Uint8Array()),
    /DPAPI_CIPHERTEXT_REQUIRED/,
  );
});

test("invalid plaintext bytes do not surface as a secret", async () => {
  const invalid: DpapiBlobPort = {
    async protect(bytes) {
      return Uint8Array.from([0xff, ...bytes]);
    },
    async unprotect() {
      return Uint8Array.from([0xff, 0xfe]);
    },
  };
  await assert.rejects(
    createDpapiSecretProtector(invalid).unprotect(Uint8Array.from([1, 2, 3])),
    /DPAPI_PLAINTEXT_INVALID/,
  );
});
