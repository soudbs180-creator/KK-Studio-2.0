/**
 * 音频生成选项与 OpenAI 兼容 TTS 请求（移植自 infinite-canvas
 * web/src/lib/audio-generation.ts 与 web/src/services/api/audio.ts）。
 *
 * 职责：音频节点参数（音色/格式/语速）的规范化与展示，以及通过 OpenAI 兼容
 * /audio/speech 接口发起真实 TTS 请求。不依赖 axios，浏览器与 Node 18+ 均可使用。
 *
 * 来源：https://github.com/basketikun/infinite-canvas（MIT License）
 */

export const audioVoiceOptions = [
  { value: "alloy", label: "Alloy" },
  { value: "ash", label: "Ash" },
  { value: "ballad", label: "Ballad" },
  { value: "coral", label: "Coral" },
  { value: "echo", label: "Echo" },
  { value: "fable", label: "Fable" },
  { value: "nova", label: "Nova" },
  { value: "onyx", label: "Onyx" },
  { value: "sage", label: "Sage" },
  { value: "shimmer", label: "Shimmer" },
  { value: "verse", label: "Verse" },
  { value: "marin", label: "Marin" },
  { value: "cedar", label: "Cedar" },
];

export const audioFormatOptions = [
  { value: "mp3", label: "MP3" },
  { value: "wav", label: "WAV" },
  { value: "opus", label: "Opus" },
  { value: "aac", label: "AAC" },
  { value: "flac", label: "FLAC" },
  { value: "pcm", label: "PCM" },
];

export function normalizeAudioVoiceValue(value: string) {
  return audioVoiceOptions.some((item) => item.value === value)
    ? value
    : "alloy";
}

export function normalizeAudioFormatValue(value: string) {
  return audioFormatOptions.some((item) => item.value === value)
    ? value
    : "mp3";
}

export function normalizeAudioSpeedValue(value: string) {
  const speed = Number(value);
  if (!Number.isFinite(speed)) return "1";
  return String(Math.max(0.25, Math.min(4, Number(speed.toFixed(2)))));
}

export function audioVoiceLabel(value: string) {
  const voice = normalizeAudioVoiceValue(value);
  return audioVoiceOptions.find((item) => item.value === voice)?.label || voice;
}

export function audioFormatLabel(value: string) {
  const format = normalizeAudioFormatValue(value);
  return (
    audioFormatOptions.find((item) => item.value === format)?.label || format
  );
}

export function audioSpeedLabel(value: string) {
  return `${normalizeAudioSpeedValue(value)}x`;
}

export function audioMimeType(format: string) {
  if (format === "wav") return "audio/wav";
  if (format === "opus") return "audio/opus";
  if (format === "aac") return "audio/aac";
  if (format === "flac") return "audio/flac";
  if (format === "pcm") return "audio/pcm";
  return "audio/mpeg";
}

export type AudioGenerationConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  voice?: string;
  format?: string;
  speed?: string;
  instructions?: string;
  /** 可选：本地转发代理地址，浏览器直连被 CORS 拦截时使用。 */
  localProxyUrl?: string;
};

export type AudioGenerationOptions = {
  signal?: AbortSignal;
};

/** 通过 OpenAI 兼容 /audio/speech 接口生成语音，返回音频 Blob。 */
export async function requestAudioGeneration(
  config: AudioGenerationConfig,
  prompt: string,
  options?: AudioGenerationOptions,
): Promise<Blob> {
  if (!prompt.trim()) throw new Error("请输入要朗读的文本");
  assertAudioConfig(config);
  const format = normalizeAudioFormatValue(config.format || "");
  const speed = Number(normalizeAudioSpeedValue(config.speed || ""));
  const instructions = (config.instructions || "").trim();

  const url = buildApiUrl(
    config.baseUrl,
    "/audio/speech",
    config.localProxyUrl,
  );
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      input: prompt,
      voice: normalizeAudioVoiceValue(config.voice || ""),
      response_format: format,
      speed,
      ...(instructions ? { instructions } : {}),
    }),
    signal: options?.signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      readApiErrorMessage(text) || `音频生成失败（HTTP ${response.status}）`,
    );
  }
  const blob = await response.blob();
  await assertAudioBlob(blob);
  return blob.type.startsWith("audio/")
    ? blob
    : new Blob([blob], { type: audioMimeType(format) });
}

function assertAudioConfig(config: AudioGenerationConfig) {
  if (!config.model.trim()) throw new Error("请选择音频模型");
  if (!config.baseUrl.trim()) throw new Error("请填写音频服务地址");
  if (!config.apiKey.trim()) throw new Error("请填写 API Key");
}

function buildApiUrl(baseUrl: string, path: string, localProxyUrl?: string) {
  const base = baseUrl.trim().replace(/\/+$/, "");
  const url = `${base}${path}`;
  const proxy = localProxyUrl?.trim();
  if (!proxy) return url;
  return `${proxy.replace(/\/+$/, "")}/${url}`;
}

async function assertAudioBlob(blob: Blob) {
  if (!blob.type.includes("json")) return;
  let payload: { code?: number; msg?: string; error?: { message?: string } };
  try {
    payload = JSON.parse(await blob.text()) as {
      code?: number;
      msg?: string;
      error?: { message?: string };
    };
  } catch {
    return;
  }
  if (typeof payload.code === "number" && payload.code !== 0)
    throw new Error(payload.msg || "音频生成失败");
  if (payload.error?.message) throw new Error(payload.error.message);
}

function readApiErrorMessage(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      const inner = readApiErrorMessage(parsed) || value;
      if (
        inner === value &&
        typeof parsed === "object" &&
        Object.keys(parsed).length === 0
      )
        return "";
      return inner;
    } catch {
      return value;
    }
  }
  if (typeof value !== "object") return "";
  const payload = value as {
    msg?: unknown;
    message?: unknown;
    error?: unknown;
    detail?: unknown;
  };
  const errorMsg =
    typeof payload.error === "string"
      ? payload.error
      : (payload.error as { message?: unknown })?.message;
  return (
    readApiErrorMessage(payload.msg) ||
    readApiErrorMessage(payload.message) ||
    readApiErrorMessage(errorMsg) ||
    readApiErrorMessage(payload.detail) ||
    ""
  );
}
