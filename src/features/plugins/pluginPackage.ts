import {
  pluginManifestSchema,
  capabilityVersionMatches,
  PLUGIN_FILE_MAX_BYTES,
  PLUGIN_MANIFEST_MAX_BYTES,
  PLUGIN_PACKAGE_MAX_BYTES,
  type PluginManifest,
} from "../../../packages/creation-contracts/index.ts";

export interface VerifiedPluginPackage {
  manifest: PluginManifest;
  files: Record<string, string>;
}

export async function verifyPluginPackage(
  raw: unknown,
  files: Record<string, string>,
  host: { version: string; platform: "web" | "desktop" | "mobile" },
): Promise<VerifiedPluginPackage> {
  if (
    new TextEncoder().encode(JSON.stringify(raw)).byteLength >
    PLUGIN_MANIFEST_MAX_BYTES
  )
    throw new Error("插件清单过大。");
  const manifest = pluginManifestSchema.parse(raw);
  if (
    !capabilityVersionMatches(host.version, manifest.engines.kk) ||
    !manifest.platforms.includes(host.platform)
  )
    throw new Error("插件不兼容当前版本或平台。");
  if (manifest.trust !== "third-party")
    throw new Error("插件来源必须由宿主证明，清单不能自称受信插件。");
  const expected = Object.keys(manifest.integrity.files);
  if (
    expected.length !== Object.keys(files).length ||
    expected.some((name) => !Object.hasOwn(files, name))
  )
    throw new Error("插件文件与完整性清单不一致。");
  let total = 0;
  for (const name of expected) {
    if (typeof files[name] !== "string")
      throw new Error("插件文件不是UTF-8文本。");
    const bytes = new TextEncoder().encode(files[name]);
    total += bytes.byteLength;
    if (
      bytes.byteLength > PLUGIN_FILE_MAX_BYTES ||
      total > PLUGIN_PACKAGE_MAX_BYTES
    )
      throw new Error("插件包超过大小上限。");
    const hash = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      (v) => v.toString(16).padStart(2, "0"),
    ).join("");
    if (hash !== manifest.integrity.files[name])
      throw new Error("插件完整性校验失败。");
  }
  return { manifest, files: { ...files } };
}

async function boundedText(response: Response, limit: number): Promise<string> {
  if (!response.ok || !response.body) throw new Error("插件文件下载失败。");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error("插件文件超过大小上限。");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
    bytes,
  );
}

export async function fetchPluginPackage(
  url: string,
  fetcher: typeof fetch,
  signal: AbortSignal,
): Promise<{ manifest: unknown; files: Record<string, string> }> {
  const base = new URL(url);
  if (
    base.protocol !== "https:" ||
    base.username ||
    base.password ||
    base.hash ||
    base.search
  )
    throw new Error("插件清单仅支持无凭据和查询参数的HTTPS地址。");
  const get = async (address: string, limit: number) =>
    boundedText(
      await fetcher(address, {
        signal,
        credentials: "omit",
        redirect: "error",
      }),
      limit,
    );
  const manifest = pluginManifestSchema.parse(
    JSON.parse(
      (await get(base.href, PLUGIN_MANIFEST_MAX_BYTES)).replace(/^\uFEFF/, ""),
    ),
  );
  const files: Record<string, string> = {};
  let total = 0;
  for (const name of Object.keys(manifest.integrity.files)) {
    signal.throwIfAborted();
    const address = new URL(name, base);
    if (
      address.origin !== base.origin ||
      !address.pathname.startsWith(new URL(".", base).pathname)
    )
      throw new Error("插件文件越过包目录。");
    files[name] = await get(address.href, PLUGIN_FILE_MAX_BYTES);
    total += new TextEncoder().encode(files[name]).byteLength;
    if (total > PLUGIN_PACKAGE_MAX_BYTES)
      throw new Error("插件包超过大小上限。");
  }
  signal.throwIfAborted();
  return { manifest, files };
}
