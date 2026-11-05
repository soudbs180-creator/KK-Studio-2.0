const MAX_MEDIA_BYTES = 100 * 1024 * 1024;
const outputHosts = new Set(["cdn.12ai.org", "api.12ai.org", "img.12ai.org"]);

export function assertMediaDownloadUrl(value: string): void {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    !outputHosts.has(url.hostname) ||
    url.port ||
    url.username ||
    url.password ||
    url.hash
  )
    throw new Error("媒体结果地址不在受支持的 HTTPS CDN 范围内。");
}

export async function readMediaResponse(
  response: Response,
  kind: "video" | "audio",
  signal?: AbortSignal,
  format?: "mp3" | "wav",
  maxBytes = MAX_MEDIA_BYTES,
): Promise<Blob> {
  let mime = (response.headers.get("Content-Type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (["audio/x-wav", "audio/wave"].includes(mime)) mime = "audio/wav";
  const valid =
    kind === "video"
      ? ["video/mp4", "video/webm"].includes(mime)
      : mime === (format === "wav" ? "audio/wav" : "audio/mpeg");
  if (
    !response.ok ||
    !valid ||
    Number(response.headers.get("Content-Length")) > maxBytes
  ) {
    await response.body?.cancel();
    throw new Error("媒体原件下载失败、超出大小限制或 MIME/输出格式不匹配。");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("媒体原件为空。");
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let total = 0;
  const abort = () => {
    void reader.cancel();
  };
  signal?.addEventListener("abort", abort, { once: true });
  try {
    for (;;) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new Error("媒体原件超过大小限制。");
      chunks.push(new Uint8Array(value));
    }
  } finally {
    signal?.removeEventListener("abort", abort);
    await reader.cancel().catch(() => {});
  }
  const blob = new Blob(chunks, { type: mime });
  const head = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
  const signature = mediaSignature(mime, head);
  if (!total || !signature) throw new Error("媒体原件格式签名与 MIME 不匹配。");
  signal?.throwIfAborted();
  return blob;
}

export async function mediaBlobDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let start = 0; start < bytes.length; start += 32768)
    binary += String.fromCharCode(...bytes.subarray(start, start + 32768));
  return `data:${blob.type};base64,${btoa(binary)}`;
}

function mediaSignature(mime: string, head: Uint8Array): boolean {
  const ascii = new TextDecoder().decode(head);
  return mime === "video/mp4"
    ? head.length >= 12 && ascii.slice(4, 8) === "ftyp"
    : mime === "video/webm"
      ? head[0] === 0x1a &&
        head[1] === 0x45 &&
        head[2] === 0xdf &&
        head[3] === 0xa3
      : mime === "audio/wav"
        ? ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WAVE"
        : ascii.startsWith("ID3") ||
          (head[0] === 0xff && [0xfb, 0xf3, 0xf2].includes(head[1]));
}
