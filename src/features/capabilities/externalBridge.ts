/**
 * 外部专业软件（Blender / Photoshop / GIMP / Audacity）零感知无头跨进程桥接器
 *
 * 架构职责：
 * 1. 自动探测宿主系统已安装的外部专业创作软件（通过注入的探测函数，严禁在浏览器共享层直接调用 fs）。
 * 2. 提供三层调用降级策略（均需注入真实执行器，严禁未执行即返回 ok: true 的假通过）：
 *    - 优先级 1：MCP 服务端通道（需 mcpAvailable 且提供 mcpExecutor）
 *    - 优先级 2：Headless CLI 后台静默批处理（需可执行文件存在且提供 cliRunner / simulatedCliRunner）
 *    - 优先级 3：内置神经引擎兜底（需提供 neuralFallbackExecutor；未提供时诚实返回 ok: false）
 */

export type ExternalSoftwareType =
  "blender" | "photoshop" | "gimp" | "audacity";

export type ExternalActionType =
  | "render_3d_scene"
  | "export_gltf"
  | "smart_cutout"
  | "layer_composite"
  | "color_grade"
  | "audio_denoise"
  | "audio_mastering";

export interface SoftwareInstallationProfile {
  software: ExternalSoftwareType;
  installed: boolean;
  executablePath?: string;
  mcpAvailable: boolean;
  headlessCliSupported: boolean;
}

export interface ExternalActionRequest {
  action: ExternalActionType;
  targetSoftware: ExternalSoftwareType;
  inputAssetPath: string;
  outputAssetPath?: string;
  parameters?: Record<string, unknown>;
}

export interface ExternalActionResult {
  ok: boolean;
  channelUsed: "mcp" | "cli-sidecar" | "neural-fallback";
  softwareUsed: ExternalSoftwareType | "neural-engine";
  outputAssetPath?: string;
  commandArgs?: string[];
  durationMs: number;
  diagnosticMessage: string;
  error?: string;
}

export interface ExternalBridgeExecutorResult {
  ok: boolean;
  outputPath?: string;
  error?: string;
}

export interface ExternalBridgeProbeOptions {
  /** 自定义路径存在性检测函数（默认在渲染层返回 false，由主进程/测试注入） */
  pathExists?: (candidatePath: string) => boolean;
  /** 注入某软件的 MCP 可用状态 */
  mcpAvailabilityMap?: Partial<Record<ExternalSoftwareType, boolean>>;
  /** 注入真实 MCP 通道执行器 */
  mcpExecutor?: (
    request: ExternalActionRequest,
  ) => Promise<ExternalBridgeExecutorResult>;
  /** 注入真实 CLI 侧车执行器 */
  cliRunner?: (
    executablePath: string,
    args: string[],
  ) => Promise<ExternalBridgeExecutorResult>;
  /** 兼容旧测试注入的 CLI 执行器别名 */
  simulatedCliRunner?: (
    executablePath: string,
    args: string[],
  ) => Promise<ExternalBridgeExecutorResult>;
  /** 注入内置神经引擎回退执行器 */
  neuralFallbackExecutor?: (
    request: ExternalActionRequest,
  ) => Promise<ExternalBridgeExecutorResult>;
}

/** 常见平台默认安装路径候选表 */
const DEFAULT_CANDIDATE_PATHS: Record<ExternalSoftwareType, string[]> = {
  blender: [
    "C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe",
    "C:\\Program Files\\Blender Foundation\\Blender 4.1\\blender.exe",
    "C:\\Program Files\\Blender Foundation\\Blender 4.0\\blender.exe",
    "/Applications/Blender.app/Contents/MacOS/Blender",
    "/usr/bin/blender",
  ],
  photoshop: [
    "C:\\Program Files\\Adobe\\Adobe Photoshop 2025\\Photoshop.exe",
    "C:\\Program Files\\Adobe\\Adobe Photoshop 2024\\Photoshop.exe",
    "/Applications/Adobe Photoshop 2024/Adobe Photoshop 2024.app/Contents/MacOS/Adobe Photoshop 2024",
  ],
  gimp: [
    "C:\\Program Files\\GIMP 2\\bin\\gimp-console-2.10.exe",
    "/Applications/GIMP.app/Contents/MacOS/gimp-console",
    "/usr/bin/gimp-console",
  ],
  audacity: [
    "C:\\Program Files\\Audacity\\Audacity.exe",
    "/Applications/Audacity.app/Contents/MacOS/Audacity",
    "/usr/bin/audacity",
  ],
};

function safePathExists(
  checkFn: (candidatePath: string) => boolean,
  candidate: string,
): boolean {
  try {
    return checkFn(candidate);
  } catch (err) {
    return Boolean(err) && false;
  }
}

export class UniversalExternalAppBridge {
  /**
   * 探测指定外部专业软件的安装状态与可用通道
   */
  public detectSoftware(
    software: ExternalSoftwareType,
    options: ExternalBridgeProbeOptions = {},
  ): SoftwareInstallationProfile {
    const checkFn = options.pathExists ?? (() => false);
    const candidates = DEFAULT_CANDIDATE_PATHS[software] ?? [];
    const foundPath = candidates.find((candidate) =>
      safePathExists(checkFn, candidate),
    );
    const mcpAvailable = Boolean(options.mcpAvailabilityMap?.[software]);

    return {
      software,
      installed: Boolean(foundPath),
      executablePath: foundPath,
      mcpAvailable,
      headlessCliSupported:
        software === "blender" ||
        software === "gimp" ||
        software === "photoshop",
    };
  }

  /**
   * 构造无头 CLI 命令行参数（不弹窗、后台批处理）
   */
  public buildHeadlessCliArgs(request: ExternalActionRequest): string[] {
    const outPath =
      request.outputAssetPath ?? `${request.inputAssetPath}.processed.png`;

    switch (request.targetSoftware) {
      case "blender":
        return [
          "-b",
          request.inputAssetPath,
          "--python-expr",
          `import bpy; bpy.context.scene.render.filepath = ${JSON.stringify(outPath)}; bpy.ops.render.render(write_still=True)`,
        ];
      case "gimp":
        return [
          "-i",
          "-b",
          `(gimp-file-load RUN-NONINTERACTIVE "${request.inputAssetPath}" "${request.inputAssetPath}")`,
          "-b",
          "(gimp-quit 0)",
        ];
      case "photoshop":
        return ["-r", request.inputAssetPath];
      case "audacity":
        return [request.inputAssetPath];
    }
  }

  private async tryMcpChannel(
    request: ExternalActionRequest,
    profile: SoftwareInstallationProfile,
    options: ExternalBridgeProbeOptions,
    startMs: number,
  ): Promise<ExternalActionResult | null> {
    if (!profile.mcpAvailable) return null;
    if (!options.mcpExecutor) {
      return {
        ok: false,
        channelUsed: "mcp",
        softwareUsed: request.targetSoftware,
        durationMs: Date.now() - startMs,
        diagnosticMessage: `[MCP 通道未就绪] 检测到 ${request.targetSoftware} MCP 可用，但未注入真实 MCP 执行器 (mcpExecutor)，已拒绝伪造输出`,
        error: "MCP_EXECUTOR_NOT_CONFIGURED",
      };
    }
    const mcpResult = await options.mcpExecutor(request);
    if (mcpResult.ok) {
      return {
        ok: true,
        channelUsed: "mcp",
        softwareUsed: request.targetSoftware,
        outputAssetPath: mcpResult.outputPath ?? request.outputAssetPath,
        durationMs: Date.now() - startMs,
        diagnosticMessage: `[MCP 通道] 已通过 ${request.targetSoftware} MCP 服务端完成 ${request.action} 操作`,
      };
    }
    if (profile.installed || options.neuralFallbackExecutor) return null;
    const errText = mcpResult.error ?? "MCP_EXECUTION_FAILED";
    return {
      ok: false,
      channelUsed: "mcp",
      softwareUsed: request.targetSoftware,
      durationMs: Date.now() - startMs,
      diagnosticMessage: `[MCP 通道执行失败] ${errText}`,
      error: errText,
    };
  }

  private async tryCliChannel(
    request: ExternalActionRequest,
    profile: SoftwareInstallationProfile,
    options: ExternalBridgeProbeOptions,
    startMs: number,
  ): Promise<ExternalActionResult | null> {
    if (!profile.installed || !profile.executablePath) return null;
    const cliArgs = this.buildHeadlessCliArgs(request);
    const cliExecutor = options.cliRunner ?? options.simulatedCliRunner;
    if (!cliExecutor) {
      if (options.neuralFallbackExecutor) return null;
      return {
        ok: false,
        channelUsed: "cli-sidecar",
        softwareUsed: request.targetSoftware,
        commandArgs: cliArgs,
        durationMs: Date.now() - startMs,
        diagnosticMessage: `[Headless CLI 未就绪] 检测到 ${request.targetSoftware} 可执行文件，但未注入真实 CLI 侧车执行器 (cliRunner)，已拒绝伪造输出`,
        error: "CLI_RUNNER_NOT_CONFIGURED",
      };
    }
    const cliResult = await cliExecutor(profile.executablePath, cliArgs);
    if (cliResult.ok) {
      return {
        ok: true,
        channelUsed: "cli-sidecar",
        softwareUsed: request.targetSoftware,
        outputAssetPath: cliResult.outputPath ?? request.outputAssetPath,
        commandArgs: cliArgs,
        durationMs: Date.now() - startMs,
        diagnosticMessage: `[Headless CLI] 已后台静默调用 ${request.targetSoftware} 完成 ${request.action}`,
      };
    }
    if (options.neuralFallbackExecutor) return null;
    const errText = cliResult.error ?? "CLI_EXECUTION_FAILED";
    return {
      ok: false,
      channelUsed: "cli-sidecar",
      softwareUsed: request.targetSoftware,
      commandArgs: cliArgs,
      durationMs: Date.now() - startMs,
      diagnosticMessage: `[Headless CLI 失败] ${errText}`,
      error: errText,
    };
  }

  /**
   * 统一执行动作：优先 MCP -> 其次 Headless CLI -> 最后内置神经引擎回退。
   * 严禁在未注入真实执行器时返回伪造成功路径（RULE-NO-FAKE-PASS）。
   */
  public async executeAction(
    request: ExternalActionRequest,
    options: ExternalBridgeProbeOptions = {},
  ): Promise<ExternalActionResult> {
    const startMs = Date.now();
    const profile = this.detectSoftware(request.targetSoftware, options);

    const mcpOutcome = await this.tryMcpChannel(
      request,
      profile,
      options,
      startMs,
    );
    if (mcpOutcome) return mcpOutcome;

    const cliOutcome = await this.tryCliChannel(
      request,
      profile,
      options,
      startMs,
    );
    if (cliOutcome) return cliOutcome;

    if (options.neuralFallbackExecutor) {
      const fallbackResult = await options.neuralFallbackExecutor(request);
      const errText = fallbackResult.error ?? "NEURAL_FALLBACK_FAILED";
      return {
        ok: fallbackResult.ok,
        channelUsed: "neural-fallback",
        softwareUsed: "neural-engine",
        outputAssetPath: fallbackResult.outputPath ?? request.outputAssetPath,
        durationMs: Date.now() - startMs,
        diagnosticMessage: fallbackResult.ok
          ? `[神经引擎兜底] 未检测到可用的 ${request.targetSoftware} 通道，已由内置神经算子完成 ${request.action}`
          : `[神经引擎兜底失败] ${errText}`,
        error: fallbackResult.ok ? undefined : errText,
      };
    }

    return {
      ok: false,
      channelUsed: "neural-fallback",
      softwareUsed: "neural-engine",
      durationMs: Date.now() - startMs,
      diagnosticMessage: `[外部桥接未就绪] 未检测到可用的 ${request.targetSoftware} MCP/CLI 执行器，且未配置 neuralFallbackExecutor，严禁伪造成功结果`,
      error: "EXTERNAL_BRIDGE_EXECUTOR_UNAVAILABLE",
    };
  }
}
