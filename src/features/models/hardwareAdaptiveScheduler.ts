import {
  localChatModelPackages,
  localVideoModelPackages,
} from "../../domain/localModelPackages.ts";
import type { LocalHardwareReport } from "../../domain/localModelRecommendations.ts";
import { detectLocalHardware } from "./localHardware.ts";

export type HardwareCapabilityTier = "ultra" | "standard" | "lite" | "cpu-only";

export interface TaskIntent {
  type: "chat" | "storyboard" | "image" | "video" | "upscale" | "outpaint";
  qualityPreference?: "speed" | "balanced" | "quality";
  contextTokensNeeded?: number;
}

export interface AdaptiveSchedulingResult {
  tier: HardwareCapabilityTier;
  executionTarget:
    "local-gpu" | "local-cpu" | "cloud-gateway" | "external-bridge";
  recommendedModelId: string;
  modelName: string;
  quantizationRecommended?: "q4_k_m" | "q8_0" | "fp16";
  vramBudgetBytes?: number;
  vramWatermarkRisk: "low" | "medium" | "critical";
  autoOffloadToCpu: boolean;
  fallbackReason?: string;
  summary: string;
}

const GiB = 1024 ** 3;

const ULTRA_CHAT_PACKAGE =
  localChatModelPackages.find((pkg) => pkg.id === "qwen3.8-27b-ud-q4-k-m") ??
  localChatModelPackages[2]!;
const STANDARD_CHAT_PACKAGE =
  localChatModelPackages.find((pkg) => pkg.id === "qwen3.5-9b-q4-k-m") ??
  localChatModelPackages[0]!;
const LITE_CHAT_PACKAGE =
  localChatModelPackages.find((pkg) => pkg.id === "qwen3.5-4b-q4-k-m") ??
  localChatModelPackages[1]!;
const DEFAULT_VIDEO_PACKAGE =
  localVideoModelPackages.find((pkg) => pkg.defaultMode) ??
  localVideoModelPackages[0]!;

export function evaluateHardwareTier(report: LocalHardwareReport): {
  tier: HardwareCapabilityTier;
  bestDedicatedVramBytes: number;
  bestFreeVramBytes: number;
  usableRamBytes: number;
  availableRamBytes: number;
  hasCuda: boolean;
} {
  const usableRamBytes = report.memory?.usableBytes ?? 0;
  const availableRamBytes = report.memory?.availableBytes ?? 0;

  let bestDedicatedVramBytes = 0;
  let bestFreeVramBytes = 0;
  let hasCuda = false;

  for (const gpu of report.gpus) {
    const dedicated = gpu.dedicatedBytes ?? 0;
    const free = gpu.freeBytes ?? 0;
    if (dedicated > bestDedicatedVramBytes) {
      bestDedicatedVramBytes = dedicated;
    }
    if (free > bestFreeVramBytes) {
      bestFreeVramBytes = free;
    }
    if (gpu.computeBackend === "cuda-reported") {
      hasCuda = true;
    }
  }

  if (!hasCuda || bestDedicatedVramBytes === 0) {
    return {
      tier: "cpu-only",
      bestDedicatedVramBytes,
      bestFreeVramBytes,
      usableRamBytes,
      availableRamBytes,
      hasCuda,
    };
  }

  const tier: HardwareCapabilityTier =
    bestDedicatedVramBytes >= 20 * GiB
      ? "ultra"
      : bestDedicatedVramBytes >= 8 * GiB
        ? "standard"
        : "lite";

  return {
    tier,
    bestDedicatedVramBytes,
    bestFreeVramBytes,
    usableRamBytes,
    availableRamBytes,
    hasCuda,
  };
}

export function evaluateVramWatermarkRisk(
  freeBytes: number,
  dedicatedBytes: number,
): "low" | "medium" | "critical" {
  if (dedicatedBytes <= 0) return "critical";
  const ratio = freeBytes / dedicatedBytes;
  if (ratio < 0.15 || freeBytes < 1.5 * GiB) return "critical";
  if (ratio < 0.35 || freeBytes < 3.5 * GiB) return "medium";
  return "low";
}

function resolveExternalBridgeRoute(
  intent: TaskIntent,
  tier: HardwareCapabilityTier,
  watermarkRisk: "low" | "medium" | "critical",
  hasExternalBridge: (tool: "topaz" | "photoshop") => boolean,
): AdaptiveSchedulingResult | null {
  if (intent.type === "upscale" && hasExternalBridge("topaz")) {
    return {
      tier,
      executionTarget: "external-bridge",
      recommendedModelId: "topaz-gigapixel-ai",
      modelName: "Topaz Gigapixel AI (External Pro Bridge)",
      vramWatermarkRisk: watermarkRisk,
      autoOffloadToCpu: false,
      summary: "检测到本机 Topaz Gigapixel，自动路由至外部专业高清放大通道。",
    };
  }
  if (intent.type === "outpaint" && hasExternalBridge("photoshop")) {
    return {
      tier,
      executionTarget: "external-bridge",
      recommendedModelId: "adobe-photoshop-uxp",
      modelName: "Adobe Photoshop Generative Expand (External Bridge)",
      vramWatermarkRisk: watermarkRisk,
      autoOffloadToCpu: false,
      summary: "检测到本机 Adobe Photoshop，自动路由至专业扩图通道。",
    };
  }
  return null;
}

function resolveCriticalVramFallback(
  hw: ReturnType<typeof evaluateHardwareTier>,
): AdaptiveSchedulingResult {
  if (hw.availableRamBytes >= 12 * GiB) {
    return {
      tier: hw.tier,
      executionTarget: "local-cpu",
      recommendedModelId: LITE_CHAT_PACKAGE.id,
      modelName: `${LITE_CHAT_PACKAGE.name} (CPU Offload Fallback)`,
      quantizationRecommended: "q4_k_m",
      vramWatermarkRisk: "critical",
      autoOffloadToCpu: true,
      fallbackReason:
        "显存空闲不足 15%，触发防 OOM 保护，平滑切换至内存/CPU 推理。",
      summary: "显存紧张，自适应转为 CPU 降级推理，保障宿主进程稳定不崩溃。",
    };
  }
  return {
    tier: hw.tier,
    executionTarget: "cloud-gateway",
    recommendedModelId: "cloud-gemini-flash",
    modelName: "Cloud Gemini 2.5 Flash Gateway",
    vramWatermarkRisk: "critical",
    autoOffloadToCpu: false,
    fallbackReason: "本机显存与可用内存均处于极高水位，平滑转移至云端网关。",
    summary: "系统硬件资源高压，无感切换至云端网关完成任务。",
  };
}

function resolveVideoRoute(
  hw: ReturnType<typeof evaluateHardwareTier>,
  watermarkRisk: "low" | "medium" | "critical",
): AdaptiveSchedulingResult {
  if (
    hw.bestDedicatedVramBytes >= DEFAULT_VIDEO_PACKAGE.declaredMinVramBytes &&
    hw.usableRamBytes >= DEFAULT_VIDEO_PACKAGE.declaredMinRamBytes
  ) {
    return {
      tier: hw.tier,
      executionTarget: "local-gpu",
      recommendedModelId: DEFAULT_VIDEO_PACKAGE.id,
      modelName: DEFAULT_VIDEO_PACKAGE.name,
      quantizationRecommended: "fp16",
      vramBudgetBytes: DEFAULT_VIDEO_PACKAGE.declaredMinVramBytes,
      vramWatermarkRisk: watermarkRisk,
      autoOffloadToCpu: false,
      summary: "本机显存与内存满足本地视频工作流要求，匹配 MiniMax H3 方案。",
    };
  }
  return {
    tier: hw.tier,
    executionTarget: "cloud-gateway",
    recommendedModelId: "cloud-video-gateway",
    modelName: "Cloud Video Generation Gateway",
    vramWatermarkRisk: watermarkRisk,
    autoOffloadToCpu: false,
    fallbackReason: "本机显存或系统内存低于本地视频模型最低要求，自动转云端。",
    summary: "本地硬件未达视频生成门槛，路由至云端视频通道。",
  };
}

export function scheduleAdaptiveExecution(
  intent: TaskIntent,
  report: LocalHardwareReport,
  hasExternalBridge: (tool: "topaz" | "photoshop") => boolean = () => false,
): AdaptiveSchedulingResult {
  const hw = evaluateHardwareTier(report);
  const watermarkRisk = evaluateVramWatermarkRisk(
    hw.bestFreeVramBytes,
    hw.bestDedicatedVramBytes,
  );

  const bridgeRoute = resolveExternalBridgeRoute(
    intent,
    hw.tier,
    watermarkRisk,
    hasExternalBridge,
  );
  if (bridgeRoute) return bridgeRoute;

  if (watermarkRisk === "critical" && hw.tier !== "cpu-only") {
    return resolveCriticalVramFallback(hw);
  }

  if (intent.type === "video") {
    return resolveVideoRoute(hw, watermarkRisk);
  }

  switch (hw.tier) {
    case "ultra": {
      if (intent.type === "image") {
        return {
          tier: "ultra",
          executionTarget: "local-gpu",
          recommendedModelId: "qwen-image-2.1-turbo",
          modelName: "Qwen-Image-2.1-Turbo (Local GPU)",
          quantizationRecommended: "fp16",
          vramBudgetBytes: 18 * GiB,
          vramWatermarkRisk: watermarkRisk,
          autoOffloadToCpu: false,
          summary:
            "检测到 20GB+ 旗舰显存，匹配本地 Qwen-Image-2.1-Turbo 高画质方案。",
        };
      }
      return {
        tier: "ultra",
        executionTarget: "local-gpu",
        recommendedModelId: ULTRA_CHAT_PACKAGE.id,
        modelName: ULTRA_CHAT_PACKAGE.name,
        quantizationRecommended: "q4_k_m",
        vramBudgetBytes:
          ULTRA_CHAT_PACKAGE.mainBytes + ULTRA_CHAT_PACKAGE.visionBytes + GiB,
        vramWatermarkRisk: watermarkRisk,
        autoOffloadToCpu: false,
        summary:
          "检测到旗舰硬件，匹配 27B 本地多模态大模型，释放完整逻辑理解能力。",
      };
    }

    case "standard": {
      if (intent.type === "image") {
        return {
          tier: "standard",
          executionTarget: "cloud-gateway",
          recommendedModelId: "cloud-imagen-3-fast",
          modelName: "Cloud Imagen 3 Fast Gateway",
          vramWatermarkRisk: watermarkRisk,
          autoOffloadToCpu: false,
          fallbackReason:
            "主流显存优先保障本地多模态推理，高清图像扩散交由云端网关。",
          summary: "检测到 8-20GB 主流显存，图像任务由云端高速通道承接。",
        };
      }
      return {
        tier: "standard",
        executionTarget: "local-gpu",
        recommendedModelId: STANDARD_CHAT_PACKAGE.id,
        modelName: STANDARD_CHAT_PACKAGE.name,
        quantizationRecommended: "q4_k_m",
        vramBudgetBytes:
          STANDARD_CHAT_PACKAGE.mainBytes +
          STANDARD_CHAT_PACKAGE.visionBytes +
          GiB,
        vramWatermarkRisk: watermarkRisk,
        autoOffloadToCpu: false,
        summary: "主流硬件配置，匹配 9B Q4_K_M 黄金均衡模型，兼顾速度与智力。",
      };
    }

    case "lite": {
      if (intent.type === "image" || intent.type === "upscale") {
        return {
          tier: "lite",
          executionTarget: "cloud-gateway",
          recommendedModelId: "cloud-imagen-3-fast",
          modelName: "Cloud Imagen 3 Fast Gateway",
          vramWatermarkRisk: watermarkRisk,
          autoOffloadToCpu: false,
          fallbackReason:
            "本机显存不足以支撑本地高清图像扩散，自动启用云端生图。",
          summary: "轻量显卡，图像生成自动路由至云端，秒级交付高质量结果。",
        };
      }
      return {
        tier: "lite",
        executionTarget: "local-gpu",
        recommendedModelId: LITE_CHAT_PACKAGE.id,
        modelName: LITE_CHAT_PACKAGE.name,
        quantizationRecommended: "q4_k_m",
        vramBudgetBytes:
          LITE_CHAT_PACKAGE.mainBytes + LITE_CHAT_PACKAGE.visionBytes + GiB,
        vramWatermarkRisk: watermarkRisk,
        autoOffloadToCpu: false,
        summary: "轻量配置，匹配 4B Q4_K_M 极致敏捷模型，低显存零卡顿运行。",
      };
    }

    case "cpu-only":
    default: {
      return {
        tier: "cpu-only",
        executionTarget: "cloud-gateway",
        recommendedModelId: "cloud-gemini-flash",
        modelName: "Cloud Gemini 2.5 Flash Gateway",
        vramWatermarkRisk: "critical",
        autoOffloadToCpu: false,
        fallbackReason: "未检测到可用独立 CUDA 显卡，自动接入云端全能大模型。",
        summary: "无独显环境，由云端超级 AGI 节点全权承接算力。",
      };
    }
  }
}

export async function resolveOptimalModel(
  intent: TaskIntent,
  hasExternalBridge?: (tool: "topaz" | "photoshop") => boolean,
): Promise<AdaptiveSchedulingResult> {
  const report = await detectLocalHardware();
  return scheduleAdaptiveExecution(intent, report, hasExternalBridge);
}
