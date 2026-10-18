/** Explicit bounded choices from each model's official 12ai page, not server defaults. */
const profiles = {
  "seedance-2.0": { duration: 4, aspect_ratio: "16:9", resolution: "720p" },
  "seedance-2.0-fast": {
    duration: 4,
    aspect_ratio: "16:9",
    resolution: "720p",
  },
  "seedance-2.5": { duration: 4, aspect_ratio: "16:9", resolution: "720p" },
  "veo-3.1-generate-preview": {
    duration: 4,
    aspect_ratio: "16:9",
    resolution: "720p",
  },
  "veo-3.1-fast-generate-preview": {
    duration: 4,
    aspect_ratio: "16:9",
    resolution: "720p",
  },
  "happy-horse-1.1": { duration: 4, aspect_ratio: "16:9", resolution: "720p" },
  "gemini-omni-1.1-flash": {
    duration: 4,
    aspect_ratio: "16:9",
    resolution: "720p",
  },
  "gemini-omni-flash-preview": {
    duration: 4,
    aspect_ratio: "16:9",
    resolution: "720p",
  },
  "MiniMax-H3": { duration: 4, aspect_ratio: "16:9", resolution: "768P" },
  "kling-3.0-turbo": { duration: 4, aspect_ratio: "16:9", resolution: "720p" },
  "sora-2": { seconds: "4", size: "1280x720" },
} as const;
export const twelveAiVideoModels = Object.keys(profiles);
export function videoModelProfile(model: string) {
  if (!Object.hasOwn(profiles, model)) return undefined;
  const defaults = profiles[model as keyof typeof profiles];
  return {
    protocol: model === "sora-2" ? ("sora" as const) : ("task" as const),
    description: `4 秒 · 16:9 · ${model === "MiniMax-H3" ? "768P" : "720p"} · 单条 · 原件最多 16 MiB`,
    body: (prompt: string) =>
      model === "sora-2"
        ? { model, prompt, ...defaults }
        : { model, input: { prompt, ...defaults } },
  };
}
