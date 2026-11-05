import EBML from "ts-ebml/dist/EBML.js";
import type { VideoPackets } from "./videoDemuxAdapter.ts";

/** Container structure and lacing are decoded by ts-ebml (MIT). */
export function demuxWebm(buffer: ArrayBuffer): VideoPackets {
  const decoder = new EBML.Decoder(),
    packets: EncodedVideoChunkInit[] = [];
  let track: Record<string, unknown> = {},
    video: Record<string, unknown> | undefined;
  let scale = 1e6,
    cluster = 0,
    blockGroup: { data?: Uint8Array; reference: boolean } | undefined;
  const append = (data: Uint8Array, key?: boolean) => {
    const block = EBML.tools.readBlock(
      data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength,
      ) as ArrayBuffer,
    );
    if (!video || block.trackNumber !== video.TrackNumber) return;
    const duration = Number(video.DefaultDuration ?? 0) / 1000;
    if (block.frames.length > 1 && !duration)
      throw new Error("视频连帧缺少时长，无法逐帧定位");
    block.frames.forEach((frame, i) =>
      packets.push({
        type: (key ?? block.keyframe) ? "key" : "delta",
        timestamp: Math.round(
          ((cluster + block.timecode) * scale) / 1000 + i * duration,
        ),
        ...(duration ? { duration } : {}),
        data: new Uint8Array(frame),
      }),
    );
    if (packets.length > 18000) throw new Error("视频超过18000帧");
  };
  for (const element of decoder.decode(buffer)) {
    if (element.type === "m") {
      if (element.name === "TrackEntry") {
        if (!element.isEnd) track = {};
        else if (track.TrackType === 1 && !video) video = { ...track };
      }
      if (element.name === "BlockGroup") {
        if (!element.isEnd) blockGroup = { reference: false };
        else {
          if (blockGroup?.data) append(blockGroup.data, !blockGroup.reference);
          blockGroup = undefined;
        }
      }
      continue;
    }
    if (
      [
        "TrackNumber",
        "TrackType",
        "CodecID",
        "PixelWidth",
        "PixelHeight",
        "DefaultDuration",
      ].includes(element.name)
    )
      track[element.name] = element.value;
    if (["TimecodeScale", "TimestampScale"].includes(element.name))
      scale = Number(element.value);
    if (["Timecode", "Timestamp"].includes(element.name))
      cluster = Number(element.value);
    if (element.name === "SimpleBlock") append(element.data);
    if (element.name === "Block" && blockGroup) blockGroup.data = element.data;
    if (element.name === "ReferenceBlock" && blockGroup)
      blockGroup.reference = true;
  }
  return { config: webmVideoConfig(video, scale), packets };
}

function webmVideoConfig(
  video: Record<string, unknown> | undefined,
  scale: number,
): VideoDecoderConfig {
  const codecs: Record<string, string> = {
    V_VP8: "vp8",
    V_VP9: "vp09.00.10.08",
    V_AV1: "av01.0.04M.08",
  };
  const codec = codecs[String(video?.CodecID)];
  if (!codec || !Number.isFinite(scale) || scale <= 0)
    throw new Error("WebM视频编码或时间轴不受支持");
  return {
    codec,
    codedWidth: Number(video?.PixelWidth),
    codedHeight: Number(video?.PixelHeight),
  };
}
