import type { LocalHardwareReport } from "../../domain/localModelRecommendations.ts";
import { detectLocalHardware } from "./localHardware.ts";

export type HardwareCapabilityTier = "ultra" | "standard" | "lite" | "cpu-only";

export interface TaskIntent {
  type: "chat" | "storyboard" | "image" | "upscale" | "outpaint";
  qualityPreference?: "speed" | "balanced" | "quality";
  contextTokensNeeded?: number;
}

export interface AdaptiveSchedulingResult {
  tier: HardwareCapabilityTier;
  executionTarget: "local-gpu" | "local-cpu" | "cloud-gateway" | "external-bridge";
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

  if (bestDedicatedVramBytes >= 20 * GiB) {
    return {
      tier: "ultra",
      bestDedicatedVramBytes,
      bestFreeVramBytes,
      usableRamBytes,
      availableRamBytes,
      hasCuda,
    };
  }

  if (bestDedicatedVramBytes >= 8 * GiB) {
    return {
      tier: "standard",
      bestDedicatedVramBytes,
      bestFreeVramBytes,
      usableRamBytes,
      availableRamBytes,
      hasCuda,
    };
  }

  return {
    tier: "lite",
    bestDedicatedVramBytes,
    bestFreeVramBytes,
    usableRamBytes,
    availableRamBytes,
    hasCuda,
  };
}

export function evaluateVramWatermarkRisk(
  freeBytes: number,
  dedicatedBytes: number
): "low" | "medium" | "critical" {
  if (dedicatedBytes <= 0) return "critical";
  const ratio = freeBytes / dedicatedBytes;
  if (ratio < 0.15 || freeBytes < 1.5 * GiB) return "critical";
  if (ratio < 0.35 || freeBytes < 3.5 * GiB) return "medium";
  return "low";
}

export function scheduleAdaptiveExecution(
  intent: TaskIntent,
  report: LocalHardwareReport,
  hasExternalBridge: (tool: "topaz" | "photoshop") => boolean = () => false
): AdaptiveSchedulingResult {
  const hw = evaluateHardwareTier(report);
  const watermarkRisk = evaluateVramWatermarkRisk(
    hw.bestFreeVramBytes,
    hw.bestDedicatedVramBytes
  );

  // 1. External specialized software bridge routing (Topaz / PS)
  if (intent.type === "upscale" && hasExternalBridge("topaz")) {
    return {
      tier: hw.tier,
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
      tier: hw.tier,
      executionTarget: "external-bridge",
      recommendedModelId: "adobe-photoshop-uxp",
      modelName: "Adobe Photoshop Generative Expand (External Bridge)",
      vramWatermarkRisk: watermarkRisk,
      autoOffloadToCpu: false,
      summary: "检测到本机 Adobe Photoshop，自动路由至专业扩图通道。",
    };
  }

  // 2. Critical VRAM pressure fallback: prevent OOM crash
  if (watermarkRisk === "critical" && hw.tier !== "cpu-only") {
    // If RAM is plenty, offload to CPU, else route to cloud gateway
    if (hw.availableRamBytes >= 12 * GiB) {
      return {
        tier: hw.tier,
        executionTarget: "local-cpu",
        recommendedModelId: "qwen2.5-7b-instruct-q4_k_m-cpu",
        modelName: "Qwen 2.5 7B Instruct (CPU Offload Fallback)",
        quantizationRecommended: "q4_k_m",
        vramWatermarkRisk: "critical",
        autoOffloadToCpu: true,
        fallbackReason: "显存空闲不足 15%，触发防 OOM 保护，平滑切换至内存/CPU 推理。",
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

  // 3. Normal Tier Routing
  switch (hw.tier) {
    case "ultra": {
      // 24GB+ VRAM: 32B/72B or FP16 models
      if (intent.type === "image") {
        return {
          tier: "ultra",
          executionTarget: "local-gpu",
          recommendedModelId: "flux1-dev-fp16",
          modelName: "FLUX.1 [dev] FP16",
          quantizationRecommended: "fp16",
          vramBudgetBytes: 18 * GiB,
          vramWatermarkRisk: watermarkRisk,
          autoOffloadToCpu: false,
          summary: "检测到 24GB+ 旗舰显存，匹配最高画质 FLUX.1 [dev] 顶配方案。",
        };
      }
      return {
        tier: "ultra",
        executionTarget: "local-gpu",
        recommendedModelId: "qwen2.5-32b-instruct-q8_0",
        modelName: "Qwen 2.5 32B Instruct (Q8_0 High-Precision)",
        quantizationRecommended: "q8_0",
        vramBudgetBytes: 22 * GiB,
        vramWatermarkRisk: watermarkRisk,
        autoOffloadToCpu: false,
        summary: "检测到旗舰硬件，匹配 32B Q8 高精度大模型，释放完整逻辑理解能力。",
      };
    }

    case "standard": {
      // 8-16GB VRAM: 14B Q4_K_M or SDXL Turbo
      if (intent.type === "image") {
        return {
          tier: "standard",
          executionTarget: "local-gpu",
          recommendedModelId: "sdxl-turbo-q8",
          modelName: "SDXL Turbo (8-bit Quantized)",
          quantizationRecommended: "q8_0",
          vramBudgetBytes: 7 * GiB,
          vramWatermarkRisk: watermarkRisk,
          autoOffloadToCpu: false,
          summary: "检测到 8-16GB 主流显存，匹配 SDXL Turbo 高速平衡方案。",
        };
      }
      return {
        tier: "standard",
        executionTarget: "local-gpu",
        recommendedModelId: "qwen2.5-14b-instruct-q4_k_m",
        modelName: "Qwen 2.5 14B Instruct (Q4_K_M)",
        quantizationRecommended: "q4_k_m",
        vramBudgetBytes: 9 * GiB,
        vramWatermarkRisk: watermarkRisk,
        autoOffloadToCpu: false,
        summary: "主流硬件配置，匹配 14B Q4_K_M 黄金均衡模型，兼顾速度与智力。",
      };
    }

    case "lite": {
      // < 8GB VRAM: 7B Q4_K_M or Cloud Gateway for image
      if (intent.type === "image" || intent.type === "upscale") {
        return {
          tier: "lite",
          executionTarget: "cloud-gateway",
          recommendedModelId: "cloud-imagen-3-fast",
          modelName: "Cloud Imagen 3 Fast Gateway",
          vramWatermarkRisk: watermarkRisk,
          autoOffloadToCpu: false,
          fallbackReason: "本机显存不足以支撑本地高清图像扩散，自动启用云端生图。",
          summary: "轻量显卡，图像生成自动路由至云端，秒级交付高质量结果。",
        };
      }
      return {
        tier: "lite",
        executionTarget: "local-gpu",
        recommendedModelId: "qwen2.5-7b-instruct-q4_k_m",
        modelName: "Qwen 2.5 7B Instruct (Q4_K_M)",
        quantizationRecommended: "q4_k_m",
        vramBudgetBytes: 4.5 * GiB,
        vramWatermarkRisk: watermarkRisk,
        autoOffloadToCpu: false,
        summary: "轻量配置，匹配 7B Q4_K_M 极致敏捷模型，低显存零卡顿运行。",
      };
    }

    case "cpu-only":
    default: {
      // No GPU or Web fallback
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
  hasExternalBridge?: (tool: "topaz" | "photoshop") => boolean
): Promise<AdaptiveSchedulingResult> {
  const report = await detectLocalHardware();
  return scheduleAdaptiveExecution(intent, report, hasExternalBridge);
}
