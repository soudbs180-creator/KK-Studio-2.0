export type LocalModelArtifact = {
  path: string;
  bytes: number;
  sha256: string;
  role: "model" | "projector" | "text-encoder" | "video-vae" | "audio-vae";
};

function chatPackage(entry: {
  id: string;
  name: string;
  repository: string;
  revision: string;
  filename: string;
  mainBytes: number;
  visionBytes: number;
  mainSha256: string;
  visionSha256: string;
  contextTokens: number;
  estimatedRamBytes: number;
}) {
  return {
    ...entry,
    maintainer: "Unsloth",
    license: "Apache-2.0",
    engine: "llama.cpp",
    sourceUrl: `https://huggingface.co/${entry.repository}/tree/${entry.revision}`,
    artifactBaseUrl: `https://huggingface.co/${entry.repository}/resolve/${entry.revision}`,
    artifacts: [
      {
        path: entry.filename,
        bytes: entry.mainBytes,
        sha256: entry.mainSha256,
        role: "model",
      },
      {
        path: "mmproj-F16.gguf",
        bytes: entry.visionBytes,
        sha256: entry.visionSha256,
        role: "projector",
      },
    ] satisfies LocalModelArtifact[],
  };
}

// Sizes and digests are pinned publisher metadata, not locally verified model files.
export const localChatModelPackages = [
  chatPackage({
    id: "qwen3.5-9b-q4-k-m",
    name: "Qwen3.5-9B Q4_K_M",
    repository: "unsloth/Qwen3.5-9B-GGUF",
    revision: "3885219b6810b007914f3a7950a8d1b469d598a5",
    filename: "Qwen3.5-9B-Q4_K_M.gguf",
    mainBytes: 5_680_522_464,
    visionBytes: 918_166_080,
    mainSha256:
      "03b74727a860a56338e042c4420bb3f04b2fec5734175f4cb9fa853daf52b7e8",
    visionSha256:
      "f70dc3509053962b0d0d3ee8a7eacebf5d60aa560cad78254ae8698516ae029f",
    contextTokens: 8192,
    estimatedRamBytes: 8 * 1024 ** 3,
  }),
  chatPackage({
    id: "qwen3.5-4b-q4-k-m",
    name: "Qwen3.5-4B Q4_K_M",
    repository: "unsloth/Qwen3.5-4B-GGUF",
    revision: "e87f176479d0855a907a41277aca2f8ee7a09523",
    filename: "Qwen3.5-4B-Q4_K_M.gguf",
    mainBytes: 2_740_937_888,
    visionBytes: 672_423_616,
    mainSha256:
      "00fe7986ff5f6b463e62455821146049db6f9313603938a70800d1fb69ef11a4",
    visionSha256:
      "cd88edcf8d031894960bb0c9c5b9b7e1fea6ebee02b9f7ce925a00d12891f864",
    contextTokens: 4096,
    estimatedRamBytes: 6 * 1024 ** 3,
  }),
  chatPackage({
    id: "qwen3.8-27b-ud-q4-k-m",
    name: "Qwen3.8-27B UD-Q4_K_M",
    repository: "unsloth/Qwen3.8-27B-GGUF",
    revision: "4ca720788d1e01f1bff70c033e0d0028fd02e502",
    filename: "Qwen3.8-27B-UD-Q4_K_M.gguf",
    mainBytes: 16_464_440_224,
    visionBytes: 927_607_488,
    mainSha256:
      "322e194ff79741c7baa497c240f677f54b201b0efab44ca8e50f122b39123482",
    visionSha256:
      "cbb841a9ee0636b2ec172f5bb8df2ea8dfeb01e90fe7c6126581d662a0b4e43e",
    contextTokens: 4096,
    estimatedRamBytes: 21 * 1024 ** 3,
  }),
] as const;

const h3Source = "https://modelscope.cn/models/l1ngzi/MiniMax-H3-16G-HiFi";
const h3Revision = "190e955f54f0b3ffc68929bc5bcf75ad825201af";
const h3SharedArtifacts: LocalModelArtifact[] = [
  {
    path: "text_encoders/qwen3vl_text_encoder.safetensors",
    bytes: 30_552_489_265,
    sha256: "1227805d3cbc93dfa94f59e003e294bd3b7ab2ea7ac283a8e64b54c6b736374f",
    role: "text-encoder",
  },
  {
    path: "vae/minimax_h3_video_vae_fp16.safetensors",
    bytes: 5_207_808_496,
    sha256: "7c1f131492e7eddacaac9069a61b81bdd39de5cc96561e677c5eab1cdce5e522",
    role: "video-vae",
  },
  {
    path: "vae/minimax_h3_audio_vae_fp32.safetensors",
    bytes: 605_254_808,
    sha256: "8e505d95dd1561d47abd43d4238fd40d9bb1ae9e147ed0a4cba778d76ae4db48",
    role: "audio-vae",
  },
];

function h3Package(mode: "fl2va" | "ref2va", artifact: LocalModelArtifact) {
  return {
    id: `minimax-h3-16g-hifi-${mode}`,
    name: `MiniMax H3 16G HiFi ${mode === "fl2va" ? "文生／首尾帧视频" : "参考视频"}`,
    maintainer: "l1ngzi (community)",
    revision: h3Revision,
    sourceUrl: h3Source,
    artifactBaseUrl: `${h3Source}/resolve/${h3Revision}`,
    license: "MiniMax H3 Community License（原模型）；派生包声明待核对",
    licenseReview: "required",
    engine: "comfyui",
    mode,
    defaultMode: mode === "fl2va",
    // Author guidance uses advertised GB classes; this is not a measured runtime minimum.
    declaredMinVramBytes: 16_000_000_000,
    declaredMinRamBytes: 32_000_000_000,
    artifacts: [artifact, ...h3SharedArtifacts],
    workflowFormat: "comfy-ui-graph",
    workflowConversionRequired: true,
    accelerationAcceptance: "unverified",
    runtimeAcceptance: "unverified",
  } as const;
}

export const localVideoModelPackages = [
  h3Package("fl2va", {
    path: "diffusion_models/minimax_h3_fl2va_dit_16g.safetensors",
    bytes: 28_364_846_456,
    sha256: "9b5a64b30140183fe886c3dd7dd3a6ed1513fb6d04187ee8af43c21a16ece1b6",
    role: "model",
  }),
  h3Package("ref2va", {
    path: "diffusion_models/minimax_h3_ref2va_dit_16g.safetensors",
    bytes: 28_403_358_856,
    sha256: "ccc424d726086612fc6d5ac0464ccc4d8ff528f944c4c24c287c45862fadab41",
    role: "model",
  }),
] as const;

/** Weight files only; engines, nodes and workflows require their own validated installation. */
export function planLocalModelDownloads(packageIds: readonly string[]) {
  const catalog = [...localChatModelPackages, ...localVideoModelPackages];
  const selected = [...new Set(packageIds)].map((id) => {
    const entry = catalog.find((candidate) => candidate.id === id);
    if (!entry) throw new Error("未知本地模型包");
    return entry;
  });
  const artifacts = new Map<
    string,
    LocalModelArtifact & { sourceUrl: string }
  >();
  for (const entry of selected) {
    for (const artifact of entry.artifacts) {
      artifacts.set(artifact.sha256, {
        ...artifact,
        sourceUrl: `${entry.artifactBaseUrl}/${artifact.path.split("/").map(encodeURIComponent).join("/")}`,
      });
    }
  }
  const files = [...artifacts.values()];
  return {
    files,
    downloadBytes: files.reduce((sum, file) => sum + file.bytes, 0),
  };
}
