export const DEFAULT_COMFY_ENDPOINT = "http://127.0.0.1:8188";
export function normalizeComfyEndpoint(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== "http:" ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("请输入本机 ComfyUI 地址，例如 http://127.0.0.1:8188");
  if (url.hostname === "localhost") url.hostname = "127.0.0.1";
  return url.origin;
}
