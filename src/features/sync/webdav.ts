/**
 * WebDAV 同步服务（移植自 infinite-canvas web/src/services/webdav-sync.ts）。
 *
 * 职责：把项目清单（manifest.json）上传/下载到用户自己的 WebDAV 网盘，实现多端同步。
 * 不依赖 i18n / 配置 store；可选传入 localProxyUrl（配合 vendor/canvas-proxy 绕过 CORS）。
 *
 * 来源：https://github.com/basketikun/infinite-canvas（MIT License）
 */

export type WebdavSyncConfig = {
  url: string;
  directory: string;
  username: string;
  password: string;
  /** 可选：本地转发代理地址，例如 http://127.0.0.1:23210，用于浏览器直连被 CORS 拦截时。 */
  localProxyUrl?: string;
};

export const WEBDAV_MANIFEST_FILE_NAME = "manifest.json";
const WEBDAV_REQUEST_TIMEOUT_MS = 120000;
const ensuredDirectories = new Set<string>();

export async function testWebdavConnection(config: WebdavSyncConfig) {
  await ensureWebdavDirectory(config);
  const response = await webdavFetch(config, "", {
    method: "PROPFIND",
    headers: { Depth: "0" },
  });
  if (response.ok || response.status === 207) return;
  await throwWebdavError(response, "WebDAV 连接测试失败");
}

export async function downloadWebdavSyncFile(config: WebdavSyncConfig) {
  return downloadWebdavFile(config, WEBDAV_MANIFEST_FILE_NAME);
}

export async function downloadWebdavFile(
  config: WebdavSyncConfig,
  path: string,
): Promise<Blob | null> {
  await ensureWebdavDirectory(config);
  const response = await webdavFetch(config, path, { method: "GET" });
  if (response.status === 404) return null;
  if (!response.ok) await throwWebdavError(response, "下载失败");
  const file = await withTimeout(response.blob(), "下载超时");
  return file.size ? file : null;
}

export async function uploadWebdavSyncFile(
  config: WebdavSyncConfig,
  file: Blob,
) {
  return uploadWebdavFile(
    config,
    WEBDAV_MANIFEST_FILE_NAME,
    file,
    "application/json",
  );
}

export async function uploadWebdavFile(
  config: WebdavSyncConfig,
  path: string,
  file: Blob,
  contentType = "application/octet-stream",
) {
  if (!file.size) throw new Error("不能上传空文件");
  await ensureWebdavDirectory(config);
  await ensureWebdavSubdirectory(config, path);
  const response = await webdavFetch(config, path, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!response.ok) await throwWebdavError(response, "上传失败");
}

async function ensureWebdavDirectory(config: WebdavSyncConfig) {
  assertWebdavConfig(config);
  await ensureWebdavDirectoryPath(config, config.directory);
}

async function ensureWebdavSubdirectory(
  config: WebdavSyncConfig,
  path: string,
) {
  const directory = normalizePath(path).split("/").slice(0, -1).join("/");
  if (!directory) return;
  await ensureWebdavDirectoryPath(
    config,
    [config.directory, directory].filter(Boolean).join("/"),
  );
}

async function ensureWebdavDirectoryPath(
  config: WebdavSyncConfig,
  directory: string,
) {
  const parts = normalizePath(directory).split("/").filter(Boolean);
  const cacheKey = `${config.url}:${parts.join("/")}`;
  if (ensuredDirectories.has(cacheKey)) return;
  let path = "";
  for (const part of parts) {
    path = path ? `${path}/${part}` : part;
    const response = await webdavFetch({ ...config, directory: "" }, path, {
      method: "MKCOL",
    });
    if (
      response.ok ||
      ((response.status === 405 || response.status === 423) &&
        (await webdavDirectoryExists(config, path)))
    )
      continue;
    await throwWebdavError(response, "创建目录失败");
  }
  ensuredDirectories.add(cacheKey);
}

async function webdavDirectoryExists(config: WebdavSyncConfig, path: string) {
  const response = await webdavFetch({ ...config, directory: "" }, path, {
    method: "PROPFIND",
    headers: { Depth: "0" },
  });
  return response.ok || response.status === 207;
}

async function webdavFetch(
  config: WebdavSyncConfig,
  path: string,
  init: RequestInit,
) {
  const headers = new Headers(init.headers);
  if (config.username || config.password)
    headers.set(
      "Authorization",
      `Basic ${encodeBasicAuth(`${config.username}:${config.password}`)}`,
    );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEBDAV_REQUEST_TIMEOUT_MS);
  try {
    const url = withLocalProxy(buildWebdavUrl(config, path), config);
    return await fetch(url, { ...init, headers, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError")
      throw new Error("请求超时", { cause: error });
    if (error instanceof TypeError)
      throw new Error("无法连接 WebDAV 服务器", { cause: error });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** 可选：把请求地址改写为经本地转发代理访问（代理按 `代理地址 + 完整目标地址` 转发）。 */
function withLocalProxy(url: string, config: WebdavSyncConfig) {
  const proxy = config.localProxyUrl?.trim();
  if (!proxy) return url;
  return `${proxy.replace(/\/+$/, "")}/${url}`;
}

function buildWebdavUrl(config: WebdavSyncConfig, path: string) {
  const baseUrl = config.url.trim().replace(/\/+$/, "");
  const remotePath = [normalizePath(config.directory), normalizePath(path)]
    .filter(Boolean)
    .join("/");
  if (!remotePath) return baseUrl;
  return `${baseUrl}/${remotePath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

function normalizePath(path: string) {
  return path.trim().replace(/^\/+|\/+$/g, "");
}

function assertWebdavConfig(config: WebdavSyncConfig) {
  if (!config.url.trim()) throw new Error("请填写 WebDAV 服务器地址");
}

async function throwWebdavError(
  response: Response,
  fallback: string,
): Promise<never> {
  const detail = await response.text().catch(() => "");
  if (response.status === 401 || response.status === 403)
    throw new Error("WebDAV 认证失败，请检查用户名与密码");
  if (response.status === 404) throw new Error("WebDAV 目录不存在");
  throw new Error(
    `${fallback}（HTTP ${response.status}${detail ? ` ${detail.slice(0, 120)}` : ""}）`,
  );
}

function encodeBasicAuth(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function withTimeout<T>(promise: Promise<T>, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(message)),
      WEBDAV_REQUEST_TIMEOUT_MS,
    );
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}
