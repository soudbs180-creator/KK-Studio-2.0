import { createFile, MP4BoxBuffer, DataStream, Endianness } from "mp4box";
import { demuxWebm } from "./webmDemuxAdapter.ts";

export interface VideoPackets {
  config: VideoDecoderConfig;
  packets: EncodedVideoChunkInit[];
}
const invalid = () =>
  new Error("视频损坏、编码不受支持或超过10分钟/18000帧限制");
function validate(result: VideoPackets): VideoPackets {
  if (
    !result.packets.length ||
    result.packets.length > 18000 ||
    !(result.config.codedWidth && result.config.codedWidth > 0) ||
    !(result.config.codedHeight && result.config.codedHeight > 0) ||
    result.config.codedWidth * result.config.codedHeight > 4096 * 2160
  )
    throw invalid();
  if (
    result.packets.some(
      (p) =>
        !Number.isFinite(p.timestamp) || p.timestamp < 0 || p.timestamp > 600e6,
    )
  )
    throw invalid();
  return result;
}

/** Reuse container parsers; never estimate source frame timestamps from playback. */
export function demuxVideo(buffer: ArrayBuffer): VideoPackets {
  const magic = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));
  if (
    magic[0] === 0x1a &&
    magic[1] === 0x45 &&
    magic[2] === 0xdf &&
    magic[3] === 0xa3
  )
    return validate(demuxWebm(buffer));
  return demuxMp4(buffer);
}
function demuxMp4(buffer: ArrayBuffer): VideoPackets {
  const file = createFile(true),
    packets: EncodedVideoChunkInit[] = [];
  const result: { config?: VideoDecoderConfig; count?: number } = {};
  file.onError = () => {
    throw invalid();
  };
  file.onReady = (info) => {
    const track = info.videoTracks[0];
    if (
      !track?.video ||
      track.nb_samples > 18000 ||
      track.duration / track.timescale > 600
    )
      throw invalid();
    const entry = file.getTrackById(track.id).mdia.minf.stbl.stsd
      .entries[0] as unknown as Record<
      string,
      { write(stream: DataStream): void } | undefined
    >;
    const box = entry.avcC ?? entry.hvcC ?? entry.av1C ?? entry.vpcC;
    let description: ArrayBuffer | undefined;
    if (box) {
      const stream = new DataStream(undefined, 0, Endianness.BIG_ENDIAN);
      box.write(stream);
      description = stream.buffer.slice(8);
    }
    result.config = {
      codec: track.codec,
      codedWidth: track.video.width,
      codedHeight: track.video.height,
      description,
    };
    result.count = track.nb_samples;
    file.setExtractionOptions(track.id, undefined, { nbSamples: 100 });
    file.start();
  };
  file.onSamples = (_id, _user, samples) => {
    for (const sample of samples) {
      if (!sample.data || packets.length >= 18000) throw invalid();
      packets.push({
        type: sample.is_sync ? "key" : "delta",
        timestamp: Math.round((sample.cts / sample.timescale) * 1e6),
        duration: Math.round((sample.duration / sample.timescale) * 1e6),
        data: sample.data,
      });
    }
  };
  file.appendBuffer(MP4BoxBuffer.fromArrayBuffer(buffer, 0));
  file.flush();
  if (!result.config || result.count !== packets.length) throw invalid();
  return validate({ config: result.config, packets });
}
