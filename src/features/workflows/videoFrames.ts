import {
  compareVideoFrames,
  detectVideoShots,
  type ShotBoundary,
} from "../../domain/videoShotBreakdown.ts";
export interface VideoShotReference extends ShotBoundary {
  preview: string;
}

export async function analyzeVideoSource(
  source: string,
  options: {
    signal: AbortSignal;
    threshold?: number;
    onProgress?: (seconds: number) => void;
  },
): Promise<VideoShotReference[]> {
  if (!/^(?:data:video\/(?:mp4|webm);base64,|blob:)/.test(source))
    throw new Error("拉片只读取本地视频原件");
  if (typeof VideoDecoder === "undefined")
    throw new Error("当前环境不支持逐帧解码，请更新浏览器后重试");
  const signal = AbortSignal.any([options.signal, AbortSignal.timeout(120000)]);
  signal.throwIfAborted();
  if (source.length > 140 * 1024 * 1024)
    throw new Error("请选择100MB以内的视频片段");
  const blob = await (
    await fetch(source, { signal, credentials: "omit" })
  ).blob();
  if (blob.size > 100 * 1024 * 1024)
    throw new Error("请选择100MB以内的视频片段");
  const { demuxVideo } = await import("./videoDemuxAdapter.ts");
  const { config, packets } = demuxVideo(await blob.arrayBuffer());
  signal.throwIfAborted();
  if (!(await VideoDecoder.isConfigSupported(config)).supported)
    throw new Error("当前浏览器不支持该视频编码");
  const sample = document.createElement("canvas");
  sample.width = 64;
  sample.height = 36;
  const ctx = sample.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("当前环境无法读取视频像素");
  const thumbnail = document.createElement("canvas"),
    shots: VideoShotReference[] = [];
  let previous: Uint8ClampedArray | undefined,
    decoded = 0,
    lastTimestamp = -1,
    failure: unknown,
    wake: (() => void) | undefined;
  const decoder = new VideoDecoder({
    error: (error) => {
      failure = error;
      wake?.();
    },
    output: (frame) => {
      try {
        signal.throwIfAborted();
        if (frame.timestamp < lastTimestamp)
          throw new Error("视频帧顺序异常，未展开切镜");
        lastTimestamp = frame.timestamp;
        ctx.drawImage(frame, 0, 0, sample.width, sample.height);
        const pixels = ctx.getImageData(0, 0, sample.width, sample.height).data;
        const diff = previous
          ? compareVideoFrames(previous, pixels)
          : { rgbDiff: 0, histDiff: 0 };
        const boundary = detectVideoShots([diff], options.threshold ?? 0.45)[0];
        if (!previous || boundary.isCut) {
          if (shots.length >= 128)
            throw new Error("切镜超过128个，请缩短片段后重试");
          const scale = Math.min(
            1,
            1280 / Math.max(frame.displayWidth, frame.displayHeight),
          );
          thumbnail.width = Math.max(1, Math.round(frame.displayWidth * scale));
          thumbnail.height = Math.max(
            1,
            Math.round(frame.displayHeight * scale),
          );
          const output = thumbnail.getContext("2d");
          if (!output) throw new Error("无法提取视频参考帧");
          output.drawImage(frame, 0, 0, thumbnail.width, thumbnail.height);
          shots.push({
            ...boundary,
            frameIndex: decoded,
            timestampSeconds: frame.timestamp / 1e6,
            preview: thumbnail.toDataURL("image/jpeg", 0.9),
          });
        }
        previous = pixels;
        decoded++;
        options.onProgress?.(frame.timestamp / 1e6);
      } catch (error) {
        failure = error;
        wake?.();
      } finally {
        frame.close();
      }
    },
  });
  const abort = () => {
    failure = signal.reason;
    wake?.();
    if (decoder.state !== "closed") decoder.close();
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    decoder.configure(config);
    for (const packet of packets) {
      signal.throwIfAborted();
      if (failure) throw failure;
      decoder.decode(new EncodedVideoChunk(packet));
      while (decoder.decodeQueueSize > 8 && !failure)
        await new Promise<void>((resolve) => {
          const done = () => {
            decoder.removeEventListener("dequeue", done);
            wake = undefined;
            resolve();
          };
          wake = done;
          decoder.addEventListener("dequeue", done, { once: true });
          if (failure || decoder.decodeQueueSize <= 8) done();
        });
    }
    if (failure) throw failure;
    await decoder.flush();
    signal.throwIfAborted();
    if (failure) throw failure;
    if (!decoded || decoded !== packets.length)
      throw new Error("视频未完整解码，请检查编码或缩短片段后重试");
    return shots;
  } finally {
    signal.removeEventListener("abort", abort);
    if (decoder.state !== "closed") decoder.close();
  }
}
