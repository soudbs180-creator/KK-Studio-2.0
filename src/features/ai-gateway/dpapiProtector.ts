/**
 * Controlled Windows DPAPI boundary.
 *
 * The vault stays free of IO. A host supplies the process runner that talks to
 * CurrentUser DPAPI. This module checks the command shape and strips secrets
 * out of failures. It does not invoke DPAPI itself.
 */
import type { SecretProtector } from "./credentials.ts";

export type DpapiScope = "CurrentUser";

export interface DpapiBlobPort {
  protect(plaintext: Uint8Array, scope: DpapiScope): Promise<Uint8Array>;
  unprotect(ciphertext: Uint8Array, scope: DpapiScope): Promise<Uint8Array>;
}

export interface DpapiProcessResult {
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

export interface DpapiProcessRunner {
  run(
    command: string,
    args: readonly string[],
    stdin: string,
  ): Promise<DpapiProcessResult>;
}

export const WINDOWS_DPAPI_COMMAND = "powershell.exe";

/** Stdin carries the operation and payload. Arguments must stay secret-free. */
export const WINDOWS_DPAPI_SCRIPT = [
  "$ErrorActionPreference = 'Stop'",
  "Add-Type -AssemblyName System.Security",
  "$op = [Console]::In.ReadLine()",
  "$payload = [Console]::In.ReadLine()",
  "if ($op -ne 'protect' -and $op -ne 'unprotect') { exit 1 }",
  "$bytes = [Convert]::FromBase64String($payload)",
  "$scope = [Security.Cryptography.DataProtectionScope]::CurrentUser",
  "$result = if ($op -eq 'protect') {",
  "  [Security.Cryptography.ProtectedData]::Protect($bytes, $null, $scope)",
  "} else {",
  "  [Security.Cryptography.ProtectedData]::Unprotect($bytes, $null, $scope)",
  "}",
  "[Console]::Out.Write([Convert]::ToBase64String($result))",
].join("\n");

function fail(code: string): Error {
  return new Error(code);
}

function copyBytes(input: Uint8Array): Uint8Array {
  return new Uint8Array(input);
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

export function assertDpapiScope(scope: string): DpapiScope {
  if (scope !== "CurrentUser") throw fail("DPAPI_SCOPE_UNSUPPORTED");
  return "CurrentUser";
}

export function windowsDpapiArgs(): readonly string[] {
  return ["-NoProfile", "-NonInteractive", "-Command", WINDOWS_DPAPI_SCRIPT];
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function exchange(
  runner: DpapiProcessRunner,
  platform: string,
  op: "protect" | "unprotect",
  bytes: Uint8Array,
  scope: string,
): Promise<Uint8Array> {
  assertDpapiScope(scope);
  if (platform !== "win32") throw fail("DPAPI_UNSUPPORTED");
  const payload = bytesToBase64(bytes);
  const args = windowsDpapiArgs();
  if (args.some((arg) => arg.includes(payload)))
    throw fail("DPAPI_SECRET_IN_ARGV");
  let result: DpapiProcessResult;
  try {
    result = await runner.run(
      WINDOWS_DPAPI_COMMAND,
      args,
      `${op}\n${payload}\n`,
    );
  } catch {
    throw fail("DPAPI_PORT_FAILED");
  }
  if (result.code !== 0) throw fail("DPAPI_PORT_FAILED");
  const text = result.stdout.trim();
  if (!text || text.startsWith("ERR")) throw fail("DPAPI_PORT_FAILED");
  try {
    const decoded = base64ToBytes(text);
    if (!decoded.byteLength) throw fail("DPAPI_PORT_FAILED");
    return decoded;
  } catch (error) {
    if (error instanceof Error && error.message === "DPAPI_PORT_FAILED")
      throw error;
    throw fail("DPAPI_PORT_FAILED");
  }
}

export function createWindowsDpapiPort(
  runner: DpapiProcessRunner,
  platform: string,
): DpapiBlobPort {
  return {
    protect: (plaintext, scope) =>
      exchange(runner, platform, "protect", plaintext, scope),
    unprotect: (ciphertext, scope) =>
      exchange(runner, platform, "unprotect", ciphertext, scope),
  };
}

export function createDpapiSecretProtector(
  port: DpapiBlobPort,
): SecretProtector {
  return {
    async protect(plaintext: string): Promise<Uint8Array> {
      if (!plaintext) throw fail("DPAPI_PLAINTEXT_REQUIRED");
      const bytes = new TextEncoder().encode(plaintext);
      let blob: Uint8Array;
      try {
        blob = await port.protect(copyBytes(bytes), "CurrentUser");
      } catch {
        throw fail("DPAPI_PROTECT_FAILED");
      }
      if (!blob?.byteLength || sameBytes(blob, bytes))
        throw fail("DPAPI_PROTECT_ECHO");
      return copyBytes(blob);
    },
    async unprotect(ciphertext: Uint8Array): Promise<string> {
      if (!ciphertext?.byteLength) throw fail("DPAPI_CIPHERTEXT_REQUIRED");
      let plain: Uint8Array;
      try {
        plain = await port.unprotect(copyBytes(ciphertext), "CurrentUser");
      } catch {
        throw fail("DPAPI_UNPROTECT_FAILED");
      }
      try {
        return new TextDecoder("utf-8", { fatal: true }).decode(plain);
      } catch {
        throw fail("DPAPI_PLAINTEXT_INVALID");
      }
    },
  };
}
