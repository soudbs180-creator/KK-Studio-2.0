import { createHash, randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { constants } from "node:fs";
import { link, mkdir, open, unlink } from "node:fs/promises";
import { request as httpRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { join, resolve } from "node:path";
import { crc32, inflateSync } from "node:zlib";
import type { ProviderConnection } from "../../domain/providerConnections.ts";
import type { ProviderResult } from "../../integrations/generation/providerAdapter.ts";
import { PlatformError, type ArchivedAsset } from "./types.ts";

const PNG_SIGNATURE = Buffer.from("89504e470d0a1a0a", "hex");
const MAX_DECODED_BYTES = 256 * 1024 * 1024;
const MAX_PIXELS = 64 * 1024 * 1024;
const SUPPORTED_MIME = "image/png";

function invalid(): never {
  throw new PlatformError("ASSET_INVALID");
}

function checkCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw new PlatformError("ASSET_CANCELLED", 499);
}

function mimeType(value?: string): string | undefined {
  if (value === undefined) return undefined;
  const mime = value.split(";", 1)[0].trim().toLowerCase();
  // Fail closed: Node's built-in APIs can fully validate PNG's compressed data.
  // JPEG/WebP need a maintained image decoder before they can be admitted here.
  if (mime !== SUPPORTED_MIME) throw new PlatformError("ASSET_INVALID_MIME");
  return mime;
}

/** Validates CRCs, chunk order, the entire zlib stream, and every scanline. */
function validatePng(bytes: Buffer): void {
  if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) invalid();
  let offset = 8;
  let width = 0;
  let height = 0;
  let depth = 0;
  let color = -1;
  let interlace = 0;
  let palette = false;
  let imageEnded = false;
  let trailer = false;
  const data: Buffer[] = [];
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) invalid();
    const size = bytes.readUInt32BE(offset);
    const end = offset + 12 + size;
    if (end > bytes.length) invalid();
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    if (!/^[A-Za-z]{2}[A-Z][A-Za-z]$/.test(type)) invalid();
    if (
      crc32(bytes.subarray(offset + 4, end - 4)) !== bytes.readUInt32BE(end - 4)
    )
      invalid();
    const payload = bytes.subarray(offset + 8, end - 4);
    if (offset === 8 && type !== "IHDR") invalid();
    if (type === "IHDR") {
      if (offset !== 8 || size !== 13) invalid();
      width = payload.readUInt32BE(0);
      height = payload.readUInt32BE(4);
      depth = payload[8];
      color = payload[9];
      interlace = payload[12];
      const depths: Record<number, number[]> = {
        0: [1, 2, 4, 8, 16],
        2: [8, 16],
        3: [1, 2, 4, 8],
        4: [8, 16],
        6: [8, 16],
      };
      if (
        !width ||
        !height ||
        width > 32768 ||
        height > 32768 ||
        width * height > MAX_PIXELS ||
        !depths[color]?.includes(depth) ||
        payload[10] !== 0 ||
        payload[11] !== 0 ||
        interlace > 1
      )
        invalid();
    } else if (type === "PLTE") {
      if (
        palette ||
        data.length ||
        color === 0 ||
        color === 4 ||
        !size ||
        size % 3 ||
        size > 768 ||
        (color === 3 && size / 3 > 2 ** depth)
      )
        invalid();
      palette = true;
    } else if (type === "IDAT") {
      if (imageEnded || (color === 3 && !palette)) invalid();
      data.push(payload);
    } else if (type === "IEND") {
      if (size || !data.length || end !== bytes.length) invalid();
      trailer = true;
    } else {
      if (
        type[0] === type[0].toUpperCase() ||
        ["acTL", "fcTL", "fdAT"].includes(type)
      )
        invalid();
    }
    if (data.length && type !== "IDAT") imageEnded = true;
    offset = end;
  }
  if (!trailer) invalid();
  const channels: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
  const passes = interlace
    ? [
        [0, 0, 8, 8],
        [4, 0, 8, 8],
        [0, 4, 4, 8],
        [2, 0, 4, 4],
        [0, 2, 2, 4],
        [1, 0, 2, 2],
        [0, 1, 1, 2],
      ]
    : [[0, 0, 1, 1]];
  const rows = passes.map(([x, y, dx, dy]) => {
    const passWidth = Math.max(0, Math.ceil((width - x) / dx));
    const passHeight = Math.max(0, Math.ceil((height - y) / dy));
    return {
      count: passWidth ? passHeight : 0,
      stride: 1 + Math.ceil((passWidth * channels[color] * depth) / 8),
    };
  });
  const expected = rows.reduce((sum, row) => sum + row.count * row.stride, 0);
  if (expected > MAX_DECODED_BYTES)
    throw new PlatformError("ASSET_TOO_LARGE", 413);
  try {
    const compressed = Buffer.concat(data);
    const decoded = inflateSync(compressed, {
      maxOutputLength: expected,
      info: true,
    }) as unknown as { buffer: Buffer; engine: { bytesWritten: number } };
    if (
      decoded.buffer.length !== expected ||
      decoded.engine.bytesWritten !== compressed.length
    )
      invalid();
    let rowOffset = 0;
    for (const row of rows) {
      for (let index = 0; index < row.count; index++) {
        if (decoded.buffer[rowOffset] > 4) invalid();
        rowOffset += row.stride;
      }
    }
  } catch {
    invalid();
  }
}

function loopback(address: string): boolean {
  return (
    address === "::1" || (isIP(address) === 4 && address.startsWith("127."))
  );
}

/** Conservative global-unicast policy; transition/private/documentation ranges fail closed. */
function publicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b, c] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 &&
        (b === 168 ||
          (b === 0 && (c === 0 || c === 2)) ||
          (b === 88 && c === 99))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113)
    );
  }
  if (isIP(address) !== 6) return false;
  const [first, second] = address
    .split(":")
    .map((part) => parseInt(part || "0", 16));
  return (
    first >= 0x2000 &&
    first <= 0x3ffe &&
    first !== 0x2002 &&
    !(first === 0x2001 && (second < 0x200 || second === 0xdb8))
  );
}

async function resolveTarget(
  url: URL,
  connection: ProviderConnection,
  allowedOrigins: Set<string>,
  signal: AbortSignal,
): Promise<{ address: string; family: number }> {
  const deny = (): never => {
    throw new PlatformError("ASSET_REMOTE_FORBIDDEN", 400);
  };
  if (url.username || url.password || url.hash) deny();
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const local = connection.kind === "local_comfyui";
  if (local) {
    let registered: URL;
    try {
      registered = new URL(connection.baseUrl ?? "");
    } catch {
      deny();
    }
    if (
      registered!.origin !== url.origin ||
      !["http:", "https:"].includes(url.protocol) ||
      url.pathname !== "/view" ||
      !(hostname === "localhost" || loopback(hostname))
    )
      deny();
  } else if (url.protocol !== "https:" || !allowedOrigins.has(url.origin))
    deny();
  if (isIP(hostname)) {
    if (!(local ? loopback(hostname) : publicAddress(hostname))) deny();
    return { address: hostname, family: isIP(hostname) };
  }
  const addresses = await new Promise<
    Array<{ address: string; family: number }>
  >((resolveLookup, reject) => {
    const aborted = () =>
      reject(
        new PlatformError(
          signal.aborted ? "ASSET_CANCELLED" : "ASSET_REMOTE_FAILED",
        ),
      );
    signal.addEventListener("abort", aborted, { once: true });
    if (signal.aborted) {
      signal.removeEventListener("abort", aborted);
      aborted();
      return;
    }
    lookup(hostname, { all: true, verbatim: true })
      .then(resolveLookup, reject)
      .finally(() => signal.removeEventListener("abort", aborted));
  });
  checkCancelled(signal);
  const targets = addresses;
  if (
    !targets.length ||
    targets.some(
      (entry) =>
        !(local ? loopback(entry.address) : publicAddress(entry.address)),
    )
  )
    deny();
  return targets[0];
}

async function download(
  url: URL,
  connection: ProviderConnection,
  allowedOrigins: Set<string>,
  maxBytes: number,
  signal?: AbortSignal,
): Promise<{ bytes: Buffer; mime: string }> {
  const timedSignal = AbortSignal.any([
    ...(signal ? [signal] : []),
    AbortSignal.timeout(60_000),
  ]);
  try {
    const target = await resolveTarget(
      url,
      connection,
      allowedOrigins,
      timedSignal,
    );
    checkCancelled(signal);
    return await new Promise((resolveDownload, reject) => {
      const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(
        url,
        {
          method: "GET",
          signal: timedSignal,
          agent: false,
          // The address validated above is pinned to this socket. No second DNS
          // lookup can rebind a permitted public host to a private address.
          lookup: (_hostname, _options, callback) =>
            callback(null, target.address, target.family),
          family: target.family,
          headers: { Accept: SUPPORTED_MIME, "Accept-Encoding": "identity" },
        },
      );
      request.once("response", (response: IncomingMessage) => {
        const consume = async () => {
          const status = response.statusCode ?? 0;
          if (status >= 300 && status < 400)
            throw new PlatformError("ASSET_REMOTE_REDIRECT");
          if ([401, 403, 404, 410].includes(status))
            throw new PlatformError("ASSET_REMOTE_EXPIRED", 502);
          if (status !== 200)
            throw new PlatformError("ASSET_REMOTE_FAILED", 502);
          const mime = mimeType(response.headers["content-type"]);
          if (
            !mime ||
            (response.headers["content-encoding"] &&
              response.headers["content-encoding"] !== "identity")
          )
            invalid();
          const lengthHeader = response.headers["content-length"];
          const length =
            lengthHeader === undefined ? undefined : Number(lengthHeader);
          if (
            length !== undefined &&
            (!/^\d+$/.test(lengthHeader!) ||
              !Number.isSafeInteger(length) ||
              length <= 0)
          )
            invalid();
          if (length !== undefined && length > maxBytes)
            throw new PlatformError("ASSET_TOO_LARGE", 413);
          const chunks: Buffer[] = [];
          let size = 0;
          for await (const raw of response) {
            checkCancelled(signal);
            const bytes = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
            size += bytes.length;
            if (size > maxBytes)
              throw new PlatformError("ASSET_TOO_LARGE", 413);
            chunks.push(bytes);
          }
          if (!response.complete || (length !== undefined && length !== size))
            invalid();
          return { bytes: Buffer.concat(chunks, size), mime };
        };
        consume().then(resolveDownload, (error: unknown) => {
          response.destroy();
          reject(error);
        });
      });
      request.once("error", reject);
      request.end();
    });
  } catch (error) {
    checkCancelled(signal);
    if (error instanceof PlatformError) throw error;
    // DNS/socket errors may contain provider URLs, addresses, or signed tokens.
    throw new PlatformError("ASSET_REMOTE_FAILED", 502);
  }
}

export class PrivateAssetStore {
  private readonly root: string;
  private readonly maxBytes: number;
  private readonly allowedOrigins: Set<string>;

  constructor(
    root: string,
    options: { maxBytes?: number; allowedRemoteOrigins?: string[] } = {},
  ) {
    this.root = resolve(root);
    this.maxBytes = options.maxBytes ?? 32 * 1024 * 1024;
    if (
      !Number.isSafeInteger(this.maxBytes) ||
      this.maxBytes < 1 ||
      this.maxBytes > MAX_DECODED_BYTES
    )
      throw new PlatformError("ASSET_INVALID_LIMIT");
    this.allowedOrigins = new Set(options.allowedRemoteOrigins ?? []);
  }

  async archive(
    result: ProviderResult,
    connection: ProviderConnection,
    signal?: AbortSignal,
  ): Promise<ArchivedAsset> {
    checkCancelled(signal);
    const declaredMime = mimeType(result.mime);
    if (!!result.url === !!result.b64Json) invalid();
    let bytes: Buffer;
    if (result.b64Json) {
      if (result.b64Json.length > 4 * Math.ceil(this.maxBytes / 3))
        throw new PlatformError("ASSET_TOO_LARGE", 413);
      if (
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
          result.b64Json,
        )
      )
        invalid();
      bytes = Buffer.from(result.b64Json, "base64");
      if (bytes.toString("base64") !== result.b64Json) invalid();
    } else {
      let url: URL;
      try {
        url = new URL(result.url!);
      } catch {
        invalid();
      }
      const downloaded = await download(
        url!,
        connection,
        this.allowedOrigins,
        this.maxBytes,
        signal,
      );
      if (declaredMime && declaredMime !== downloaded.mime) invalid();
      bytes = downloaded.bytes;
    }
    if (bytes.length > this.maxBytes)
      throw new PlatformError("ASSET_TOO_LARGE", 413);
    validatePng(bytes);
    checkCancelled(signal);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const asset: ArchivedAsset = {
      assetId: `asset-${sha256}`,
      sha256,
      mime: SUPPORTED_MIME,
      size: bytes.length,
    };
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const temporary = join(this.root, `.pending-${sha256}-${randomUUID()}`);
    try {
      const file = await open(temporary, "wx", 0o600);
      try {
        await file.writeFile(bytes);
        await file.sync();
      } finally {
        await file.close();
      }
      checkCancelled(signal);
      try {
        await link(temporary, join(this.root, asset.assetId));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        await this.read(asset);
      }
    } catch (error) {
      if (error instanceof PlatformError) throw error;
      throw new PlatformError("ASSET_STORAGE_FAILED", 500);
    } finally {
      await unlink(temporary).catch(() => {});
    }
    return asset;
  }

  async read(asset: ArchivedAsset): Promise<Buffer> {
    if (
      !/^[a-f0-9]{64}$/.test(asset.sha256) ||
      asset.assetId !== `asset-${asset.sha256}` ||
      !Number.isSafeInteger(asset.size) ||
      asset.size < 1 ||
      asset.size > this.maxBytes ||
      asset.mime !== SUPPORTED_MIME
    )
      invalid();
    try {
      const file = await open(
        join(this.root, asset.assetId),
        constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
      );
      try {
        const stat = await file.stat();
        if (!stat.isFile() || stat.size !== asset.size)
          throw new PlatformError("ASSET_INTEGRITY", 500);
        const bytes = Buffer.alloc(asset.size);
        let offset = 0;
        while (offset < bytes.length) {
          const { bytesRead } = await file.read(
            bytes,
            offset,
            bytes.length - offset,
            offset,
          );
          if (!bytesRead) throw new PlatformError("ASSET_INTEGRITY", 500);
          offset += bytesRead;
        }
        if (
          (await file.stat()).size !== asset.size ||
          createHash("sha256").update(bytes).digest("hex") !== asset.sha256
        )
          throw new PlatformError("ASSET_INTEGRITY", 500);
        return bytes;
      } finally {
        await file.close();
      }
    } catch (error) {
      if (error instanceof PlatformError) throw error;
      throw new PlatformError("ASSET_UNAVAILABLE", 404);
    }
  }
}
